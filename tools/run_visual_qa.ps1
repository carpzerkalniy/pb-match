param(
    [ValidatePattern('^[a-zA-Z0-9-]+$')][string]$RunName = 'current',
    [ValidateSet('swipes','gallery')][string]$Mode = 'swipes',
    [string]$NodeModulesPath,
    [string]$BrowsersPath
)
$ErrorActionPreference = 'Stop'
$qaNode = (Get-Command node -ErrorAction Stop).Source
if (!$NodeModulesPath) {
    $qaNodeRoot = Split-Path -Parent (Split-Path -Parent $qaNode)
    $NodeModulesPath = Join-Path $qaNodeRoot 'node_modules'
    if (!(Test-Path -LiteralPath (Join-Path $NodeModulesPath 'playwright/package.json'))) {
        $NodeModulesPath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
    }
}
if (!(Test-Path -LiteralPath (Join-Path $NodeModulesPath 'playwright/package.json'))) {
    throw 'Playwright is missing. Pass -NodeModulesPath from load_workspace_dependencies.'
}
if (!$BrowsersPath) { $BrowsersPath = Join-Path $env:USERPROFILE 'AppData/Local/ms-playwright' }
if (!(Test-Path -LiteralPath $BrowsersPath)) {
    throw 'Chromium cache is missing. Pass -BrowsersPath for the installed Playwright browsers.'
}
$env:NODE_PATH = (Resolve-Path -LiteralPath $NodeModulesPath).Path
$env:PLAYWRIGHT_BROWSERS_PATH = (Resolve-Path -LiteralPath $BrowsersPath).Path
if ($Mode -eq 'gallery') { & $qaNode (Join-Path $PSScriptRoot 'check_swipe_browser.cjs') $RunName 'gallery-only' }
else { & $qaNode (Join-Path $PSScriptRoot 'check_swipe_browser.cjs') $RunName }
exit $LASTEXITCODE
