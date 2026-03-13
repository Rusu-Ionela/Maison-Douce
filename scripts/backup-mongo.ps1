param(
  [string]$MongoUri = $env:MONGODB_URI,
  [string]$OutputDir = (Join-Path $PSScriptRoot "..\\backups\\mongo-$(Get-Date -Format 'yyyyMMdd-HHmmss')")
)

if (-not $MongoUri) {
  throw "Mongo URI missing. Pass -MongoUri or set MONGODB_URI."
}

$mongodump = Get-Command mongodump -ErrorAction SilentlyContinue
if (-not $mongodump) {
  throw "mongodump was not found in PATH. Install MongoDB Database Tools first."
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

& $mongodump.Source "--uri=$MongoUri" "--out=$OutputDir"
if ($LASTEXITCODE -ne 0) {
  throw "mongodump failed with exit code $LASTEXITCODE."
}

Write-Output "Mongo backup saved to: $OutputDir"
