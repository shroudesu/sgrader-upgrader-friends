#!/usr/bin/env python3
"""Build a compact, same-origin snapshot of current Market.CSGO RUB offers."""

from __future__ import annotations

import gzip
import json
import re
import sys
import time
import unicodedata
import urllib.request
from decimal import Decimal, InvalidOperation
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FEED_URL = "https://market.csgo.com/api/v2/prices/RUB.json"
OUTPUT = ROOT / "market-prices.json"
OUTPUT_GZIP = ROOT / "market-prices.json.gz"
CATALOG_FILES = (
    "skins_variants.json",
    "stickers.json",
    "agents.json",
    "graffiti.json",
    "music_kits.json",
)


def normalize_name(value: object) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", str(value or "")).strip()).casefold()


def read_catalog_file(name: str) -> list[dict]:
    compressed = ROOT / f"{name}.gz"
    plain = ROOT / name
    if compressed.is_file():
        with gzip.open(compressed, "rt", encoding="utf-8") as source:
            return json.load(source)
    if plain.is_file():
        return json.loads(plain.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"Missing catalog file: {name}")


def catalog_names() -> dict[str, set[str]]:
    names: dict[str, set[str]] = {}
    for filename in CATALOG_FILES:
        for item in read_catalog_file(filename):
            market_name = item.get("market_hash_name") or item.get("marketHashName") or item.get("name")
            key = normalize_name(market_name)
            if key:
                names.setdefault(key, set()).add(str(market_name))
    return names


def fetch_market_feed() -> dict:
    request = urllib.request.Request(
        FEED_URL,
        headers={"Accept": "application/json", "User-Agent": "SGRADER-UP-price-snapshot/1.0"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        if response.status != 200:
            raise RuntimeError(f"Market.CSGO returned HTTP {response.status}")
        payload = json.load(response)
    if payload.get("success") is False:
        raise RuntimeError("Market.CSGO reported an unsuccessful price response")
    return payload


def parse_price(value: object) -> Decimal | None:
    try:
        price = Decimal(str(value).replace(" ", "").replace(",", "."))
    except (InvalidOperation, ValueError):
        return None
    if not price.is_finite() or price <= 0:
        return None
    return price.quantize(Decimal("0.01"))


def extract_rows(payload: dict) -> list[dict]:
    items = payload.get("items")
    if isinstance(items, dict):
        return list(items.values())
    if isinstance(items, list):
        return items
    data = payload.get("data")
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        return data["items"]
    raise RuntimeError("Market.CSGO response has no item list")


def current_items() -> dict[str, dict]:
    catalog = catalog_names()
    if not catalog:
        raise RuntimeError("Catalogs contain no market names")

    payload = fetch_market_feed()
    prices: dict[str, Decimal] = {}
    for row in extract_rows(payload):
        market_name = row.get("market_hash_name") or row.get("marketHashName") or row.get("hash_name") or row.get("name")
        key = normalize_name(market_name)
        price = parse_price(row.get("price", row.get("lowest_price")))
        if not key or key not in catalog or price is None:
            continue
        previous = prices.get(key)
        if previous is None or price < previous:
            prices[key] = price

    if not prices:
        raise RuntimeError("No Market.CSGO price names matched the CS2 catalog")

    result: dict[str, dict] = {}
    for key, price in prices.items():
        for name in catalog[key]:
            result[name] = {"market_hash_name": name, "price": format(price, ".2f")}
    timestamp = payload.get("time") or int(time.time())
    return {
        "success": True,
        "source": "Market.CSGO",
        "currency": "RUB",
        "time": int(timestamp),
        "items": sorted(result.values(), key=lambda item: item["market_hash_name"].casefold()),
    }


def existing_items() -> dict[str, str]:
    if not OUTPUT.is_file():
        return {}
    try:
        previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        return {
            normalize_name(item.get("market_hash_name")): str(item.get("price"))
            for item in previous.get("items", [])
            if item.get("market_hash_name") and item.get("price") is not None
        }
    except (OSError, json.JSONDecodeError, AttributeError, TypeError):
        return {}


def write_snapshot(snapshot: dict) -> None:
    payload = (json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    OUTPUT.write_bytes(payload)
    OUTPUT_GZIP.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))


def main() -> int:
    snapshot = current_items()
    old = existing_items()
    new = {
        normalize_name(item["market_hash_name"]): item["price"]
        for item in snapshot["items"]
    }
    if old == new and OUTPUT_GZIP.is_file():
        print(f"Market.CSGO unchanged: {len(new)} catalog variants; keeping prior snapshot timestamp")
        return 0

    write_snapshot(snapshot)
    print(f"Updated Market.CSGO snapshot: {len(new)} of {len(catalog_names())} catalog variants; RUB")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # Keep failed runs from replacing a valid snapshot.
        print(f"Market.CSGO snapshot update failed: {error}", file=sys.stderr)
        raise SystemExit(1)
