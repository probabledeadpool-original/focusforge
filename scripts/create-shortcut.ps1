$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "FocusForge.lnk"
$projectRoot = Split-Path -Parent $PSScriptRoot
$targetPath = Join-Path $projectRoot "launch.bat"

$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Save()

Write-Host "FocusForge shortcut successfully created at: $shortcutPath"
