param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action
)

$ErrorActionPreference = "Stop"
$TaskName = "Codex DeepSeek Media Proxy"
$StateDir = Join-Path $env:LOCALAPPDATA "CodexDeepSeekMediaProxy"
$PidFile = Join-Path $StateDir "proxy.pid"
$MetadataFile = Join-Path $StateDir "install.json"

function Get-Port {
    if (Test-Path -LiteralPath $MetadataFile) {
        try {
            $metadata = Get-Content -Raw -LiteralPath $MetadataFile | ConvertFrom-Json
            if ($metadata.port) {
                return [int]$metadata.port
            }
        } catch {}
    }
    return 17892
}

function Wait-Healthy {
    param([int]$Port)
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        Start-Sleep -Milliseconds 500
        try {
            $health = Invoke-RestMethod `
                -Uri "http://127.0.0.1:$Port/__media_proxy/health" `
                -TimeoutSec 2
            if ($health.service -eq "codex-deepseek-media-proxy") {
                return $health
            }
        } catch {}
    }
    throw "Proxy did not become healthy on port $Port"
}

function Stop-ProxyProcess {
    if (-not (Test-Path -LiteralPath $PidFile)) {
        return
    }
    $pidValue = [int](Get-Content -Raw -LiteralPath $PidFile).Trim()
    $process = Get-CimInstance Win32_Process `
        -Filter "ProcessId = $pidValue" `
        -ErrorAction SilentlyContinue
    if ($process) {
        $projectRoot = Split-Path -Parent $PSScriptRoot
        $commandLine = [string]$process.CommandLine
        if (
            $commandLine.Contains("src\cli.js") -and
            $commandLine.Contains($projectRoot)
        ) {
            Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
        } else {
            Write-Warning "Not stopping PID $pidValue because its command line does not match this proxy."
        }
    }
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$port = Get-Port

switch ($Action) {
    "start" {
        if (-not $task) {
            throw "Autostart task is not installed. Run install.cmd first."
        }
        Start-ScheduledTask -TaskName $TaskName
        $health = Wait-Healthy -Port $port
        Write-Output "Proxy healthy: http://127.0.0.1:$port ($($health.service))"
    }
    "stop" {
        if ($task) {
            Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        }
        Stop-ProxyProcess
        Write-Output "Proxy stopped."
    }
    "restart" {
        if ($task) {
            Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        }
        Stop-ProxyProcess
        Start-Sleep -Seconds 1
        if (-not $task) {
            throw "Autostart task is not installed. Run install.cmd first."
        }
        Start-ScheduledTask -TaskName $TaskName
        $health = Wait-Healthy -Port $port
        Write-Output "Proxy restarted: http://127.0.0.1:$port ($($health.service))"
    }
    "status" {
        & (Join-Path $PSScriptRoot "status.ps1")
    }
}
