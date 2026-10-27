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

### 让 AI 帮你安装

如果使用的 AI 可以读取终端并执行命令，可以复制下面的提示。AI 会先检查系统、Node.js 和 Codex provider，得到确认后才修改配置，并且不会索取 API Key。

<details>
<summary>展开中文 / English AI 安装提示</summary>

**简体中文**

```text
你是一名谨慎的安装助手。请在这台电脑上安装并验收“DeepSeek Image Cache Proxy”。
目标是让 Codex 的 DeepSeek Responses 请求经过本机 127.0.0.1:17892 代理；
安装完成后由我手动完全退出并重新打开 Codex。

先只做检查，不要修改任何文件：
1. 判断系统是 macOS 还是 Windows 10/11。
2. 检查 Node.js 版本是否不低于 22.15，并确认 node 命令可用。
3. 检查 ~/.codex/config.toml，Windows 为 %USERPROFILE%\.codex\config.toml，
   找出当前用于 DeepSeek 的 model_providers.<id>。
4. 把系统、Node 版本、准备使用的 provider 名称和将执行的命令告诉我，
   等我确认后再继续。

不要要求我粘贴 API Key，不要输出 Authorization、密钥或其他敏感内容。

我确认后：
- 从 https://github.com/aPuffdog/pixelpass/releases/latest 下载对应系统的正式包：
  macOS 使用 *-macos.tar.gz，Windows 使用 *-windows.zip。
- 同时下载对应的 .sha256 并验证。
- 解压到固定且可写的目录，不要只放在临时目录。
- macOS：进入解压后的 pixelpass 目录，运行 sh ./install.sh，
  然后运行 ./pixelpass status。
- Windows：在解压后的 pixelpass 目录打开 PowerShell，运行
  .\pixelpass.cmd on -ProviderId <上面确认的 provider 名称>，
  然后运行 .\pixelpass.cmd status。
- 确认健康检查通过，然后提醒我完全退出并重新打开 Codex。

如果安装失败，不要删除配置、备份或强制重置。停止后续步骤，
提供 status、健康检查和日志中的关键错误，并告诉我如何恢复。
需要恢复直连时：macOS 运行 ./pixelpass off，
Windows 运行 .\pixelpass.cmd off。
```

**English**

```text
You are a careful installation assistant. Install and verify “DeepSeek Image Cache Proxy”
on this computer. Route Codex's DeepSeek Responses requests through a localhost proxy at
127.0.0.1:17892. I will fully quit and reopen Codex manually after installation.

First, inspect only and do not modify files:
1. Determine whether this is macOS or Windows 10/11.
2. Check that Node.js is version 22.15 or newer and that the node command works.
3. Inspect ~/.codex/config.toml, or %USERPROFILE%\.codex\config.toml on Windows,
   and find the model_providers.<id> currently used for DeepSeek.
4. Show me the operating system, Node.js version, provider name, and commands you plan
   to run. Wait for my confirmation before continuing.

Never ask me to paste an API key, and never print Authorization headers, keys, or other secrets.

After I confirm:
- Download the matching package from https://github.com/aPuffdog/pixelpass/releases/latest:
  use *-macos.tar.gz on macOS and *-windows.zip on Windows.
- Download the matching .sha256 file and verify it before installation.
- Extract the package to a permanent, writable directory.
- macOS: enter the extracted pixelpass directory, run sh ./install.sh,
  then run ./pixelpass status.
- Windows: open PowerShell in the extracted pixelpass directory, run
  .\pixelpass.cmd on -ProviderId <the confirmed provider name>,
  then run .\pixelpass.cmd status.
- Confirm that the health check passes, then tell me to fully quit and reopen Codex.

If installation fails, do not delete configuration, backups, or force a reset. Stop further
changes, provide the relevant errors from status, health checks, and logs, and explain recovery.
To restore direct routing: run ./pixelpass off on macOS or .\pixelpass.cmd off on Windows.
```

</details>

两个平台包都会经过对应系统的 CI。Windows 发布任务会在 `windows-latest` 上实际执行 `on → status → stop → start → off`，验证计划任务、健康检查、配置切换与恢复。

---

### English

The image stays; the request gets lighter. This release ships distinct macOS and Windows packages.

**Requirements:** Node.js 22.15+ and a DeepSeek Responses provider already configured in Codex.

**macOS:** extract the TAR.GZ, run `sh ./install.sh` inside `pixelpass`, then fully restart Codex. Use `./pixelpass off` to restore direct routing.

**Windows 10/11:** extract the ZIP, open PowerShell in the `pixelpass` folder, and run `.\pixelpass.cmd on -ProviderId custom`. Replace `custom` with the actual provider name from `%USERPROFILE%\.codex\config.toml`, then fully restart Codex. Use `.\pixelpass.cmd off` to restore direct routing and stop the proxy.

Use the matching `.sha256` asset to verify each download.
