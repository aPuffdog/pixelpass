const copyToast = document.querySelector("#copy-toast");
const translations = {
  "zh-CN": {
    skip: "跳到主要内容", navLabel: "主导航", navHow: "工作原理", navDownload: "下载安装", navFaq: "常见问题",
    eyebrow: "为 Codex × DeepSeek 而做", heroLine1: "图片还在。", heroLine2: "请求更轻。",
    heroDescription: "把已上传的历史图片换成 DeepSeek 文件引用。让长图片会话继续向前，少被 413 打断。",
    downloadMac: "下载 macOS 版", downloadWindows: "下载 Windows 版", scriptPackages: "脚本安装包", viewInstall: "查看安装步骤 ↘",
    pointLocal: "本机运行", pointQuality: "原始图片画质", pointControl: "随时恢复直连",
    heroArtAlt: "历史 A 和新 B 仍从 Codex 发到代理；A 复用旧 ID，B 上传获得新 ID，DeepSeek 读取两个文件",
    artCurrent: "下一轮请求", artHistory: "历史图片", artNew: "新图片", artLocalHop: "Codex → 本机代理，仍携带图片字节", artProxy: "本机图片缓存代理", artHit: "命中已有上传", artReuse: "复用", artUpload: "上传至 /files", artReturns: "DS 返回", artUpstreamHop: "代理 → DeepSeek，图片改用文件引用", artResolves: "DeepSeek 读取已存图片，模型仍能理解 A 和 B。", artFootnote: "文件 ID 由 DeepSeek 生成，哈希只负责查找。",
    proofLabel: "一次真实会话的观测结果", proofEyebrow: "来自一次真实图片会话", proofScope: "比较改写前后的上游 Responses 请求体；不含单独的图片文件上传。", metricReduction: "单次请求体减少", metricImagesUnit: " 张", metricImages: "该次请求中的图片", metricQuality: "保留全部图片输入", metricHits: "累计图片缓存复用次数", metricSample: "455 次请求的观测样本",
    howEyebrow: "01 / 原理", howTitle: "DeepSeek 已有能力，代理接上流程。", howIntro: "当前接入路径会再次发送历史 Base64 图片。代理补齐上传、记住 ID、下次复用这三个环节。",
    step1Title: "首次出现，上传原图", step1Body: "代理解码并计算图片哈希。没有有效映射时，调用 DeepSeek Files API 上传原始字节。", step2Title: "DeepSeek 返回文件 ID", step2Body: "DeepSeek 保存图片并返回 id。代理在本机持久化“凭证指纹 + 图片哈希 → file_id”。", step3Title: "历史再出现，直接复用", step3Body: "下一轮的 A 命中旧记录，只上传新 B。Responses 改用两个文件 ID，DeepSeek 依然读取完整图片。",
    diagramKicker: "完整生命周期图", diagramTitle: "跟着同一张 A，看两轮请求如何变化", diagramCaption: "“重复”指当前请求再次携带与历史上传字节完全相同的图片。重启保留映射；默认请求 30 天有效期，过期后在图片下次出现时重新上传。", diagramOpen: "打开完整大图 ↗",
    downloadEyebrow: "02 / 下载", downloadTitle: "选好平台，就能开始。", downloadIntro: "开源、无额外 npm 依赖。先准备 Node.js 22.15+ 和已配置 DeepSeek 的 Codex。", macType: "LaunchAgent · 统一控制命令", macDescription: "安装时启动本机代理、备份 Codex 配置并接入代理路由。登录后自动启动。", macArchive: "正式发布包 · 含 install.sh", checksum: "SHA-256 校验", macSteps: "查看 macOS 安装步骤 →", winType: "PowerShell · 计划任务脚本", winDescription: "下载正式 Windows ZIP，使用 pixelpass.cmd 完成安装、状态检查和恢复直连。计划任务在登录后启动。", winArchive: "正式发布包 · 含 pixelpass.cmd", winScript: "Windows 脚本支持", winSteps: "查看 Windows 安装步骤 →", downloadNote: "两种下载都是独立发布包，包含可阅读的安装脚本；需 Node.js 运行环境。安装后请保留解压目录。", allReleases: "所有版本 ↗",
    quickTitle: "从下载到接入，只需三步。", platformLabel: "安装平台", macStep1: "解压并打开终端", macStep1Body: "解压下载的 TAR.GZ，将得到的 pixelpass 文件夹放到固定位置。在这个文件夹内打开终端。", macStep2: "运行安装脚本", macStep2Body: "脚本会备份配置、启动代理，并把当前 DeepSeek provider 的 base_url 指向本机。", restartTitle: "重开 Codex，再检查状态", macStep3Body: "完全退出并重新打开 Codex，然后新建或 fork 一个任务。检查代理和路由：", copy: "复制", restoreTitle: "需要恢复直连？", macRestore: "恢复 Codex 直连并关闭代理。再次启用用 ./pixelpass on，之后重开 Codex。",
    winStep1: "解压并打开 PowerShell", winStep1Body: "将 ZIP 解压到固定目录，在解压后的项目文件夹打开 PowerShell。确认 node.exe 已在 PATH 中。", winStep2: "指定已有 provider，运行安装", winStep2Body: "把 custom 换成 Codex config.toml 中 DeepSeek provider 的实际名称。脚本会注册计划任务、备份并修改该 provider 的地址。", winStep3Body: "完全退出并重新打开 Codex，再新建或 fork 任务。在项目目录检查代理和路由：", winRestore: "关闭代理并按安装记录恢复 Codex 配置，之后重开 Codex。stop 只停止服务，不恢复路由。", prerequisiteLabel: "准备好环境：", providerGuide: "DeepSeek provider 配置与完整文档 ↗",
    aiKicker: "AI 安装助手 · 可复制", aiTitle: "不想手动操作？把这段提示交给 AI。", aiIntro: "适合能读取终端并执行命令的 AI。它会先检查系统、Node.js 和 Codex provider，得到确认后才修改配置。", aiSafety: "不会要求你粘贴 API Key；安装失败时会停止并给出诊断与恢复方法。", copyPrompt: "复制给 AI", starTitle: "如果它帮你避免了一次 413", starBody: "欢迎在 GitHub 点一个 Star。完全自愿，不影响任何功能。", starAction: "在 GitHub 点 Star",
    faqEyebrow: "03 / 你可能还想知道", faqTitle: "开始之前，心里有底。", issueLink: "反馈问题 ↗", faq1Q: "它压缩图片，还是删除历史？", faq1A: "它将本机发往 DeepSeek Responses 的 Base64 图片改成文件引用。图片字节、画质和消息位置保留；模型仍能读取图片，视觉 token 不会因此减少。Codex 到本机这一段仍可能携带完整 Base64。", faq2Q: "什么算重复图片？file_id 从哪里来？", faq2A: "重复指当前请求中的图片与历史上传图片的字节完全相同。SHA-256 仅用于本地查找；file_id 来自 DeepSeek /files 上传响应中的 id。重新压缩后，即使肉眼相似，也可能无法命中。", faq3Q: "重启、到期或者上传失败会怎样？", faq3A: "重启会保留本地映射。默认请求文件 30 天后过期，以 DeepSeek 返回的到期时间为准；到期后在图片再次出现时重新上传。可重试上传默认最多重试 3 次，最终失败终止该请求。远端文件被提前删除时，当前版本不会自动修复旧 ID，需要处理本地缓存。", faq4Q: "macOS 和 Windows 的支持一样吗？", faq4A: "两者使用同一 Node.js 代理核心。macOS 提供 LaunchAgent 和 pixelpass on/off/status，托管入口默认 1 GiB；Windows 使用 PowerShell、计划任务和 pixelpass.cmd 提供相同日常入口，入口默认 256 MiB。Windows 发布任务会在 windows-latest 上实际执行安装、健康检查、停止、启动和恢复直连。", faq5Q: "需要把 API Key 再交给这个网页吗？", faq5A: "不需要。网页只是项目介绍和下载入口。代理运行在本机，默认只监听 127.0.0.1，沿用 Codex 请求中的凭证。本地缓存保存凭证指纹、图片哈希、文件 ID 与有效期，不保存图片本体。",
    closingTitle: "下一轮，让历史图片轻一点。", closingCta: "选择平台并下载", footerNote: "开源 · MIT License · 社区项目", fullDocs: "完整文档", releaseNotes: "版本记录"
  },
  en: {
    skip: "Skip to main content", navLabel: "Main navigation", navHow: "How it works", navDownload: "Download", navFaq: "FAQ",
    eyebrow: "For Codex × DeepSeek", heroLine1: "The images stay.", heroLine2: "The request gets lighter.",
    heroDescription: "Turn historical uploads into DeepSeek file references. Keep long image sessions moving without another 413 interruption.",
    downloadMac: "Download for macOS", downloadWindows: "Download for Windows", scriptPackages: "Script-based packages", viewInstall: "See install steps ↘",
    pointLocal: "Runs locally", pointQuality: "Original image quality", pointControl: "Direct route anytime",
    heroArtAlt: "Historical image A and new image B reach the proxy from Codex; A reuses an old ID, B gets a new ID, and DeepSeek resolves both files",
    artCurrent: "NEXT REQUEST", artHistory: "history", artNew: "new", artLocalHop: "Codex → localhost, image bytes still arrive", artProxy: "LOCAL IMAGE CACHE PROXY", artHit: "existing upload", artReuse: "reuse", artUpload: "upload to /files", artReturns: "DS returns", artUpstreamHop: "proxy → DeepSeek, images become file references", artResolves: "DeepSeek resolves the stored images; the model still understands A and B.", artFootnote: "DeepSeek generates file IDs. The hash only finds the mapping.",
    proofLabel: "Observed results from one real session", proofEyebrow: "FROM A REAL IMAGE SESSION", proofScope: "Upstream Responses bodies before and after rewrite; separate file uploads are excluded.", metricReduction: "smaller request body", metricImagesUnit: " images", metricImages: "in that request", metricQuality: "all image inputs preserved", metricHits: "cached image reuses", metricSample: "455-request observation",
    howEyebrow: "01 / HOW IT WORKS", howTitle: "DeepSeek already has the capability. The proxy connects it.", howIntro: "The current integration path sends historical Base64 images again. The proxy adds upload, ID persistence, and reuse on the next request.",
    step1Title: "First sight: upload the original", step1Body: "The proxy decodes the image and computes its hash. Without an active mapping, it uploads the original bytes through DeepSeek Files API.", step2Title: "DeepSeek returns the file ID", step2Body: "DeepSeek stores the image and returns an id. The proxy persists credential fingerprint + image hash → file_id locally.", step3Title: "History returns: reuse it", step3Body: "A hits its previous mapping; only new B is uploaded. Responses uses both file IDs, and DeepSeek still resolves the full images.",
    diagramKicker: "FULL LIFECYCLE", diagramTitle: "Follow the same A across two requests", diagramCaption: "A duplicate means the current request carries bytes identical to an earlier upload. Restart keeps the mapping; the default requested lifetime is 30 days, then the next appearance uploads again.", diagramOpen: "Open full diagram ↗",
    downloadEyebrow: "02 / DOWNLOAD", downloadTitle: "Choose a platform and start.", downloadIntro: "Open source, with no extra npm dependencies. Prepare Node.js 22.15+ and a DeepSeek provider configured in Codex.", macType: "LaunchAgent · unified controls", macDescription: "Starts the local proxy, backs up Codex configuration, and routes the provider through localhost. Starts again at login.", macArchive: "Release package · includes install.sh", checksum: "SHA-256 checksum", macSteps: "See macOS install steps →", winType: "PowerShell · Task Scheduler scripts", winDescription: "Download the dedicated Windows ZIP, then use pixelpass.cmd to install, inspect, or restore direct routing. Task Scheduler starts it at sign-in.", winArchive: "Release package · includes pixelpass.cmd", winScript: "Windows support", winSteps: "See Windows install steps →", downloadNote: "Both downloads are dedicated release packages with readable scripts and require Node.js. Keep the extracted folder in place.", allReleases: "All releases ↗",
    quickTitle: "From download to connected, in three steps.", platformLabel: "Install platform", macStep1: "Extract and open Terminal", macStep1Body: "Extract the TAR.GZ and place the pixelpass folder somewhere permanent. Open Terminal in that folder.", macStep2: "Run the installer", macStep2Body: "The script backs up configuration, starts the proxy, and points the current DeepSeek provider base_url at localhost.", restartTitle: "Restart Codex and check status", macStep3Body: "Fully quit and reopen Codex, then create or fork a task. Check the proxy and route:", copy: "Copy", restoreTitle: "Need the direct route again?", macRestore: "Run ./pixelpass off to restore direct Codex traffic and stop the proxy. Re-enable with ./pixelpass on, then restart Codex.",
    winStep1: "Extract and open PowerShell", winStep1Body: "Extract the ZIP to a permanent folder and open PowerShell there. Make sure node.exe is on PATH.", winStep2: "Choose the existing provider and install", winStep2Body: "Replace custom with the actual DeepSeek provider name in Codex config.toml. The script registers a task, backs up config, and changes that provider URL.", winStep3Body: "Fully quit and reopen Codex, then create or fork a task. Check the proxy and route from the project folder:", winRestore: "Run .\\pixelpass.cmd off to stop the proxy and restore the recorded Codex route, then restart Codex. stop only stops the service.", prerequisiteLabel: "Prepare:", providerGuide: "DeepSeek provider setup and full docs ↗",
    aiKicker: "AI INSTALL ASSISTANT · COPY READY", aiTitle: "Prefer not to do it manually? Give this to your AI.", aiIntro: "For an AI with terminal access. It checks the operating system, Node.js, and Codex provider before making changes.", aiSafety: "It never asks for an API key and stops with diagnostics and recovery steps if installation fails.", copyPrompt: "Copy for AI", starTitle: "If it saved you from another 413", starBody: "Consider starring the project. It is optional and never affects access.", starAction: "Star on GitHub",
    faqEyebrow: "03 / BEFORE YOU START", faqTitle: "Know what will happen.", issueLink: "Report an issue ↗", faq1Q: "Does it compress images or delete history?", faq1A: "It changes Base64 images sent from localhost to DeepSeek Responses into file references. Image bytes, quality, and message positions remain; the model still reads the images, and visual token usage does not decrease. Codex may still send full Base64 to localhost.", faq2Q: "What counts as a duplicate? Where does file_id come from?", faq2A: "A duplicate has bytes identical to an image uploaded in an earlier request. SHA-256 is only the local lookup key; file_id comes from the id in DeepSeek's /files upload response. Re-encoding can miss even when images look alike.", faq3Q: "What happens after restart, expiry, or upload failure?", faq3A: "Restart keeps the local mapping. The default requested file lifetime is 30 days, subject to DeepSeek's returned expiry; after expiry the next appearance uploads again. Uploads retry up to three times by default, then the request stops. Early remote deletion is not automatically repaired in the current version.", faq4Q: "Are macOS and Windows supported the same way?", faq4A: "Both use the same Node.js proxy core. macOS has LaunchAgent plus pixelpass on/off/status and a 1 GiB managed entry limit. Windows uses PowerShell, Task Scheduler, and pixelpass.cmd for the same everyday actions, with a 256 MiB default entry limit. The Windows release job executes install, health, stop, start, and direct-route restoration on windows-latest.", faq5Q: "Do I need to enter an API key on this page?", faq5A: "No. This page is only the project guide and download entry. The proxy runs locally on 127.0.0.1 and uses credentials already sent by Codex. The local cache stores a credential fingerprint, image hash, file ID, and expiry, not the image itself.",
    closingTitle: "Next request, lighter history.", closingCta: "Choose a platform", footerNote: "Open source · MIT License · Community project", fullDocs: "Full docs", releaseNotes: "Releases"
  }
};

