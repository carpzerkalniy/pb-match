param()
$ErrorActionPreference = 'Stop'

# Stage only the fictional browser preview, never the project docs or API.
$projectDir = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$sourceDir = Join-Path $projectDir 'apps/miniapp'
$checkoutDir = Join-Path $projectDir 'outputs/phone-site'
$distDir = Join-Path $checkoutDir 'dist'
$manifestPath = Join-Path $sourceDir '.openai/hosting.json'
if (!(Test-Path -LiteralPath $manifestPath)) { throw 'Register the preview Site before preparing its files.' }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if (!$manifest.project_id) { throw 'Preview Site project_id is missing.' }

New-Item -ItemType Directory -Path $checkoutDir -Force | Out-Null
if (Test-Path -LiteralPath $distDir) {
    $resolvedDist = (Resolve-Path -LiteralPath $distDir).Path
    $expectedDist = [IO.Path]::GetFullPath($distDir)
    if ($resolvedDist -ne $expectedDist -or !$resolvedDist.StartsWith($projectDir + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe preview staging path.' }
    $linked = @(Get-Item -LiteralPath $distDir) + @(Get-ChildItem -LiteralPath $distDir -Recurse -Force)
    if ($linked | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw 'Preview staging contains a link; inspect it before rebuilding.' }
    Remove-Item -LiteralPath $resolvedDist -Recurse -Force
}
New-Item -ItemType Directory -Path $distDir -Force | Out-Null
foreach ($entry in Get-ChildItem -LiteralPath $sourceDir -Force) {
    if ($entry.Name -eq '.openai') { continue }
    if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Preview source contains a link.' }
    Copy-Item -LiteralPath $entry.FullName -Destination $distDir -Recurse -Force
}
$checkoutManifestDir = Join-Path $checkoutDir '.openai'
New-Item -ItemType Directory -Path $checkoutManifestDir -Force | Out-Null
$checkoutManifest = Join-Path $checkoutManifestDir 'hosting.json'
if (Test-Path -LiteralPath $checkoutManifest) {
    $existing = Get-Content -LiteralPath $checkoutManifest -Raw | ConvertFrom-Json
    if ($existing.project_id -ne $manifest.project_id) { throw 'Preview checkout belongs to a different Site.' }
}
Copy-Item -LiteralPath $manifestPath -Destination ($checkoutManifest + '.tmp') -Force
Move-Item -LiteralPath ($checkoutManifest + '.tmp') -Destination $checkoutManifest -Force
$fileCount = @(Get-ChildItem -LiteralPath $distDir -File -Recurse).Count
[pscustomobject]@{ project_id = $manifest.project_id; checkout = $checkoutDir; static_files = $fileCount } | ConvertTo-Json -Compress
