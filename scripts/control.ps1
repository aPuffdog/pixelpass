param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet("on", "off", "status", "start", "stop", "restart")]
    [string]$Action,

    [Parameter(Mandatory = $false)]
    [string]$ProviderId = "custom",

    [Parameter(Mandatory = $false)]
    [int]$Port = 17892
)

$ErrorActionPreference = "Stop"

switch ($Action) {
    "on" {
        & (Join-Path $PSScriptRoot "install-autostart.ps1") `
            -ProviderId $ProviderId `
            -Port $Port
    }
    "off" {
        & (Join-Path $PSScriptRoot "uninstall-autostart.ps1")
        Write-Output ""
        Write-Output "Proxy is off and Codex routing was restored when possible."
    }
    "status" {
        & (Join-Path $PSScriptRoot "status.ps1")
    }
    "start" {
        & (Join-Path $PSScriptRoot "service.ps1") -Action start
    }
    "stop" {
        & (Join-Path $PSScriptRoot "service.ps1") -Action stop
        Write-Output "This stops only the proxy. Use 'pixelpass.cmd off' to restore Codex routing."
    }
    "restart" {
        & (Join-Path $PSScriptRoot "service.ps1") -Action restart
    }
}
