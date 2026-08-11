param(
  [switch]$Install
)

$ErrorActionPreference = 'Stop'

$repo = 'jotavgalves/gtrzparaalex1108'
$baseUrl = "https://github.com/$repo/releases/latest/download"
$targetDir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'GTRZ-Alex-1108'
$setupFile = 'GTRZ-System-0.1.0-Setup.exe'
$backupFile = 'GTRZ-LA-RUMBA-JAMPA-2026-08-11.gtrzbackup'

New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

Write-Host "Baixando instalador..."
Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/$setupFile" -OutFile (Join-Path $targetDir $setupFile)

Write-Host "Baixando backup..."
Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/$backupFile" -OutFile (Join-Path $targetDir $backupFile)

Write-Host ""
Write-Host "Arquivos salvos em: $targetDir"
Write-Host "Instalador: $setupFile"
Write-Host "Backup: $backupFile"

if ($Install) {
  Write-Host ""
  Write-Host "Instalando GTRZ System..."
  Start-Process -FilePath (Join-Path $targetDir $setupFile) -Wait
}
