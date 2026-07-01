$ErrorActionPreference = "Stop"

Write-Host "EventGuard Windows setup" -ForegroundColor Cyan

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)][string]$File,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [switch]$AllowFailure
  )

  & $File @Arguments
  $code = $LASTEXITCODE

  if ($code -ne 0 -and -not $AllowFailure) {
    Write-Host "Command failed: $File $($Arguments -join ' ')" -ForegroundColor Red
    exit $code
  }

  if ($code -ne 0 -and $AllowFailure) {
    Write-Host "Warning: $File $($Arguments -join ' ') failed, continuing with corepack pnpm." -ForegroundColor Yellow
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js was not found. Install Node.js 22 LTS from https://nodejs.org/ and run this script again." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  Write-Host "Corepack was not found. Update Node.js to version 22 LTS and run this script again." -ForegroundColor Red
  exit 1
}

Write-Host "Enabling Corepack..." -ForegroundColor Yellow
Invoke-Native -File "corepack" -Arguments @("enable") -AllowFailure

Write-Host "Activating pnpm 11.7.0..." -ForegroundColor Yellow
Invoke-Native -File "corepack" -Arguments @("prepare", "pnpm@11.7.0", "--activate")

Write-Host "Installing dependencies..." -ForegroundColor Yellow
Invoke-Native -File "corepack" -Arguments @("pnpm", "install")

Write-Host "Approving dependency build scripts..." -ForegroundColor Yellow
Invoke-Native -File "corepack" -Arguments @("pnpm", "approve-builds", "--all")

Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
Invoke-Native -File "corepack" -Arguments @("pnpm", "db:generate")

Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "  docker compose up -d postgres redis"
Write-Host "  corepack pnpm db:migrate"
Write-Host "  corepack pnpm db:seed"
Write-Host "  corepack pnpm dev"