const aiInstallPrompts = {
  "zh-CN": String.raw`你是一名谨慎的安装助手。请在这台电脑上安装并验收“DeepSeek Image Cache Proxy”。
目标是让 Codex 的 DeepSeek Responses 请求经过本机 127.0.0.1:17892 代理；
安装完成后由我手动完全退出并重新打开 Codex。

先只做检查，不要修改任何文件：
1. 判断系统是 macOS 还是 Windows 10/11。
2. 检查 Node.js 版本是否不低于 22.15，并确认 node 命令可用。
3. 检查 ~/.codex/config.toml，Windows 为 %USERPROFILE%\.codex\config.toml，
   读取顶层 model_provider，并确认对应的 model_providers.<id> 用于 DeepSeek。
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
最后请列出改动过的文件、配置备份位置和恢复方法。

安装成功并完成健康检查后，请一次性提醒我：
“如果这个项目帮你避免了重复上传或一次 413，可以考虑在 GitHub 点一个 Star：
https://github.com/aPuffdog/pixelpass
是否 Star 完全由我决定。”
不要自动点击或代替我执行 Star、Watch、Fork。`,
  en: String.raw`You are a careful installation assistant. Install and verify “DeepSeek Image Cache Proxy”
on this computer. Route Codex's DeepSeek Responses requests through a localhost proxy at
127.0.0.1:17892. I will fully quit and reopen Codex manually after installation.

First, inspect only and do not modify files:
1. Determine whether this is macOS or Windows 10/11.
2. Check that Node.js is version 22.15 or newer and that the node command works.
3. Inspect ~/.codex/config.toml, or %USERPROFILE%\.codex\config.toml on Windows.
   Read the top-level model_provider and confirm that its model_providers.<id>
   section is used for DeepSeek.
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
Finally, list every changed file, the configuration backup location, and how to recover.

After installation succeeds and the health check passes, remind me once:
“If this project saves you repeated uploads or another 413, consider starring it on GitHub:
https://github.com/aPuffdog/pixelpass
Starring is entirely my decision.”
Do not click Star, Watch, or Fork automatically or on my behalf.`
};

