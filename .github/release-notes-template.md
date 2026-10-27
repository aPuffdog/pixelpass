## DeepSeek Image Cache Proxy v{{VERSION}}

让图片只上传一次，让长对话继续前行。此版本提供明确的 macOS 与 Windows 发布包。

### 下载

| 平台 | 下载 | 安装方式 |
|---|---|---|
| macOS | [`pixelpass-v{{VERSION}}-macos.tar.gz`](https://github.com/aPuffdog/pixelpass/releases/download/v{{VERSION}}/pixelpass-v{{VERSION}}-macos.tar.gz) | LaunchAgent |
| Windows 10/11 | [`pixelpass-v{{VERSION}}-windows.zip`](https://github.com/aPuffdog/pixelpass/releases/download/v{{VERSION}}/pixelpass-v{{VERSION}}-windows.zip) | PowerShell + Task Scheduler |

要求：Node.js 22.15+，且 Codex 已配置 DeepSeek Responses provider。

### macOS

```bash
tar -xzf pixelpass-v{{VERSION}}-macos.tar.gz
cd pixelpass
sh ./install.sh
./pixelpass status
```

完全退出并重新打开 Codex，然后新建或 fork 一个任务。恢复直连：`./pixelpass off`。

### Windows

解压 ZIP 后，在 `pixelpass` 文件夹打开 PowerShell：

```powershell
.\pixelpass.cmd on -ProviderId custom
.\pixelpass.cmd status
```

把 `custom` 换成 `%USERPROFILE%\.codex\config.toml` 中实际的 DeepSeek provider 名称。安装后完全退出并重新打开 Codex。恢复直连并关闭代理：

```powershell
.\pixelpass.cmd off
```

`stop` 只停止代理；完整关闭整套路由请使用 `off`。

两个平台包都会经过对应系统的 CI。Windows 发布任务会在 `windows-latest` 上实际执行 `on → status → stop → start → off`，验证计划任务、健康检查、配置切换与恢复。

---

### English

The image stays; the request gets lighter. This release ships distinct macOS and Windows packages.

**Requirements:** Node.js 22.15+ and a DeepSeek Responses provider already configured in Codex.

**macOS:** extract the TAR.GZ, run `sh ./install.sh` inside `pixelpass`, then fully restart Codex. Use `./pixelpass off` to restore direct routing.

**Windows 10/11:** extract the ZIP, open PowerShell in the `pixelpass` folder, and run `.\pixelpass.cmd on -ProviderId custom`. Replace `custom` with the actual provider name from `%USERPROFILE%\.codex\config.toml`, then fully restart Codex. Use `.\pixelpass.cmd off` to restore direct routing and stop the proxy.

Use the matching `.sha256` asset to verify each download.
