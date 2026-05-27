$ProgressPreference = 'SilentlyContinue'
$url = 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe'
$outputDir = 'c:\Users\malik\Downloads\Lab Inventory\scratch'
$outputPath = Join-Path $outputDir 'DockerDesktopInstaller.exe'

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Write-Host "Mengunduh Docker Desktop Installer (~617MB)..."
Invoke-WebRequest -Uri $url -OutFile $outputPath

Write-Host "Mengunduh selesai! Menjalankan installer..."
Start-Process -FilePath $outputPath -Wait

Write-Host "Instalasi selesai!"
