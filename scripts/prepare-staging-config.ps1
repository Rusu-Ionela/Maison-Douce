param(
  [string]$BaseClientUrl = "",
  [string]$StagingHost = "staging.example.com",
  [string]$StagingUser = "deploy",
  [string]$StagingPath = "/opt/maison-douce",
  [int]$StagingPort = 22,
  [string]$StackName = "maison-douce-staging",
  [int]$FrontendPort = 8080,
  [int]$BackendPort = 5000,
  [int]$MongoPort = 27017,
  [string]$OutputDir = "deploy/staging/generated"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $repoRoot $OutputDir

function Read-EnvFile {
  param([string]$Path)

  $values = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $values
  }

  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      continue
    }

    if ($line -notmatch '^(?<key>[A-Za-z_][A-Za-z0-9_]*)=(?<value>.*)$') {
      continue
    }

    $key = $matches["key"]
    $value = $matches["value"].Trim()
    if ($value.Length -ge 2) {
      $first = $value.Substring(0, 1)
      $last = $value.Substring($value.Length - 1, 1)
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }

    $values[$key] = $value
  }

  return $values
}

function Get-FirstValue {
  param(
    [object[]]$Sources,
    [string[]]$Keys,
    [string]$DefaultValue = ""
  )

  foreach ($source in $Sources) {
    if ($null -eq $source) {
      continue
    }
    foreach ($key in $Keys) {
      if ($source.ContainsKey($key)) {
        $value = [string]$source[$key]
        if ($value -ne "") {
          return $value
        }
      }
    }
  }

  return $DefaultValue
}

function Get-DatabaseNameFromMongoUri {
  param(
    [string]$MongoUri,
    [string]$DefaultName = "torturi"
  )

  if (-not $MongoUri) {
    return $DefaultName
  }

  $withoutQuery = ($MongoUri -split '\?', 2)[0]
  $dbName = ($withoutQuery -split '/', 4)[-1]
  if (-not $dbName -or $dbName -eq $withoutQuery) {
    return $DefaultName
  }

  return $dbName
}

function Get-UrlHost {
  param([string]$Url)

  try {
    return ([Uri]$Url).Host
  } catch {
    return ""
  }
}

function Mask-Value {
  param([string]$Value)

  if (-not $Value) {
    return "(empty)"
  }
  if ($Value.Length -le 8) {
    return ("*" * $Value.Length)
  }

  return "{0}...{1}" -f $Value.Substring(0, 4), $Value.Substring($Value.Length - 4, 4)
}

function Write-EnvFile {
  param(
    [string]$Path,
    [System.Collections.Specialized.OrderedDictionary]$Values
  )

  $lines = foreach ($entry in $Values.GetEnumerator()) {
    "{0}={1}" -f $entry.Key, [string]$entry.Value
  }

  Set-Content -LiteralPath $Path -Value $lines -Encoding UTF8
}

$backendLocal = Read-EnvFile (Join-Path $repoRoot "backend/.env")
$backendExample = Read-EnvFile (Join-Path $repoRoot "backend/.env.example")
$frontendLocal = Read-EnvFile (Join-Path $repoRoot "frontend/.env.local")
$frontendEnv = Read-EnvFile (Join-Path $repoRoot "frontend/.env")
$frontendExample = Read-EnvFile (Join-Path $repoRoot "frontend/.env.example")

$backendSources = @($backendLocal, $backendExample)
$frontendSources = @($frontendLocal, $frontendEnv, $frontendExample)
$allSources = @($backendLocal, $backendExample, $frontendLocal, $frontendEnv, $frontendExample)

$localBaseClientUrl = Get-FirstValue -Sources $backendSources -Keys @("BASE_CLIENT_URL") -DefaultValue ""
if (-not $BaseClientUrl) {
  if ($localBaseClientUrl -and $localBaseClientUrl -notmatch 'localhost|127\.0\.0\.1') {
    $BaseClientUrl = $localBaseClientUrl
  } else {
    $BaseClientUrl = "https://staging.example.com"
  }
}

$mongoUri = Get-FirstValue -Sources $backendSources -Keys @("MONGODB_URI", "MONGO_URI") -DefaultValue "mongodb://127.0.0.1:27017/torturi"
$mongoDatabase = Get-DatabaseNameFromMongoUri -MongoUri $mongoUri
$mailHost = Get-UrlHost -Url $BaseClientUrl
if (-not $mailHost) {
  $mailHost = "staging.example.com"
}

$smtpFrom = Get-FirstValue -Sources $backendSources -Keys @("SMTP_FROM") -DefaultValue ""
if (-not $smtpFrom -or $smtpFrom -match "localhost") {
  $smtpFrom = "Maison-Douce <no-reply@$mailHost>"
}

