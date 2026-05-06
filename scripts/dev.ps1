param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

# Run from repo root regardless of invocation location
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$portableNpm = "C:\node22\node-v22.22.2-win-x64\npm.cmd"

function Resolve-NpmCommand {
  if (Test-Path $portableNpm) {
    return $portableNpm
  }

  $npmCmd = (Get-Command npm -ErrorAction SilentlyContinue)?.Source
  if ($npmCmd) {
    return $npmCmd
  }

  throw @"
Não foi possível localizar o npm.

- Opção 1 (recomendada): mantenha o Node portátil em:
  $portableNpm

- Opção 2: instale Node.js LTS e reabra o terminal para atualizar o PATH.
"@
}

$npm = Resolve-NpmCommand

Write-Host "Repo: $repoRoot"
Write-Host "npm:  $npm"
Write-Host "Port: $Port"

& $npm run dev -- --port $Port

