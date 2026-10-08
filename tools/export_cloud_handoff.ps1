param([ValidatePattern('^[a-zA-Z0-9-]+$')][string]$PackageName = 'pb-match-cloud-20261008')
$ErrorActionPreference = 'Stop'
$cloudRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$cloudStage = Join-Path $cloudRoot ('outputs/cloud-transfer/' + $PackageName)
$cloudZip = Join-Path $cloudRoot ('outputs/' + $PackageName + '.zip')
if ((Test-Path -LiteralPath $cloudStage) -or (Test-Path -LiteralPath $cloudZip)) { throw 'Choose a fresh PackageName; existing exports are preserved.' }
New-Item -ItemType Directory -Path $cloudStage -Force | Out-Null
$cloudManifest = [Collections.Generic.List[object]]::new()
function Add-CloudFile([string]$Source, [string]$Destination) {
    $cloudSourceFile = Join-Path $cloudRoot $Source
    $cloudTargetFile = Join-Path $cloudStage $Destination
    if (!(Test-Path -LiteralPath $cloudSourceFile -PathType Leaf)) { throw ('Missing source: ' + $Source) }
    New-Item -ItemType Directory -Path (Split-Path -Parent $cloudTargetFile) -Force | Out-Null
    Copy-Item -LiteralPath $cloudSourceFile -Destination $cloudTargetFile
    $cloudManifest.Add([pscustomobject]@{path=$Destination.Replace('\','/'); sha256=(Get-FileHash -LiteralPath $cloudTargetFile -Algorithm SHA256).Hash; bytes=(Get-Item -LiteralPath $cloudTargetFile).Length})
}
foreach ($cloudFile in @('AGENTS.md','README.md','HANDOFF.md','.gitignore','.env.example','package.json','package-lock.json')) { Add-CloudFile $cloudFile $cloudFile }
foreach ($cloudDoc in @('SPEC','DECISIONS','DESIGN','QUESTIONS','PROTOTYPE_BUILD_PLAN','AGENT_PLAN','USER_JOURNEYS','SCENARIO_GALLERY','SCENARIO_DESIGN','ARCHITECTURE','IMPLEMENTATION','MVP_CRITIQUE_2026-10-10','PROTOTYPE_FIRST_REVIEW','STATUS','VISUAL_QA','CLOUD_HANDOFF','CLOUD_START_PROMPT')) {
    Add-CloudFile ('docs/' + $cloudDoc + '.md') ('docs/' + $cloudDoc + '.md')
}
foreach ($cloudDir in @('apps','tests','tools','contracts')) {
    foreach ($cloudFile in Get-ChildItem -LiteralPath (Join-Path $cloudRoot $cloudDir) -File -Recurse -Force) {
        if ($cloudFile.FullName -match '[\\/](__pycache__|node_modules|\.git)[\\/]' -or $cloudFile.Extension -eq '.pyc') { continue }
        $cloudRelative = [IO.Path]::GetRelativePath($cloudRoot,$cloudFile.FullName)
        Add-CloudFile $cloudRelative $cloudRelative
    }
}
$cloudEvidence = Join-Path $cloudRoot 'outputs/visual-qa/classic-release'
$cloudReport = Get-Content -LiteralPath (Join-Path $cloudEvidence 'report.json') -Raw | ConvertFrom-Json
if ($cloudReport.failures.Count -ne 0 -or $cloudReport.results.Count -ne 57) { throw 'Final local evidence is not approved.' }
foreach ($cloudFile in Get-ChildItem -LiteralPath $cloudEvidence -File) {
    if ($cloudFile.Extension -eq '.json' -or $cloudFile.Name -match '(idle|long-text|full-bio|keyboard-focus|after-close|touch-held)\.png$') {
        Add-CloudFile ([IO.Path]::GetRelativePath($cloudRoot,$cloudFile.FullName)) ('qa/local-classic-release/' + $cloudFile.Name)
    }
}
[pscustomobject]@{created_utc=[DateTime]::UtcNow.ToString('o'); files=$cloudManifest; excluded=@('.git','node_modules','actual .env','docs/sources','shared memory','local Windows staging','video and traces')} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $cloudStage 'CLOUD_PACKAGE_MANIFEST.json') -Encoding utf8
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($cloudStage,$cloudZip,[IO.Compression.CompressionLevel]::Optimal,$false)
$cloudArchive = [IO.Compression.ZipFile]::OpenRead($cloudZip)
try {
    if ($cloudArchive.Entries.Count -ne $cloudManifest.Count + 1) { throw 'Archive file count mismatch.' }
    foreach ($cloudEntry in $cloudManifest) {
        $cloudArchived = $cloudArchive.GetEntry($cloudEntry.path)
        if (!$cloudArchived) { throw ('Archive missing: ' + $cloudEntry.path) }
        $cloudStream = $cloudArchived.Open()
        try { $cloudHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($cloudStream)) }
        finally { $cloudStream.Dispose() }
        if ($cloudHash -ne $cloudEntry.sha256) { throw ('Archive hash mismatch: ' + $cloudEntry.path) }
    }
} finally { $cloudArchive.Dispose() }
[pscustomobject]@{archive=$cloudZip; files=$cloudManifest.Count; bytes=(Get-Item -LiteralPath $cloudZip).Length; sha256=(Get-FileHash -LiteralPath $cloudZip).Hash; verified=$true} | ConvertTo-Json -Compress