$vapidSubject = Get-FirstValue -Sources $backendSources -Keys @("VAPID_SUBJECT") -DefaultValue ""
if (-not $vapidSubject -or $vapidSubject -match "localhost") {
  $vapidSubject = "mailto:contact@$mailHost"
}

$stagingEnv = [ordered]@{
  APP_STACK = $StackName
  FRONTEND_PORT = $FrontendPort
  BACKEND_PORT = $BackendPort
  MONGO_PORT = $MongoPort
  BASE_CLIENT_URL = $BaseClientUrl
  BODY_LIMIT = Get-FirstValue -Sources $backendSources -Keys @("BODY_LIMIT") -DefaultValue "10mb"
  TRUST_PROXY = Get-FirstValue -Sources $backendSources -Keys @("TRUST_PROXY") -DefaultValue "1"
  MONGODB_URI = "mongodb://mongo:27017/$mongoDatabase"
  JWT_SECRET = Get-FirstValue -Sources $backendSources -Keys @("JWT_SECRET") -DefaultValue "change_me_before_staging"
  JWT_EXPIRES = Get-FirstValue -Sources $backendSources -Keys @("JWT_EXPIRES") -DefaultValue "7d"
  MIN_LEAD_HOURS = Get-FirstValue -Sources $allSources -Keys @("MIN_LEAD_HOURS", "VITE_MIN_LEAD_HOURS") -DefaultValue "24"
  RESET_TOKEN_TTL_MIN = Get-FirstValue -Sources $backendSources -Keys @("RESET_TOKEN_TTL_MIN") -DefaultValue "60"
  PATISER_INVITE_CODE = Get-FirstValue -Sources $backendSources -Keys @("PATISER_INVITE_CODE") -DefaultValue "PATISER-INVITE"
  STRIPE_SECRET_KEY = Get-FirstValue -Sources $backendSources -Keys @("STRIPE_SECRET_KEY", "STRIPE_SECRET", "STRIPE_SK") -DefaultValue ""
  STRIPE_WEBHOOK_SECRET = Get-FirstValue -Sources $backendSources -Keys @("STRIPE_WEBHOOK_SECRET") -DefaultValue ""
  STRIPE_CURRENCY = Get-FirstValue -Sources $backendSources -Keys @("STRIPE_CURRENCY") -DefaultValue "mdl"
  SMTP_HOST = Get-FirstValue -Sources $backendSources -Keys @("SMTP_HOST") -DefaultValue ""
  SMTP_SERVICE = Get-FirstValue -Sources $backendSources -Keys @("SMTP_SERVICE") -DefaultValue ""
  SMTP_PORT = Get-FirstValue -Sources $backendSources -Keys @("SMTP_PORT") -DefaultValue "587"
  SMTP_SECURE = Get-FirstValue -Sources $backendSources -Keys @("SMTP_SECURE") -DefaultValue "false"
  SMTP_USER = Get-FirstValue -Sources $backendSources -Keys @("SMTP_USER", "EMAIL_USER") -DefaultValue ""
  SMTP_PASS = Get-FirstValue -Sources $backendSources -Keys @("SMTP_PASS", "EMAIL_PASS") -DefaultValue ""
  SMTP_FROM = $smtpFrom
  VAPID_PUBLIC_KEY = Get-FirstValue -Sources $backendSources -Keys @("VAPID_PUBLIC_KEY") -DefaultValue ""
  VAPID_PRIVATE_KEY = Get-FirstValue -Sources $backendSources -Keys @("VAPID_PRIVATE_KEY") -DefaultValue ""
  VAPID_SUBJECT = $vapidSubject
  OPENAI_API_KEY = Get-FirstValue -Sources $backendSources -Keys @("OPENAI_API_KEY") -DefaultValue ""
  OPENAI_IMAGE_MODEL = Get-FirstValue -Sources $backendSources -Keys @("OPENAI_IMAGE_MODEL") -DefaultValue "gpt-image-1"
  AI_IMAGE_SIZE = Get-FirstValue -Sources $backendSources -Keys @("AI_IMAGE_SIZE") -DefaultValue "1024x1024"
}

$githubVars = [ordered]@{
  FRONTEND_PRESTATOR_ID = Get-FirstValue -Sources $frontendSources -Keys @("VITE_PRESTATOR_ID") -DefaultValue "default"
  FRONTEND_STRIPE_PK = Get-FirstValue -Sources $allSources -Keys @("VITE_STRIPE_PK", "STRIPE_PUBLISHABLE_KEY") -DefaultValue ""
  FRONTEND_MIN_LEAD_HOURS = Get-FirstValue -Sources $allSources -Keys @("VITE_MIN_LEAD_HOURS", "MIN_LEAD_HOURS") -DefaultValue "24"
  STAGING_HOST = $StagingHost
  STAGING_USER = $StagingUser
  STAGING_PATH = $StagingPath
  STAGING_PORT = [string]$StagingPort
  STAGING_STACK_NAME = $StackName
}

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

