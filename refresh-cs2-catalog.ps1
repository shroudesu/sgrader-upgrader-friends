$ErrorActionPreference = 'Stop'

$projectRoot = if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'index.html')) {
  $PSScriptRoot
} else {
  Split-Path -Parent $PSScriptRoot
}
$upstreamRoot = 'https://raw.githubusercontent.com/CS2Cap/CS2-API/main/output/en'
$fileMap = @(
  @{ file = 'skins.json'; type = 'skin'; category = $null },
  @{ file = 'stickers.json'; type = 'stickers'; category = 'Stickers' },
  @{ file = 'agents.json'; type = 'agents'; category = 'Agents' },
  @{ file = 'graffiti.json'; type = 'graffiti'; category = 'Graffiti' },
  @{ file = 'music_kits.json'; type = 'music_kits'; category = 'Music Kits' }
)

$script:CollectionReleaseDateById = @{}

function Get-CompactCatalogEntry($item, $entry, $releaseItem = $item) {
  $itemId = [string]$item.id
  if ([string]::IsNullOrWhiteSpace($itemId)) {
    throw "The upstream entry in $($entry.file) has no stable id."
  }

  $category = $entry.category
  if ($entry.type -eq 'skin') {
    $category = [string]$item.category.name
  }

  $releaseDates = @()
  $collectionNames = @()
  foreach ($collection in @($releaseItem.collections)) {
    $collectionId = [string]$collection.id
    if ($collection.name) { $collectionNames += [string]$collection.name }
    if ($collectionId -and $script:CollectionReleaseDateById.ContainsKey($collectionId)) {
      $releaseDates += $script:CollectionReleaseDateById[$collectionId]
    }
  }
  $releaseDate = $null
  $releaseYear = $null
  if ($releaseDates.Count -gt 0) {
    $releaseDate = ($releaseDates | Sort-Object -Descending | Select-Object -First 1)
    if ($releaseDate -match '^(\d{4})') { $releaseYear = $Matches[1] }
  }
  if (-not $releaseYear -and [string]$releaseItem.tournament.name -match '(?<!\d)(20\d{2})(?!\d)') {
    $releaseYear = $Matches[1]
  }

  $effect = $null
  if ($item.effect.name) {
    $effect = [string]$item.effect.name
  } elseif ($item.effect -is [string]) {
    $effect = [string]$item.effect
  } elseif ([string]$item.name -match '\((Holo|Foil|Gold|Glitter|Lenticular|Embroidered|Patch|Paper)\)') {
    $effect = $Matches[1]
  }

  return [ordered]@{
    id = $itemId
    name = [string]$item.name
    image = [string]($item.image ?? $item.image_inventory ?? $item.image_url)
    rarity = $item.rarity
    category = if ($category) { [ordered]@{ name = $category } } else { $null }
    weapon = if ($item.weapon.name) { [ordered]@{ name = [string]$item.weapon.name } } else { $null }
    wear = $item.wear
    stattrak = $item.stattrak
    souvenir = $item.souvenir
    effect = $effect
    market_hash_name = [string]$item.market_hash_name
    pattern = if ($item.pattern.name) { [string]$item.pattern.name } else { $null }
    skin_id = if ($item.skin_id) { [string]$item.skin_id } else { $null }
    float_min = $item.min_float
    float_max = $item.max_float
    release_date = $releaseDate
    release_year = $releaseYear
    collection_names = @($collectionNames | Sort-Object -Unique)
  }
}

$collectionsUri = "$upstreamRoot/collections.json"
Write-Host "Downloading $collectionsUri"
$collectionsResponse = Invoke-WebRequest -Uri $collectionsUri -Headers @{ 'User-Agent' = 'SGRADER-UP-demo-catalog-refresh' }
$collections = @($collectionsResponse.Content | ConvertFrom-Json)
if ($collections.Count -eq 0) {
  throw 'The upstream collections.json file was empty. No catalog files were changed.'
}
foreach ($collection in $collections) {
  if ($collection.id -and $collection.release_date) {
    $script:CollectionReleaseDateById[[string]$collection.id] = [string]$collection.release_date
  }
}

$datasets = [ordered]@{}
$baseSkinsUri = "$upstreamRoot/skins.json"
Write-Host "Downloading $baseSkinsUri for variant metadata"
$baseSkinsResponse = Invoke-WebRequest -Uri $baseSkinsUri -Headers @{ 'User-Agent' = 'SGRADER-UP-demo-catalog-refresh' }
$baseSkins = @($baseSkinsResponse.Content | ConvertFrom-Json)
$baseSkinsById = @{}
foreach ($baseSkin in $baseSkins) { $baseSkinsById[[string]$baseSkin.id] = $baseSkin }

