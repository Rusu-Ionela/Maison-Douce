# scripts/fix-frontend.ps1
$ErrorActionPreference = "Stop"

$root = "frontend\src"
$files = Get-ChildItem -Path $root -Recurse -Include *.js,*.jsx

foreach ($f in $files) {
  $t = Get-Content $f.FullName -Raw

  # 1) axios.* -> api.*
  $t = $t -replace '\baxios\.(get|post|put|patch|delete)\b', 'api.$1'

  # 2) http://localhost:5000/api/... -> /...
  $t = $t -replace '"http://localhost:5000/api([^""]*)"', '"/$1"'
  $t = $t -replace "'http://localhost:5000/api([^']*)'", "'/$1'"

  # 3) window.open -> ${API.baseURL}
  $t = $t -replace 'window\.open\("http://localhost:5000(?:/api)?([^""]*)"\)', 'window.open(`${API.baseURL}$1`)'
  $t = $t -replace "window\.open\('http://localhost:5000(?:/api)?([^']*)'\)", 'window.open(`${API.baseURL}$1`)'

  # 4) scoate importul axios (multiline)
  $t = $t -replace '(?m)^\s*import\s+axios\s+from\s+["''"]axios["''"];?\s*$', ''

  # 5) dacă ai import { api } fără API, completează
  $t = $t -replace 'import\s+\{\s*api\s*\}\s+from\s+["''"]\.\./lib/api["''"];', 'import { api, API } from "../lib/api";'

  # 6) adaugă import { api, API } dacă lipsește de tot (PREPEND la fișier)
  if ($t -notmatch 'from\s+["''"]\.\./lib/api["''"]') {
    $import = "import { api, API } from `"../lib/api`";`r`n"
    $t = $import + $t
  }

  Set-Content -Path $f.FullName -Value $t -NoNewline
  Write-Host " Fixed $($f.FullName)"
}

Write-Host "Done."