$stagingEnvPath = Join-Path $outputPath "staging.generated.env"
$githubVarsPath = Join-Path $outputPath "github-vars.generated.env"
$githubSecretsGuidePath = Join-Path $outputPath "github-secrets-guide.md"

Write-EnvFile -Path $stagingEnvPath -Values $stagingEnv
Write-EnvFile -Path $githubVarsPath -Values $githubVars

$guide = @(
  "# GitHub staging configuration"
  ""
  "Repository vars"
  ""
  "- Paste the content of `deploy/staging/generated/github-vars.generated.env` into repository or environment variables."
  ""
  "Staging secrets"
  ""
  "- `STAGING_SSH_KEY`: private key for the deploy user on the staging server."
  "- `STAGING_GHCR_USERNAME`: GitHub username or machine user that owns the `read:packages` token."
  "- `STAGING_GHCR_TOKEN`: GitHub token or PAT with `read:packages` for GHCR pulls."
  "- `STAGING_ENV_FILE`: paste the exact content of `deploy/staging/generated/staging.generated.env`."
  ""
  "Next checks"
  ""
  "- Confirm `BASE_CLIENT_URL` points to the real staging URL."
  "- Replace placeholder values like `JWT_SECRET=change_me_before_staging`."
  "- Confirm Stripe, SMTP and VAPID values before the first deploy."
)
Set-Content -LiteralPath $githubSecretsGuidePath -Value $guide -Encoding UTF8

$warnings = New-Object System.Collections.Generic.List[string]
if ($stagingEnv["BASE_CLIENT_URL"] -match "example\.com") {
  $warnings.Add("BASE_CLIENT_URL este inca placeholder. Ruleaza scriptul cu -BaseClientUrl https://staging.domeniul-tau.")
}
if ($stagingEnv["JWT_SECRET"] -match "^change_me") {
  $warnings.Add("JWT_SECRET este placeholder si trebuie inlocuit inainte de primul deploy.")
}
if (-not $stagingEnv["STRIPE_SECRET_KEY"]) {
  $warnings.Add("STRIPE_SECRET_KEY lipseste. Fluxurile Stripe vor raspunde cu 503 in productie.")
}
if (-not $stagingEnv["SMTP_HOST"] -and -not $stagingEnv["SMTP_SERVICE"]) {
  $warnings.Add("SMTP nu este configurat. Emailurile vor ramane doar in fallback/outbox.")
}
if (-not $stagingEnv["VAPID_PUBLIC_KEY"] -or -not $stagingEnv["VAPID_PRIVATE_KEY"]) {
  $warnings.Add("VAPID nu este configurat. Push notifications vor ramane dezactivate.")
}
if ($githubVars["STAGING_HOST"] -eq "staging.example.com" -or $githubVars["STAGING_PATH"] -eq "/opt/maison-douce") {
  $warnings.Add("STAGING_HOST/STAGING_PATH sunt placeholder-e. Completeaza datele reale ale serverului.")
}

Write-Host "Generated files:"
Write-Host " - $stagingEnvPath"
Write-Host " - $githubVarsPath"
Write-Host " - $githubSecretsGuidePath"
Write-Host ""
Write-Host "GitHub vars preview:"
Write-Host (" - FRONTEND_PRESTATOR_ID={0}" -f $githubVars["FRONTEND_PRESTATOR_ID"])
Write-Host (" - FRONTEND_STRIPE_PK={0}" -f (Mask-Value -Value $githubVars["FRONTEND_STRIPE_PK"]))
Write-Host (" - FRONTEND_MIN_LEAD_HOURS={0}" -f $githubVars["FRONTEND_MIN_LEAD_HOURS"])
Write-Host (" - STAGING_HOST={0}" -f $githubVars["STAGING_HOST"])
Write-Host (" - STAGING_USER={0}" -f $githubVars["STAGING_USER"])
Write-Host (" - STAGING_PATH={0}" -f $githubVars["STAGING_PATH"])
Write-Host (" - STAGING_PORT={0}" -f $githubVars["STAGING_PORT"])
Write-Host (" - STAGING_STACK_NAME={0}" -f $githubVars["STAGING_STACK_NAME"])

if ($warnings.Count -gt 0) {
  Write-Host ""
  foreach ($warning in $warnings) {
    Write-Warning $warning
  }
}
