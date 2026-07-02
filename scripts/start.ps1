<#
.SYNOPSIS
  EventGuard one-command startup for Windows.

.DESCRIPTION
  Brings the whole local stack up in the correct order:
    1. Ensures a root .env exists (copies from .env.example if missing).
    2. Loads the root .env into the current process so every child command
       (Prisma CLI, seed, Nest, Next) inherits DATABASE_URL/REDIS_URL/etc.
       regardless of its working directory.
    3. Keeps prisma/.env in sync so `corepack pnpm db:migrate` also works
       when run directly.
    4. Starts the PostgreSQL and Redis containers and waits until healthy.
    5. Installs dependencies, generates the Prisma client, applies
       migrations and (optionally) seeds demo data.
    6. Starts the API + web apps with `corepack pnpm dev`.

.PARAMETER SkipSeed
  Skip the demo data seeding step.

.PARAMETER SkipDev
  Prepare everything but do not start the dev servers.

.PARAMETER Fresh
  Reset the database (drops data) before migrating. Use with care.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
#>
[CmdletBinding()]
param(
  [switch]$SkipSeed,
  [switch]$SkipDev,
  [switch]$Fresh,
  [switch]$Detached
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step { param([string]$m) Write-Host "`n==> $m" -ForegroundColor Cyan }
function Write-Ok   { param([string]$m) Write-Host "    $m" -ForegroundColor Green }
function Write-Warn { param([string]$m) Write-Host "    $m" -ForegroundColor Yellow }

function Invoke-Native {
  param([string]$File, [string[]]$Arguments)
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $File $($Arguments -join ' ')"
  }
}

# Stop any EventGuard dev servers (pnpm/nest/next and their children) still
# running from a previous run. On Windows these processes spawn worker children
# and, when the parent pnpm dies, the workers are orphaned but keep running,
# holding ports 3000/4000 and the Prisma query-engine DLL open. A stale handle
# on that DLL makes `prisma generate` fail with EPERM on rename. Killing by PID
# alone leaves the children behind, so we kill the whole process TREE.
function Stop-DevServers {
  $procs = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -and ($_.CommandLine -match "EventGuard" -and $_.CommandLine -match "(pnpm|nest|next|dist\\apps\\api|apps\\web|apps\\api)") })
  foreach ($p in $procs) {
    Write-Warn "Stopping leftover dev process tree PID $($p.ProcessId)"
    & taskkill /PID $p.ProcessId /T /F 2>&1 | Out-Null
  }
  if ($procs.Count -gt 0) { Start-Sleep -Seconds 3 }
}

# Prisma generate can transiently fail with EPERM on Windows if the engine DLL
# is momentarily locked (antivirus / lingering handle). Retry a couple times.
function Invoke-PrismaGenerate {
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    & corepack pnpm db:generate
    if ($LASTEXITCODE -eq 0) { return }
    Write-Warn "prisma generate failed (attempt $attempt/3), retrying in 3s..."
    Start-Sleep -Seconds 3
  }
  throw "prisma generate failed after 3 attempts (is a dev server holding the engine DLL?)."
}

# --- 1. Ensure root .env exists -------------------------------------------
Write-Step "Checking environment file"
$envPath = Join-Path $root ".env"
$envExample = Join-Path $root ".env.example"
if (-not (Test-Path $envPath)) {
  if (-not (Test-Path $envExample)) { throw ".env.example not found; cannot bootstrap .env" }
  Copy-Item $envExample $envPath
  Write-Warn "Created .env from .env.example - review secrets before production use."
} else {
  Write-Ok ".env present."
}

# --- 2. Load .env into this process ---------------------------------------
Write-Step "Loading environment variables"
$loaded = 0
foreach ($line in (Get-Content $envPath)) {
  $trimmed = $line.Trim()
  if ($trimmed -eq "" -or $trimmed.StartsWith("#")) { continue }
  if ($trimmed -notmatch "^([^=]+)=(.*)$") { continue }
  $key = $matches[1].Trim()
  $val = $matches[2].Trim()
  # strip optional surrounding single or double quotes
  if ($val -match '^"(.*)"$' -or $val -match "^'(.*)'$") { $val = $matches[1] }
  Set-Item -Path "Env:$key" -Value $val
  $loaded++
}
Write-Ok "$loaded variables loaded into the process."

