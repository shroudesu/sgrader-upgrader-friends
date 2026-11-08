#!/usr/bin/env python3
"""Build a compact RUB snapshot from Skinport, preserving manual catalog prices."""

from __future__ import annotations

import gzip
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from decimal import Decimal, InvalidOperation
from pathlib import Path

import brotli


ROOT = Path(__file__).resolve().parents[1]
SKINPORT_ITEMS_URL = "https://api.skinport.com/v1/items"
SKINPORT_SALES_URL = "https://api.skinport.com/v1/sales/history"
OUTPUT = ROOT / "market-prices.json"
OUTPUT_GZIP = ROOT / "market-prices.json.gz"
EXCLUSIONS_FILE = ROOT / "catalog-exclusions.json"
CATALOG_FILES = (
    "skins_variants.json",
    "stickers.json",
    "agents.json",
    "graffiti.json",
    "music_kits.json",
)
WEAR_SUFFIX = re.compile(r"\s+\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$", re.I)


def normalize_name(value: object) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", str(value or "")).strip()).casefold()


def excluded_market_names() -> set[str]:
    if not EXCLUSIONS_FILE.is_file():
        return set()
    config = json.loads(EXCLUSIONS_FILE.read_text(encoding="utf-8"))
    return {normalize_name(name) for name in config.get("market_hash_names", []) if normalize_name(name)}


def read_catalog_file(name: str) -> list[dict]:
    compressed = ROOT / f"{name}.gz"
    plain = ROOT / name
    if compressed.is_file():
        with gzip.open(compressed, "rt", encoding="utf-8") as source:
            return json.load(source)
    if plain.is_file():
        return json.loads(plain.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"Missing catalog file: {name}")


def row_market_name(item: dict) -> str:
    return str(item.get("market_hash_name") or item.get("marketHashName") or item.get("name") or "").strip()


def catalog_names(excluded: set[str]) -> dict[str, set[str]]:
    names: dict[str, set[str]] = {}
    for filename in CATALOG_FILES:
        for item in read_catalog_file(filename):
            name = row_market_name(item)
            key = normalize_name(name)
            if key and key not in excluded:
                names.setdefault(key, set()).add(name)
    return names


def standard_skin_names(excluded: set[str]) -> dict[str, set[str]]:
    """Only normal weapon/knife/glove variants are auto-priced. Other types stay as-is."""
    names: dict[str, set[str]] = {}
    for item in read_catalog_file("skins_variants.json"):
        name = row_market_name(item)
        key = normalize_name(name)
        if not key or key in excluded or item.get("souvenir") is True or key.startswith("souvenir "):
            continue
        names.setdefault(key, set()).add(name)
    return names


def fetch_json(url: str) -> object:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "Accept-Encoding": "br",
            "User-Agent": "SGRADER-UP-price-snapshot/2.0",
        },
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        if response.status != 200:
            raise RuntimeError(f"Skinport returned HTTP {response.status}")
        body = response.read()
        if response.headers.get("Content-Encoding", "").lower() == "br":
            body = brotli.decompress(body)
    return json.loads(body.decode("utf-8"))


def fetch_skinport_feed(endpoint: str) -> list[dict]:
    params = {"app_id": 730, "currency": "RUB"}
    if endpoint == SKINPORT_ITEMS_URL:
        params["tradable"] = 1
    query = urllib.parse.urlencode(params)
    payload = fetch_json(f"{endpoint}?{query}")
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if isinstance(payload, dict):
        rows = payload.get("items") or payload.get("data") or payload.get("sales")
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]
    raise RuntimeError("Skinport response has no item list")


def parse_price(value: object) -> Decimal | None:
    try:
        price = Decimal(str(value).replace("\u00a0", "").replace(" ", "").replace(",", "."))
    except (InvalidOperation, ValueError):
        return None
    if not price.is_finite() or price <= 0:
        return None
    return price.quantize(Decimal("0.01"))


def market_name_candidates(row: dict) -> list[str]:
    name = row_market_name(row)
    if not name:
        return []
    version = str(row.get("version") or "").strip()
    if not version:
        return [name]

    candidates = [name]
    candidates.extend((f"{name} - {version}", f"{name} ({version})"))
    wear_match = WEAR_SUFFIX.search(name)
    if wear_match:
        base = name[:wear_match.start()].rstrip()
        wear = wear_match.group(0).strip()
        candidates.extend((
            f"{base} ({version}) {wear}",
            f"{base} {wear} - {version}",
            f"{base} - {version} {wear}",
        ))
    # Preserve order while removing duplicate spellings.
    return list(dict.fromkeys(candidates))


def sale_stats_by_name(rows: list[dict], auto_names: dict[str, set[str]]) -> dict[str, dict]:
    result: dict[str, dict] = {}
    for row in rows:
        for candidate in market_name_candidates(row):
            key = normalize_name(candidate)
            if key in auto_names:
                result[key] = row
    return result


