param(
    [Parameter(Mandatory = $false)]
    [string]$ProviderId = "custom",

    [Parameter(Mandatory = $false)]
    [int]$Port = 17892,

    [Parameter(Mandatory = $false)]
    [switch]$SkipCodexConfig
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "codex-config.ps1")

$TaskName = "Codex DeepSeek Media Proxy"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$StateDir = Join-Path $env:LOCALAPPDATA "CodexDeepSeekMediaProxy"
$MetadataFile = Join-Path $StateDir "install.json"
$RunScript = Join-Path $PSScriptRoot "run-service.ps1"
$ConfigPath = Join-Path $env:USERPROFILE ".codex\config.toml"
$ProxyBaseUrl = "http://127.0.0.1:$Port"
$HealthUrl = "$ProxyBaseUrl/__media_proxy/health"
$User = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    throw "Node.js is not available on PATH"
}
if (-not (Test-Path -LiteralPath $RunScript)) {
    throw "Run script is missing: $RunScript"
}

New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
}
$pidFile = Join-Path $StateDir "proxy.pid"
if (Test-Path -LiteralPath $pidFile) {
    $pidValue = [int](Get-Content -Raw -LiteralPath $pidFile).Trim()
    $process = Get-CimInstance Win32_Process `
        -Filter "ProcessId = $pidValue" `
        -ErrorAction SilentlyContinue
    if ($process) {
        $commandLine = [string]$process.CommandLine
        if (
            $commandLine.Contains("src\cli.js") -and
            $commandLine.Contains($ProjectRoot)
        ) {
            Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$originalBaseUrl = $null
if (Test-Path -LiteralPath $MetadataFile) {
    try {
        $existingMetadata = Get-Content -Raw -LiteralPath $MetadataFile | ConvertFrom-Json
        if ($existingMetadata.originalBaseUrl) {
            $originalBaseUrl = [string]$existingMetadata.originalBaseUrl
        }
    } catch {}
}

$systemPowerShell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
if (-not (Test-Path -LiteralPath $systemPowerShell)) {
    $systemPowerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
}

$arguments = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy Bypass',
    '-WindowStyle Hidden',
    "-File `"$RunScript`"",
    "-Port $Port"
) -join " "

$action = New-ScheduledTaskAction `
    -Execute $systemPowerShell `
    -Argument $arguments `
    -WorkingDirectory $ProjectRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $User
$principal = New-ScheduledTaskPrincipal `
    -UserId $User `
    -LogonType Interactive `
    -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew `
    -Hidden

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "Local DeepSeek Files API adapter for Codex image-heavy Responses requests." `
    -Force | Out-Null

Start-ScheduledTask -TaskName $TaskName

$healthy = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    Start-Sleep -Milliseconds 500
    try {
        $health = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 2
        if ($health.service -eq "codex-deepseek-media-proxy") {
            $healthy = $true
            break
        }
    } catch {}
}
if (-not $healthy) {
    throw "Scheduled proxy did not become healthy. Check Task Scheduler history and $StateDir\logs."
}

$previousBaseUrl = $null
$backupPath = $null
if (-not $SkipCodexConfig) {
    $previousBaseUrl = Get-CodexProviderBaseUrl -Path $ConfigPath -ProviderId $ProviderId
    if (-not $originalBaseUrl -and $previousBaseUrl -ne $ProxyBaseUrl) {
        $originalBaseUrl = $previousBaseUrl
    }
    $result = Set-CodexProviderBaseUrl `
        -Path $ConfigPath `
        -ProviderId $ProviderId `
        -BaseUrl $ProxyBaseUrl
    if ($result.Changed) {
        $backupPath = $result.BackupPath
    }
}

$metadata = [pscustomobject]@{
    taskName = $TaskName
    projectRoot = $ProjectRoot
    providerId = $ProviderId
    port = $Port
    proxyBaseUrl = $ProxyBaseUrl
    configPath = $ConfigPath
    originalBaseUrl = $originalBaseUrl
    configBackupPath = $backupPath
    installedAt = (Get-Date).ToString("o")
}
$metadata | ConvertTo-Json | Set-Content -LiteralPath $MetadataFile -Encoding UTF8

Write-Output ""
Write-Output "Installed and healthy."
Write-Output "Task: $TaskName"
Write-Output "Proxy: $ProxyBaseUrl"
Write-Output "Health: $HealthUrl"
if (-not $SkipCodexConfig) {
    Write-Output "Codex provider: $ProviderId -> $ProxyBaseUrl"
}
Write-Output "Restart Codex once, then new or forked tasks will use the proxy."
