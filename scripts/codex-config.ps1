function Get-CodexProviderBaseUrl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $false)]
        [string]$ProviderId = "custom"
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Codex config file does not exist: $Path"
    }

    $sectionName = "model_providers.$ProviderId"
    $section = $null
    $inSection = $false

    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*\[([^\]]+)\]\s*$') {
            $current = $matches[1].Trim()
            if ($current -eq $sectionName) {
                $inSection = $true
                $section = $current
                continue
            }
            if ($inSection) {
                break
            }
        }

        if ($inSection -and $line -match '^\s*base_url\s*=\s*"([^"]*)"\s*$') {
            return $matches[1]
        }
    }

    if (-not $section) {
        throw "Codex config does not contain [$sectionName]"
    }
    return $null
}

function Set-CodexProviderBaseUrl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$BaseUrl,

        [Parameter(Mandatory = $false)]
        [string]$ProviderId = "custom",

        [Parameter(Mandatory = $false)]
        [switch]$NoBackup
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Codex config file does not exist: $Path"
    }

    $sectionName = "model_providers.$ProviderId"
    $lines = [System.Collections.Generic.List[string]]::new()
    foreach ($line in Get-Content -LiteralPath $Path) {
        $lines.Add($line)
    }

    $sectionStart = -1
    $sectionEnd = $lines.Count
    for ($index = 0; $index -lt $lines.Count; $index++) {
        if ($lines[$index] -match '^\s*\[([^\]]+)\]\s*$') {
            $current = $matches[1].Trim()
            if ($sectionStart -ge 0) {
                $sectionEnd = $index
                break
            }
            if ($current -eq $sectionName) {
                $sectionStart = $index
            }
        }
    }

    if ($sectionStart -lt 0) {
        throw "Codex config does not contain [$sectionName]"
    }

    $baseIndex = -1
    $previousBaseUrl = $null
    for ($index = $sectionStart + 1; $index -lt $sectionEnd; $index++) {
        if ($lines[$index] -match '^\s*base_url\s*=\s*"([^"]*)"\s*$') {
            $baseIndex = $index
            $previousBaseUrl = $matches[1]
            break
        }
    }

    if ($baseIndex -ge 0) {
        $lines[$baseIndex] = "base_url = `"$BaseUrl`""
    } else {
        $lines.Insert($sectionStart + 1, "base_url = `"$BaseUrl`"")
    }

    $changed = $previousBaseUrl -ne $BaseUrl
    if (-not $changed) {
        return [pscustomobject]@{
            Changed = $false
            PreviousBaseUrl = $previousBaseUrl
            BackupPath = $null
        }
    }

    $backupPath = $null
    if (-not $NoBackup) {
        $backupPath = "$Path.bak-media-proxy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item -LiteralPath $Path -Destination $backupPath
    }

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText(
        $Path,
        (($lines -join [Environment]::NewLine) + [Environment]::NewLine),
        $utf8
    )

    return [pscustomobject]@{
        Changed = $true
        PreviousBaseUrl = $previousBaseUrl
        BackupPath = $backupPath
    }
}

function Restore-CodexProviderBaseUrl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$ExpectedCurrentUrl,

        [Parameter(Mandatory = $true)]
        [string]$OriginalUrl,

        [Parameter(Mandatory = $false)]
        [string]$ProviderId = "custom"
    )

    $current = Get-CodexProviderBaseUrl -Path $Path -ProviderId $ProviderId
    if ($current -ne $ExpectedCurrentUrl) {
        return [pscustomobject]@{
            Restored = $false
            Reason = "base_url has changed since installation"
            CurrentBaseUrl = $current
        }
    }

    $result = Set-CodexProviderBaseUrl `
        -Path $Path `
        -ProviderId $ProviderId `
        -BaseUrl $OriginalUrl
    return [pscustomobject]@{
        Restored = $result.Changed
        Reason = $null
        CurrentBaseUrl = $OriginalUrl
        BackupPath = $result.BackupPath
    }
}