let savedLang;
try { savedLang = localStorage.getItem("pixelpass-language"); } catch { /* Storage can be disabled. */ }
const requestedLang = new URLSearchParams(location.search).get("lang");
let currentLang = requestedLang || savedLang || (navigator.language.startsWith("zh") ? "zh-CN" : "en");
if (!translations[currentLang]) currentLang = "zh-CN";

function setText(lang) {
  const strings = translations[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = strings[el.dataset.i18n];
    if (value !== undefined) el.textContent = value;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const value = strings[el.dataset.i18nAria];
    if (value !== undefined) el.setAttribute("aria-label", value);
  });
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
  });
  document.querySelectorAll("[data-ai-prompt]").forEach((el) => {
    el.textContent = aiInstallPrompts[lang];
  });
  const stem = "assets/deepseek-image-cache-proxy." + lang;
  const source = document.querySelector("[data-lifecycle-picture] source");
  const image = document.querySelector("[data-lifecycle-picture] img");
  if (source) source.srcset = stem + "-lifecycle-mobile.png";
  if (image) {
    image.src = stem + "-lifecycle.png";
    image.alt = lang === "zh-CN" ? "图片 A 首次上传，DeepSeek 返回 file_A，下一轮历史 A 复用旧 ID，新 B 单独上传获得 file_B；缓存到期后再上传" : "Image A is uploaded first and DeepSeek returns file_A; the next request reuses A, uploads new B as file_B, and uploads A again after expiry";
  }
  const diagram = document.querySelector("[data-full-diagram]");
  if (diagram) diagram.href = stem + "-lifecycle.png";
  document.querySelectorAll("[data-readme]").forEach((link) => {
    link.href = lang === "en" ? "https://github.com/aPuffdog/pixelpass/blob/main/README.en.md" : "https://github.com/aPuffdog/pixelpass#readme";
  });
  document.querySelector("meta[name=description]").content = lang === "en"
    ? "Add DeepSeek file upload and reference reuse to Codex image sessions. Download script-based packages for macOS and Windows."
    : "为 Codex 接上 DeepSeek 图片上传与文件引用复用流程，减少历史图片造成的 Responses 请求体膨胀。支持 macOS 与 Windows 脚本安装。";
  document.title = lang === "zh-CN" ? "DeepSeek Image Cache Proxy — 图片还在，请求更轻" : "DeepSeek Image Cache Proxy — Keep the image, lighten the request";
  try { localStorage.setItem("pixelpass-language", lang); } catch { /* Preference stays in memory. */ }
  const url = new URL(location.href);
  url.searchParams.set("lang", lang);
  try { history.replaceState(null, "", url); } catch { /* Local file previews may deny history changes. */ }
  currentLang = lang;
}