# --- 3. Keep prisma/.env in sync ------------------------------------------
Copy-Item $envPath (Join-Path $root "prisma\.env") -Force
Write-Ok "prisma/.env synced."

# --- 3b. Stop leftover dev servers (they lock the Prisma engine DLL) -------
Write-Step "Stopping any leftover dev servers"
Stop-DevServers
Write-Ok "Clear."

# --- 4. Start database services -------------------------------------------
Write-Step "Starting PostgreSQL and Redis (docker compose)"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is not installed or not on PATH. Install Docker Desktop and retry."
}
Invoke-Native -File "docker" -Arguments @("compose", "up", "-d", "postgres", "redis")

Write-Host "    Waiting for PostgreSQL to become healthy..." -NoNewline
$deadline = (Get-Date).AddMinutes(2)
do {
  Start-Sleep -Seconds 2
  $status = (& docker inspect --format "{{.State.Health.Status}}" eventguard-postgres-1 2>$null)
  Write-Host "." -NoNewline
  if ((Get-Date) -gt $deadline) { Write-Host ""; throw "PostgreSQL did not become healthy in time." }
} while ($status -ne "healthy")
Write-Host " healthy." -ForegroundColor Green

# --- 5. Install + Prisma + seed -------------------------------------------
Write-Step "Installing dependencies"
Invoke-Native -File "corepack" -Arguments @("pnpm", "install")

Write-Step "Generating Prisma client"
Invoke-PrismaGenerate

if ($Fresh) {
  Write-Step "Resetting database (Fresh)"
  Invoke-Native -File "corepack" -Arguments @("pnpm", "--filter", "@eventguard/api", "exec", "prisma", "migrate", "reset", "--force", "--schema", "../../prisma/schema.prisma")
} else {
  Write-Step "Applying database migrations"
  # --skip-generate: we already generated the client above. `prisma migrate dev`
  # would otherwise run its own generate immediately after, whose engine-DLL
  # rename intermittently trips EPERM on Windows right after the first generate.
  Invoke-Native -File "corepack" -Arguments @("pnpm", "--filter", "@eventguard/api", "exec", "prisma", "migrate", "dev", "--schema", "../../prisma/schema.prisma", "--skip-generate")
}

if (-not $SkipSeed) {
  Write-Step "Seeding demo data"
  try {
    Invoke-Native -File "corepack" -Arguments @("pnpm", "db:seed")
  } catch {
    Write-Warn "Seed failed (data may already exist): $($_.Exception.Message)"
  }
}

# --- 6. Start apps ---------------------------------------------------------
if ($SkipDev) {
  Write-Step "Setup complete (SkipDev). Start manually with: corepack pnpm dev"
  return
}

if ($Detached) {
  # Launch the dev servers in their own window and return. Closing that window
  # (or running this script again, which calls Stop-DevServers) tears the whole
  # tree down cleanly.
  Write-Step "Starting API + web in a detached window"
  Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$root'; corepack pnpm dev"
  ) -WorkingDirectory $root
  Write-Ok "Dev servers launching in a separate window."
  Write-Ok "Web: http://localhost:3000  |  API: http://localhost:4000"
  return
}

Write-Step "Starting API + web (corepack pnpm dev)"
Write-Ok "Web: http://localhost:3000  |  API: http://localhost:4000"
Write-Warn "Press Ctrl+C to stop both servers."
# Do not use Invoke-Native here: `pnpm dev` blocks until you stop it, and a
# Ctrl+C / teardown exit is non-zero by nature. Treat any exit as normal so the
# script ends cleanly instead of throwing a red error on shutdown.
& corepack pnpm dev
Write-Step "Dev servers stopped (exit code $LASTEXITCODE)."
