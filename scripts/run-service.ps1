param(
    [Parameter(Mandatory = $false)]
    [string]$ListenHost = "127.0.0.1",

    [Parameter(Mandatory = $false)]
    [int]$Port = 17892
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$StateDir = Join-Path $env:LOCALAPPDATA "CodexDeepSeekMediaProxy"
$LogDir = Join-Path $StateDir "logs"
$PidFile = Join-Path $StateDir "proxy.pid"
$OutLog = Join-Path $LogDir "proxy.out.log"
$ErrorLog = Join-Path $LogDir "proxy.err.log"
$HealthUrl = "http://${ListenHost}:${Port}/__media_proxy/health"

New-Item -ItemType Directory -Force -Path $StateDir, $LogDir | Out-Null

function Get-ProxyHealth {
    try {
        return Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 2
    } catch {
        return $null
    }
}

while ($true) {
    $health = Get-ProxyHealth
    if ($null -ne $health) {
        if ($health.service -eq "codex-deepseek-media-proxy") {
            Write-Output "proxy already healthy at $HealthUrl"
            exit 0
        }
        throw "Port $Port is serving a different application"
    }

    foreach ($path in @($OutLog, $ErrorLog)) {
        if ((Test-Path -LiteralPath $path) -and (Get-Item -LiteralPath $path).Length -gt 10MB) {
            Move-Item -LiteralPath $path -Destination "$path.1" -Force
        }
    }

    $node = Get-Command node.exe -ErrorAction Stop
    $cli = Join-Path $ProjectRoot "src\cli.js"
    if (-not (Test-Path -LiteralPath $cli)) {
        throw "Proxy entry point is missing: $cli"
    }

    $oldPort = $env:MEDIA_PROXY_PORT
    $oldHost = $env:MEDIA_PROXY_HOST
    $oldDataDir = $env:MEDIA_PROXY_DATA_DIR
    $env:MEDIA_PROXY_PORT = [string]$Port
    $env:MEDIA_PROXY_HOST = $ListenHost
    $env:MEDIA_PROXY_DATA_DIR = Join-Path $StateDir "data"
    try {
        $process = Start-Process `
            -FilePath $node.Source `
            -ArgumentList @("`"$cli`"") `
            -WorkingDirectory $ProjectRoot `
            -WindowStyle Hidden `
            -RedirectStandardOutput $OutLog `
            -RedirectStandardError $ErrorLog `
            -PassThru
    } finally {
        $env:MEDIA_PROXY_PORT = $oldPort
        $env:MEDIA_PROXY_HOST = $oldHost
        $env:MEDIA_PROXY_DATA_DIR = $oldDataDir
    }

    Set-Content -LiteralPath $PidFile -Value $process.Id -Encoding ASCII

    $started = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 500
        $process.Refresh()
        if ($process.HasExited) {
            break
        }
        $health = Get-ProxyHealth
        if ($null -ne $health -and $health.service -eq "codex-deepseek-media-proxy") {
            $started = $true
            break
        }
    }

    if (-not $started) {
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5
        continue
    }

    Wait-Process -Id $process.Id
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
}