def extract_skinport_prices(
    item_rows: list[dict],
    sales_rows: list[dict],
    auto_names: dict[str, set[str]],
) -> dict[str, dict]:
    sales = sale_stats_by_name(sales_rows, auto_names)
    result: dict[str, dict] = {}
    for row in item_rows:
        quantity = max(0, int(row.get("quantity") or 0))
        if quantity <= 0:
            continue

        item_keys = [normalize_name(candidate) for candidate in market_name_candidates(row)]
        matched_keys = [key for key in item_keys if key in auto_names]
        if not matched_keys:
            continue

        for key in matched_keys:
            stats = sales.get(key, {})
            last_30 = stats.get("last_30_days") or {}
            sold_30_days = max(0, int(last_30.get("volume") or last_30.get("sales") or 0))
            sold_median = parse_price(last_30.get("median"))
            listing_median = parse_price(row.get("median_price"))
            listing_min = parse_price(row.get("min_price"))

            # Prefer a transaction median when enough recent sales exist.
            # For rarer items, require several live listings and use the listing median.
            if sold_30_days >= 3 and sold_median is not None:
                price = sold_median
                source = "skinport_sales_30d"
            elif quantity >= 3 and listing_median is not None:
                price = listing_median
                source = "skinport_listings_median"
            elif quantity >= 5 and listing_min is not None:
                price = listing_min
                source = "skinport_listing_min"
            else:
                continue

            previous = result.get(key)
            if previous is None or price < Decimal(previous["price"]):
                result[key] = {"price": format(price, ".2f"), "source": source}
    return result


def existing_rows() -> dict[str, dict]:
    if not OUTPUT.is_file():
        return {}
    try:
        previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        return {
            normalize_name(item.get("market_hash_name")): item
            for item in previous.get("items", [])
            if item.get("market_hash_name") and parse_price(item.get("price")) is not None
        }
    except (OSError, json.JSONDecodeError, AttributeError, TypeError):
        return {}


def current_items() -> dict:
    excluded = excluded_market_names()
    all_names = catalog_names(excluded)
    auto_names = standard_skin_names(excluded)
    if not all_names or not auto_names:
        raise RuntimeError("Catalog is missing market names for Skinport pricing")

    item_rows = fetch_skinport_feed(SKINPORT_ITEMS_URL)
    sales_rows = fetch_skinport_feed(SKINPORT_SALES_URL)
    live_prices = extract_skinport_prices(item_rows, sales_rows, auto_names)
    if not live_prices:
        raise RuntimeError("No liquid Skinport prices matched standard skin variants")

    previous = existing_rows()
    result: dict[str, dict] = {}
    for key, names in all_names.items():
        live = live_prices.get(key)
        old = previous.get(key, {})
        for name in names:
            if live:
                result[name] = {
                    "market_hash_name": name,
                    "price": live["price"],
                    "source": live["source"],
                }
            elif old:
                # Keep sticker, souvenir, graffiti and other manually maintained prices unchanged.
                result[name] = {
                    "market_hash_name": name,
                    "price": format(parse_price(old["price"]), ".2f"),
                    "source": old.get("source") or "preserved_previous",
                }

    # Existing checked overrides remain authoritative over the automatic feed.
    override_file = ROOT / "market-price-overrides.json"
    if override_file.is_file():
        overrides = json.loads(override_file.read_text(encoding="utf-8"))
        if str(overrides.get("currency", "")).upper() != "RUB":
            raise RuntimeError("market-price-overrides.json must use RUB")
        for row in overrides.get("items", []):
            name = str(row.get("market_hash_name") or "").strip()
            key = normalize_name(name)
            price = parse_price(row.get("price"))
            if not key or key in excluded or price is None:
                continue
            for existing_name in list(result):
                if normalize_name(existing_name) == key:
                    del result[existing_name]
            result[name] = {
                "market_hash_name": name,
                "price": format(price, ".2f"),
                "source": "manual_static",
            }

    now = int(time.time())
    return {
        "success": True,
        "source": "Skinport",
        "currency": "RUB",
        "time": now,
        "pricingMethod": "30-day median sales or median live listings with stock checks",
        "automaticTypes": ["standard skins; souvenirs and other item categories remain unchanged"],
        "items": sorted(result.values(), key=lambda item: item["market_hash_name"].casefold()),
    }


def write_snapshot(snapshot: dict) -> None:
    payload = (json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    OUTPUT.write_bytes(payload)
    OUTPUT_GZIP.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))


def main() -> int:
    snapshot = current_items()
    old_rows = existing_rows()
    old = {key: str(row["price"]) for key, row in old_rows.items()}
    new = {
        normalize_name(item["market_hash_name"]): str(item["price"])
        for item in snapshot["items"]
    }
    if old == new and OUTPUT_GZIP.is_file():
        print(f"Skinport unchanged: {len(new)} catalog prices; keeping prior snapshot timestamp")
        return 0

    write_snapshot(snapshot)
    updated = sum(1 for row in snapshot["items"] if str(row.get("source", "")).startswith("skinport_"))
    print(f"Updated Skinport snapshot: {updated} liquid standard skin variants; RUB; {len(new)} prices preserved")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # Keep failed runs from replacing a valid snapshot.
        print(f"Skinport snapshot update failed: {error}", file=sys.stderr)
        raise SystemExit(1)