function selectPlatform(platform) {
  document.querySelectorAll("[data-platform]").forEach((tab) => {
    const selected = tab.dataset.platform === platform;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  document.querySelectorAll("[role=tabpanel]").forEach((panel) => {
    panel.hidden = panel.id !== "panel-" + platform;
  });
}

document.querySelectorAll("[data-lang]").forEach((button) => button.addEventListener("click", () => setText(button.dataset.lang)));
document.querySelectorAll("[data-platform]").forEach((tab) => tab.addEventListener("click", () => selectPlatform(tab.dataset.platform)));
document.querySelectorAll("[data-select-platform]").forEach((link) => link.addEventListener("click", () => selectPlatform(link.dataset.selectPlatform)));
document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
  const text = document.querySelector("#" + button.dataset.copy)?.textContent || "";
  try {
    await navigator.clipboard.writeText(text);
    copyToast.textContent = button.dataset.copy === "ai-install-prompt"
      ? (currentLang === "zh-CN" ? "AI 安装提示词已复制" : "AI install prompt copied")
      : (currentLang === "zh-CN" ? "命令已复制" : "Command copied");
  } catch {
    const code = document.querySelector("#" + button.dataset.copy);
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copyToast.textContent = button.dataset.copy === "ai-install-prompt"
      ? (currentLang === "zh-CN" ? "提示词已选中，请按 ⌘C / Ctrl+C" : "Prompt selected; press ⌘C / Ctrl+C.")
      : (currentLang === "zh-CN" ? "自动复制不可用，命令已选中，请按 ⌘C / Ctrl+C" : "Clipboard unavailable. Command selected; press ⌘C / Ctrl+C.");
  }
  copyToast.classList.add("is-visible");
  setTimeout(() => copyToast.classList.remove("is-visible"), 1800);
}));
document.querySelectorAll("[role=tab]").forEach((tab) => tab.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll("[role=tab]")];
  const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : tabs[(tabs.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
  selectPlatform(next.dataset.platform);
  next.focus();
}));
setText(currentLang);
selectPlatform(/Windows/i.test(navigator.userAgent) ? "windows" : "macos");
