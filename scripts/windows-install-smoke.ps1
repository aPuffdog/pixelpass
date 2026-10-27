param(
    [Parameter(Mandatory = $false)]
    [int]$Port = 17992
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$TaskName = "Codex DeepSeek Media Proxy"
$ConfigDirectory = Join-Path $env:USERPROFILE ".codex"
$ConfigPath = Join-Path $ConfigDirectory "config.toml"
$ProviderId = "pixelpass-smoke"
$HealthUrl = "http://127.0.0.1:$Port/__media_proxy/health"
$ConfigExisted = Test-Path -LiteralPath $ConfigPath
$OriginalConfig = if ($ConfigExisted) {
    [System.IO.File]::ReadAllText($ConfigPath)
} else {
    $null
}

function Wait-ForProxy {
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 500
        try {
            $health = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 2
            if ($health.service -eq "codex-deepseek-media-proxy") {
                return
            }
        } catch {}
    }
    throw "Proxy did not become healthy at $HealthUrl"
}

function Wait-ForProxyStop {
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 250
        try {
            Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 1 | Out-Null
        } catch {
            return
        }
    }
    throw "Proxy remained reachable at $HealthUrl after stop"
}

function Invoke-PixelPass {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

    & (Join-Path $ProjectRoot "pixelpass.cmd") @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "pixelpass.cmd $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

try {
    New-Item -ItemType Directory -Force -Path $ConfigDirectory | Out-Null
    $smokeConfig = @"
model_provider = "$ProviderId"

[model_providers.$ProviderId]
name = "PixelPass smoke test"
base_url = "https://api.deepseek.com"
wire_api = "responses"
"@
    [System.IO.File]::WriteAllText(
        $ConfigPath,
        $smokeConfig,
        (New-Object System.Text.UTF8Encoding($false))
    )

    Invoke-PixelPass @(
        "on",
        "-ProviderId",
        $ProviderId,
        "-Port",
        [string]$Port
    )
    Wait-ForProxy

    $configured = [System.IO.File]::ReadAllText($ConfigPath)
    $proxyUrl = "http://127.0.0.1:$Port"
    if (-not $configured.Contains("base_url = `"$proxyUrl`"")) {
        throw "Installer did not route provider $ProviderId to $proxyUrl"
    }

    Invoke-PixelPass status
    Invoke-PixelPass stop
    Wait-ForProxyStop
    Invoke-PixelPass start
    Wait-ForProxy
    Invoke-PixelPass off

    $restored = [System.IO.File]::ReadAllText($ConfigPath)
    if (-not $restored.Contains('base_url = "https://api.deepseek.com"')) {
        throw "Uninstall did not restore the original provider base_url"
    }
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        throw "Scheduled task remained after uninstall"
    }

    Write-Output "Windows install, status, stop, start, and off smoke test passed."
} finally {
    try {
        & (Join-Path $ProjectRoot "pixelpass.cmd") off *> $null
    } catch {}

    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    }

    if ($ConfigExisted) {
        [System.IO.File]::WriteAllText(
            $ConfigPath,
            $OriginalConfig,
            (New-Object System.Text.UTF8Encoding($false))
        )
    } else {
        Remove-Item -LiteralPath $ConfigPath -Force -ErrorAction SilentlyContinue
    }
}
