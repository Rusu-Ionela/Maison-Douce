param(
  [Parameter(Mandatory = $true)]
  [string]$InputDir,
  [string]$MongoUri = $env:MONGODB_URI
)

if (-not (Test-Path $InputDir)) {
  throw "Input directory not found: $InputDir"
}

if (-not $MongoUri) {
  throw "Mongo URI missing. Pass -MongoUri or set MONGODB_URI."
}

$mongorestore = Get-Command mongorestore -ErrorAction SilentlyContinue
if (-not $mongorestore) {
  throw "mongorestore was not found in PATH. Install MongoDB Database Tools first."
}

& $mongorestore.Source "--uri=$MongoUri" "--drop" "$InputDir"
if ($LASTEXITCODE -ne 0) {
  throw "mongorestore failed with exit code $LASTEXITCODE."
}

Write-Output "Mongo restore completed from: $InputDir"
