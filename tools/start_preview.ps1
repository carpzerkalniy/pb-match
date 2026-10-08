param([ValidateRange(1024, 65535)][int]$Port = 8765)

$ErrorActionPreference = 'Stop'
$previewProjectRoot = Split-Path -Parent $PSScriptRoot
$previewServerFile = Join-Path $PSScriptRoot 'dev_server.py'
$previewUrl = "http://127.0.0.1:$Port/scenarios/?map=1"

# Reuse an existing listener; never stop or replace an unrelated process.
$previewListener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($previewListener) {
    $previewExistingResponse = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 5
    if ($previewExistingResponse.StatusCode -ne 200 -or $previewExistingResponse.Content -notmatch 'gallery.js') {
        throw "Port $Port is occupied by a different service."
    }
    Write-Output "Preview is already available: $previewUrl"
    return
}

$previewPythonExe = (Get-Command python -ErrorAction Stop).Source
$previewLogs = Join-Path $previewProjectRoot 'outputs/preview'
New-Item -ItemType Directory -Path $previewLogs -Force | Out-Null
$previewProcess = Start-Process -FilePath $previewPythonExe `
    -ArgumentList @('-u', ('"' + $previewServerFile + '"'), '--port', "$Port") `
    -WorkingDirectory $previewProjectRoot -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $previewLogs 'server.stdout.log') `
    -RedirectStandardError (Join-Path $previewLogs 'server.stderr.log')

for ($previewAttempt = 0; $previewAttempt -lt 10; $previewAttempt++) {
    if ($previewProcess.HasExited) {
        throw "Preview server stopped. See outputs/preview/server.stderr.log."
    }
    try {
        $previewResponse = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 1
        if ($previewResponse.StatusCode -eq 200 -and $previewResponse.Content -match 'gallery.js') {
            Write-Output "Preview ready (PID $($previewProcess.Id)): $previewUrl"
            return
        }
    } catch {
        # The single server process may still be starting; do not spawn more.
    }
    Start-Sleep -Milliseconds 200
}
throw "Preview did not respond. See outputs/preview/server.stderr.log."