$variantsUri = "$upstreamRoot/skins_not_grouped.json"
Write-Host "Downloading $variantsUri"
$variantsResponse = Invoke-WebRequest -Uri $variantsUri -Headers @{ 'User-Agent' = 'SGRADER-UP-demo-catalog-refresh' }
$variants = @($variantsResponse.Content | ConvertFrom-Json)
if ($variants.Count -eq 0) { throw 'The upstream skins_not_grouped.json file was empty. No catalog files were changed.' }
$variantEntry = @{ file = 'skins_variants.json'; type = 'skin'; category = $null }
$datasets['skins_variants.json'] = @($variants | ForEach-Object {
  $base = $baseSkinsById[[string]$_.skin_id]
  Get-CompactCatalogEntry $_ $variantEntry $base
})

foreach ($entry in $fileMap) {
  $uri = "$upstreamRoot/$($entry.file)"
  Write-Host "Downloading $uri"
  $response = Invoke-WebRequest -Uri $uri -Headers @{ 'User-Agent' = 'SGRADER-UP-demo-catalog-refresh' }
  $items = @($response.Content | ConvertFrom-Json)
  if ($items.Count -eq 0) {
    throw "The upstream file $($entry.file) was empty. No catalog files were changed."
  }
  $datasets[$entry.file] = @($items | ForEach-Object { Get-CompactCatalogEntry $_ $entry })
}

$licenseUri = 'https://raw.githubusercontent.com/CS2Cap/CS2-API/main/LICENSE'
$license = (Invoke-WebRequest -Uri $licenseUri -Headers @{ 'User-Agent' = 'SGRADER-UP-demo-catalog-refresh' }).Content
if ($license -notmatch 'MIT License') {
  throw 'The upstream license was not recognized as MIT. No catalog files were changed.'
}

$fetchedAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
$metadata = [ordered]@{
  source = 'CS2Cap/CS2-API'
  sourceUrl = 'https://github.com/CS2Cap/CS2-API'
  dataPath = 'output/en'
  fetchedAtUtc = $fetchedAt
  license = 'MIT'
  currentYear = (Get-Date).Year.ToString()
  counts = [ordered]@{
    skins = $datasets['skins_variants.json'].Count
    stickers = $datasets['stickers.json'].Count
    agents = $datasets['agents.json'].Count
    graffiti = $datasets['graffiti.json'].Count
    musicKits = $datasets['music_kits.json'].Count
  }
  skinDesigns = $datasets['skins.json'].Count
  collectionCount = $collections.Count
  releaseYearCounts = [ordered]@{}
}

foreach ($year in (($datasets['skins_variants.json'] + $datasets['stickers.json'] + $datasets['agents.json'] + $datasets['graffiti.json'] + $datasets['music_kits.json']) | Where-Object { $_.release_year } | ForEach-Object { $_.release_year } | Sort-Object -Unique)) {
  $yearItems = $datasets['skins_variants.json'] + $datasets['stickers.json'] + $datasets['agents.json'] + $datasets['graffiti.json'] + $datasets['music_kits.json']
  $metadata.releaseYearCounts[$year] = @($yearItems | Where-Object { $_.release_year -eq $year }).Count
}

$destinations = @($projectRoot)
$deployRoot = Join-Path $projectRoot 'deploy-site'
if (Test-Path -LiteralPath $deployRoot -PathType Container) {
  $destinations += $deployRoot
}

# Write the completed snapshot only after every upstream file and the license were fetched.
foreach ($destination in $destinations) {
  foreach ($entry in $fileMap) {
    $json = ConvertTo-Json -InputObject @($datasets[$entry.file]) -Depth 10 -Compress
    Set-Content -LiteralPath (Join-Path $destination $entry.file) -Value $json -Encoding utf8NoBOM -NoNewline
  }
  $variantJson = ConvertTo-Json -InputObject @($datasets['skins_variants.json']) -Depth 10 -Compress
  Set-Content -LiteralPath (Join-Path $destination 'skins_variants.json') -Value $variantJson -Encoding utf8NoBOM -NoNewline
  $metadataJson = ConvertTo-Json -InputObject $metadata -Depth 10
  Set-Content -LiteralPath (Join-Path $destination 'catalog-source.json') -Value $metadataJson -Encoding utf8NoBOM
  Set-Content -LiteralPath (Join-Path $destination 'CS2-API-LICENSE.txt') -Value $license -Encoding utf8NoBOM
}

Write-Host "Catalog snapshot saved to: $($destinations -join ', ')"
Write-Host (ConvertTo-Json -InputObject $metadata.counts -Compress)
