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

function Get-CompactCatalogEntry($item, $entry) {
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
  foreach ($collection in @($item.collections)) {
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
  if (-not $releaseYear -and [string]$item.tournament.name -match '(?<!\d)(20\d{2})(?!\d)') {
    $releaseYear = $Matches[1]
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
    market_hash_name = [string]$item.market_hash_name
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
    skins = $datasets['skins.json'].Count
    stickers = $datasets['stickers.json'].Count
    agents = $datasets['agents.json'].Count
    graffiti = $datasets['graffiti.json'].Count
    musicKits = $datasets['music_kits.json'].Count
  }
  collectionCount = $collections.Count
  releaseYearCounts = [ordered]@{}
}

foreach ($year in ($datasets.Values | ForEach-Object { $_ } | Where-Object { $_.release_year } | ForEach-Object { $_.release_year } | Sort-Object -Unique)) {
  $metadata.releaseYearCounts[$year] = @($datasets.Values | ForEach-Object { $_ } | Where-Object { $_.release_year -eq $year }).Count
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
  $metadataJson = ConvertTo-Json -InputObject $metadata -Depth 10
  Set-Content -LiteralPath (Join-Path $destination 'catalog-source.json') -Value $metadataJson -Encoding utf8NoBOM
  Set-Content -LiteralPath (Join-Path $destination 'CS2-API-LICENSE.txt') -Value $license -Encoding utf8NoBOM
}

Write-Host "Catalog snapshot saved to: $($destinations -join ', ')"
Write-Host (ConvertTo-Json -InputObject $metadata.counts -Compress)
