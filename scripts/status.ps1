$ErrorActionPreference = "Continue"
. (Join-Path $PSScriptRoot "codex-config.ps1")

$TaskName = "Codex DeepSeek Media Proxy"
$StateDir = Join-Path $env:LOCALAPPDATA "CodexDeepSeekMediaProxy"
$MetadataFile = Join-Path $StateDir "install.json"
$ConfigPath = Join-Path $env:USERPROFILE ".codex\config.toml"
$Port = 17892
$ProviderId = "custom"

if (Test-Path -LiteralPath $MetadataFile) {
    try {
        $metadata = Get-Content -Raw -LiteralPath $MetadataFile | ConvertFrom-Json
        if ($metadata.port) {
            $Port = [int]$metadata.port
        }
        if ($metadata.providerId) {
            $ProviderId = $metadata.providerId
        }
    } catch {}
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$taskInfo = $null
if ($task) {
    $taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction SilentlyContinue
}

$health = $null
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/__media_proxy/health" -TimeoutSec 3
} catch {}

$baseUrl = $null
try {
    $baseUrl = Get-CodexProviderBaseUrl -Path $ConfigPath -ProviderId $ProviderId
} catch {}

[pscustomobject]@{
    TaskInstalled = [bool]$task
    TaskState = if ($taskInfo) { $taskInfo.State.ToString() } else { $null }
    TaskLastResult = if ($taskInfo) { $taskInfo.LastTaskResult } else { $null }
    ProxyHealthy = [bool]($health -and $health.service -eq "codex-deepseek-media-proxy")
    ProxyUrl = "http://127.0.0.1:$Port"
    CodexProvider = $ProviderId
    CodexBaseUrl = $baseUrl
    StateDirectory = $StateDir
} | Format-List

if ($health -and $health.service -eq "codex-deepseek-media-proxy") {
    Write-Output ""
    Invoke-RestMethod -Uri "http://127.0.0.1:$Port/__media_proxy/stats" -TimeoutSec 3 |
        ConvertTo-Json -Depth 6
}
