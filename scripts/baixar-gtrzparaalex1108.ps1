param(
  [switch]$Install
)

$ErrorActionPreference = 'Stop'

$repo = 'jotavgalves/gtrzparaalex1108'
$baseUrl = "https://github.com/$repo/releases/latest/download"
$targetDir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'GTRZ-Alex-1108'
$setupFile = 'GTRZ-System-0.1.0-Setup.exe'
$backupFile = 'GTRZ-LA-RUMBA-JAMPA-2026-08-21.gtrzbackup'

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
  Write-Host "Fechando GTRZ System se estiver aberto..."
  Get-Process -Name 'GTRZ System' -ErrorAction SilentlyContinue | Stop-Process -Force

  Write-Host "Instalando GTRZ System em modo silencioso..."
  Start-Process -FilePath (Join-Path $targetDir $setupFile) -ArgumentList '/S' -Wait -WindowStyle Hidden

  Write-Host "Atualizacao concluida."
}
