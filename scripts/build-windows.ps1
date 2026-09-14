$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "package.json"))) {
  $root = "D:\Game Library my project\Game Library 1st V\Game-library-"
}

$env:Path = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;$env:USERPROFILE\.cargo\bin;" + $env:Path
Set-Location $root
npm run tauri -- build
