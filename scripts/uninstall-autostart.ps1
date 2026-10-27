param(
    [Parameter(Mandatory = $false)]
    [switch]$KeepCodexConfig,

    [Parameter(Mandatory = $false)]
    [switch]$KeepFiles
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "codex-config.ps1")

$TaskName = "Codex DeepSeek Media Proxy"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$StateDir = Join-Path $env:LOCALAPPDATA "CodexDeepSeekMediaProxy"
$MetadataFile = Join-Path $StateDir "install.json"
$PidFile = Join-Path $StateDir "proxy.pid"

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
}

if (Test-Path -LiteralPath $PidFile) {
    $pidValue = [int](Get-Content -Raw -LiteralPath $PidFile).Trim()
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $pidValue" -ErrorAction SilentlyContinue
    if ($process) {
        $commandLine = [string]$process.CommandLine
        if (
            $commandLine.Contains("src\cli.js") -and
            $commandLine.Contains($ProjectRoot)
        ) {
            Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
        } else {
            Write-Warning "Not stopping PID $pidValue because it does not match the media proxy command line."
        }
    }
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

if ($task) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

if (-not $KeepCodexConfig -and (Test-Path -LiteralPath $MetadataFile)) {
    $metadata = Get-Content -Raw -LiteralPath $MetadataFile | ConvertFrom-Json
    if ($metadata.originalBaseUrl) {
        $configPath = [string]$metadata.configPath
        if (Test-Path -LiteralPath $configPath) {
            $restore = Restore-CodexProviderBaseUrl `
                -Path $configPath `
                -ProviderId ([string]$metadata.providerId) `
                -ExpectedCurrentUrl ([string]$metadata.proxyBaseUrl) `
                -OriginalUrl ([string]$metadata.originalBaseUrl)
            if ($restore.Restored) {
                Write-Output "Restored Codex base_url to $($metadata.originalBaseUrl)"
            } else {
                Write-Warning "Codex base_url was left unchanged: $($restore.Reason)"
            }
        }
    }
}

if (-not $KeepFiles) {
    Remove-Item -LiteralPath $MetadataFile -Force -ErrorAction SilentlyContinue
}

Write-Output "Scheduled task removed."
Write-Output "Restart Codex for provider routing changes to take effect."
