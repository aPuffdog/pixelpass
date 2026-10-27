import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Source of the bilingual README illustrations. All geometry is schematic.
// Run: node docs/generate-visuals.mjs [--render]
// PNG rendering needs Playwright, optionally selected with DOCS_PLAYWRIGHT_MODULE.
const root = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(root, "assets");
await mkdir(assets, { recursive: true });
const outputs = [];
const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const tx = (x, y, s, size = 24, opts = {}) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${opts.bold ? 650 : 400}" text-anchor="${opts.anchor || "start"}" fill="${opts.muted ? "#626262" : "#171717"}"${opts.max ? ` data-max-width="${opts.max}"` : ""}${opts.mono ? ' font-family="ui-monospace, SFMono-Regular, Menlo, monospace"' : ""}>${esc(s)}</text>`;
const box = (x, y, w, h, fill = "#fff", stroke = "#bcbcbc", r = 16) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
const line = (x1, y1, x2, y2, dashed = false, arrow = true) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="#363636" stroke-width="2"${dashed ? ' stroke-dasharray="7 5"' : ""}${arrow ? ' marker-end="url(#arrow)"' : ""}/>`;
const chip = (x, y, w, label, size = 24) => box(x, y, w, 46, "#f0f0f0", "#cecece", 9) + tx(x + w / 2, y + 31, label, size, { bold: true, anchor: "middle", mono: true, max: w - 16 });
const photo = (x, y, name, w = 80) => {
  const art = name === "A"
    ? '<circle cx="72" cy="27" r="8" fill="#8b8b8b"/><path d="M8 68L34 32l20 24 13-17 25 29Z" fill="#737373"/><path d="M8 68L34 49 53 68Z" fill="#bcbcbc"/>'
    : '<path d="M16 69V36h21v33M43 69V17h27v52M76 69V43h14v26" fill="#7b7b7b"/><path d="M49 25h15M49 35h15M49 45h15" stroke="#f3f3f3" stroke-width="4"/>';
  return `<g transform="translate(${x} ${y}) scale(${w / 100})">${box(0, 0, 100, 100, "#fff", "#555", 10)}${box(7, 7, 86, 66, "#eee", "none", 5)}${art}${tx(50, 94, name, 21, { bold: true, anchor: "middle" })}</g>`;
};
const svg = (w, h, lang, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc" xml:lang="${lang}">
<title id="title">${esc(title)}</title><desc id="desc">${esc(lang === "en" ? "Schematic lifecycle. A and B identify exact image bytes; file_A and file_B are illustrative IDs returned by DeepSeek, not image hashes." : "生命周期示意。A、B 表示图片字节，file_A、file_B 仅为 DeepSeek 返回 ID 的示例，并非图片哈希。")}</desc>
<defs><marker id="arrow" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="8" markerHeight="8" orient="auto" markerUnits="strokeWidth"><path d="M1 1L11 6 1 11Z" fill="#363636"/></marker></defs>
<style>text{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,"PingFang SC","Microsoft YaHei",sans-serif}svg{color-scheme:light}</style>
<rect width="${w}" height="${h}" fill="#fff"/>${body}</svg>\n`;
const header = (lang, title, subtitle, mobile = false) => tx(48, 48, "DEEPSEEK IMAGE CACHE PROXY", mobile ? 20 : 19, { muted: true, bold: true }) + tx(48, 112, title, mobile ? 35 : 40, { bold: true, max: mobile ? 624 : 1104 }) + tx(48, 154, subtitle, mobile ? 23 : 25, { muted: true, max: mobile ? 624 : 1104 });

function overview(lang, mobile) {
  const zh = lang !== "en";
  const c = (a, b) => zh ? a : b;
  const title = c("历史图片，下一轮继续用原来的文件", "History images. Reuse the uploaded file.");
  let s = header(lang, mobile ? c("历史图片，下一轮复用原文件", "History images. Reuse their IDs.") : title, c("DS 已有文件引用能力；代理帮 Codex 接上这套流程。", "DeepSeek has file references. The proxy connects Codex to that workflow."), mobile);
  if (mobile) {
    s += box(48, 188, 624, 106, "#f5f5f5", "#e0e0e0");
    s += tx(72, 223, c("DeepSeek 原生能力", "Native DeepSeek capability"), 22, { bold: true });
    s += tx(72, 264, c("上传图片 → DS 返回 id → 后续用 id 引用", "Upload → DS returns an ID → reuse the ID"), 24, { max: 576 });
    s += box(48, 340, 624, 234, "#fff", "#595959");
    s += tx(72, 378, c("当前 Codex 请求", "Current Codex request"), 25, { bold: true });
    s += photo(80, 406, "A", 96) + photo(224, 406, "B", 96);
    s += tx(365, 435, c("历史图 A + 新图 B", "History A + new B"), 26, { bold: true });
    s += tx(365, 474, c("依旧携带完整 Base64", "Full Base64 still sent"), 23, { muted: true, max: 278 });
    s += tx(80, 548, c("A 与之前请求中已上传的图片字节相同", "A matches bytes uploaded in an earlier request"), 23, { max: 550 });
    s += line(360, 590, 360, 641);
    s += box(48, 660, 624, 247, "#f7f7f7", "#595959");
    s += tx(72, 702, c("本机代理补齐的流程", "The local proxy bridges the gap"), 25, { bold: true });
    s += chip(72, 730, 92, "A") + tx(186, 761, c("命中旧记录 → 复用 file_A", "Cache hit → reuse file_A"), 26, { max: 454 });
    s += chip(72, 798, 92, "B") + tx(186, 829, c("新图 → /files → DS 返回 file_B", "New → /files → DS returns file_B"), 25, { max: 454 });
    s += tx(72, 883, c("Codex 本身未编排这套 DS 上传与复用流程", "Codex's observed path sends inline data instead"), 22, { muted: true, max: 575 });
    s += line(360, 923, 360, 974);
    s += box(48, 994, 624, 238, "#fff", "#595959");
    s += tx(72, 1036, "DeepSeek · POST /responses", 25, { bold: true });
    s += chip(72, 1058, 174, "file_A") + chip(274, 1058, 174, "file_B");
    s += photo(492, 1065, "A", 64) + photo(574, 1065, "B", 64);
    s += tx(72, 1164, c("DS 读取账户内的 A、B 文件供模型理解", "DS resolves stored A and B for the model"), 24, { max: 570 });
    s += tx(72, 1202, c("上下文仍有两张图，只改变传输表示", "Both images stay in context; representation changes"), 22, { muted: true, max: 570 });
    s += tx(48, 1313, "256 MiB  →  2.1 MiB", 43, { bold: true });
    s += tx(48, 1358, c("上游 Responses 请求体 · 一次实测减少约 99.2%", "Upstream Responses body · ~99.2% less in one observation"), 21, { muted: true, max: 624 });
    s += tx(48, 1395, c("首次 /files 上传单独计算；缓存有效时复用。", "Initial /files uploads are separate. Reuse needs a valid cache."), 21, { muted: true, max: 624 });
    return svg(720, 1440, lang, title, s);
  }
  s += box(48, 190, 1104, 120, "#f5f5f5", "#dedede");
  s += tx(72, 228, c("DS 原生就支持", "Native to DeepSeek"), 23, { bold: true });
  const steps = [c("上传图片", "Upload image"), "POST /files", c("DS 返回 id", "DS returns ID"), c("/responses 用 id", "Use ID in /responses")];
  steps.forEach((label, i) => { s += tx(190 + i * 275, 277, label, 25, { bold: i === 2, anchor: "middle", max: 232 }); if (i < 3) s += line(310 + i * 275, 269, 331 + i * 275, 269); });
  s += tx(48, 365, c("接入缺口：Codex 当前路径发送 Base64，代理补齐 DS 文件上传与引用复用。", "The gap: Codex's observed inline-data path does not orchestrate DS file uploads and reuse."), 25, { max: 1104 });
  s += box(48, 402, 302, 360, "#fff", "#555") + box(460, 402, 300, 360, "#f7f7f7", "#555") + box(870, 402, 282, 360, "#fff", "#555");
  s += tx(72, 445, c("当前 Codex 请求", "Current Codex request"), 25, { bold: true });
  s += photo(80, 472, "A", 94) + photo(220, 472, "B", 94);
  s += tx(127, 605, c("历史图 A", "History A"), 23, { anchor: "middle", bold: true }) + tx(267, 605, c("新图 B", "New B"), 23, { anchor: "middle", bold: true });
  s += tx(72, 667, c("A 在之前请求中已上传", "A was uploaded earlier"), 23, { max: 253 });
  s += tx(72, 710, c("仍发送完整图片数据", "Still sends full image data"), 21, { muted: true, max: 253 });
  s += line(367, 571, 443, 571) + tx(405, 531, c("完整图片", "Full data"), 19, { anchor: "middle" });
  s += tx(484, 445, c("本机缓存代理", "Local cache proxy"), 25, { bold: true });
  s += chip(484, 487, 252, "A → file_A");
  s += tx(484, 569, c("已上传：命中并复用", "Existing: cache hit"), 23, { max: 252 });
  s += tx(484, 626, c("B → /files → file_B", "B → /files → file_B"), 23, { bold: true, mono: true, max: 252 });
  s += tx(484, 674, c("新图片：上传后存映射", "New: upload + cache ID"), 23, { max: 252 });
  s += tx(484, 718, c("哈希 ≠ DS 返回的文件 ID", "Image hash ≠ server file ID"), 20, { muted: true, max: 252 });
  s += line(778, 571, 852, 571) + tx(815, 531, c("文件引用", "File IDs"), 19, { anchor: "middle" });
  s += tx(894, 445, "DeepSeek", 26, { bold: true }) + tx(894, 482, "POST /responses", 22, { muted: true });
  s += chip(894, 516, 106, "file_A", 20) + chip(1020, 516, 108, "file_B", 20);
  s += photo(916, 585, "A", 68) + photo(1034, 585, "B", 68);
  s += tx(894, 695, c("读取已存的 A、B 文件", "Resolves stored A and B"), 22, { max: 234 });
  s += tx(894, 731, c("图片上下文保持完整", "Both images stay in context"), 19, { muted: true, max: 234 });
  s += line(48, 804, 1152, 804, false, false);
  s += tx(48, 869, "256 MiB → 2.1 MiB", 42, { bold: true }) + tx(670, 861, c("一次实测：上游 Responses 体积减少约 99.2%", "One observed upstream Responses body: ~99.2% smaller"), 22, { max: 482 });
  s += tx(48, 914, c("首次 /files 上传单独计算；本机段仍携带 Base64；有效缓存期内复用。", "Initial /files uploads are separate. The local hop still carries Base64. Reuse lasts while the cache is valid."), 22, { muted: true, max: 1104 });
  return svg(1200, 950, lang, title, s);
}

function lifecycle(lang, mobile) {
  const zh = lang !== "en";
  const c = (a, b) => zh ? a : b;
  const title = c("一张图片从出现到过期的完整路径", "From first image to reuse and expiration");
  let s = header(lang, mobile ? c("从首次上传，到历史图片复用", "First upload → history reuse") : title, c("用同一张 A 和新图 B，跟随两次请求。ID 为示例。", "Follow two requests using the same A and a new B. IDs are illustrative."), mobile);
  if (mobile) {
    const card = (y, n, name, body) => box(48, y, 624, 230, "#fff", "#999") + chip(72, y + 24, 50, String(n), 24) + tx(142, y + 56, name, 27, { bold: true, max: 506 }) + body;
    s += card(200, 1, c("首次请求：图片 A", "First request: image A"), photo(76, 284, "A", 88) + tx(193, 307, "Codex → localhost", 26, { mono: true, max: 450 }) + tx(193, 349, c("image_url 携带 Base64", "image_url carries Base64"), 25, { max: 450 }) + tx(72, 402, c("代理解码 → 算 hash(A) → 本地尚无映射", "Decode → hash(A) → no local mapping yet"), 23, { max: 576 }));
    s += line(360, 445, 360, 480);
    s += card(500, 2, c("上传：由 DS 生成文件 ID", "Upload: DS creates the file ID"), photo(76, 591, "A", 76) + tx(180, 609, "Proxy → POST /files → DS", 25, { mono: true, max: 456 }) + line(180, 637, 623, 637) + tx(180, 683, 'DS → { "id": "file_A" }', 25, { mono: true, max: 456 }) + tx(72, 708, c("原始图片保存在 DeepSeek 账户内", "The image file is stored in the DeepSeek account"), 22, { muted: true, max: 576 }));
    s += line(360, 745, 360, 780);
    s += card(800, 3, c("本机保存映射，并改写请求", "Save the mapping; rewrite the request"), chip(72, 883, 576, "hash(A) → file_A + expiresAt", 25) + tx(72, 972, c("缓存按认证指纹隔离；不保存图片本体", "Cache is credential-scoped; no image bytes stored"), 23, { max: 576 }) + tx(72, 1008, c("hash 负责查找；file_A 来自 DS 的上传响应", "The hash is a lookup key; DS returned file_A"), 23, { muted: true, max: 576 }));
    s += line(360, 1045, 360, 1080);
    s += card(1100, 4, c("引用：DS 仍能看到图片 A", "Reference: DS still receives image A"), chip(72, 1180, 576, 'POST /responses · file_id: file_A', 24) + tx(72, 1265, c("DS 按 ID 读取账户内图片 → 模型理解", "DS resolves the stored image → model input"), 24, { max: 576 }) + tx(72, 1305, c("模型回复通过代理流式返回 Codex", "The reply streams through the proxy to Codex"), 23, { muted: true, max: 576 }));
    s += line(360, 1345, 360, 1380);
    s += box(48, 1400, 624, 340, "#f5f5f5", "#999");
    s += chip(72, 1424, 50, "5") + tx(142, 1457, c("下一轮：历史 A + 新图 B", "Next request: history A + new B"), 27, { bold: true, max: 506 });
    s += photo(76, 1493, "A", 72) + tx(180, 1525, c("匹配历史映射 → 复用 file_A", "Match prior mapping → reuse file_A"), 24, { max: 468 });
    s += photo(76, 1581, "B", 72) + tx(180, 1613, c("仅新图 B 调用 /files → file_B", "Only new B uses /files → file_B"), 24, { max: 468 });
    s += chip(72, 1673, 576, "/responses · file_A + file_B", 25);
    s += line(360, 1755, 360, 1790);
    s += box(48, 1810, 624, 256, "#fff", "#999");
    s += chip(72, 1834, 50, "6") + tx(142, 1867, c("映射到期：回到上传步骤", "Mapping expires: upload again"), 27, { bold: true, max: 506 });
    s += tx(72, 1924, c("下次 A 再出现时，旧映射失效 → 重新上传", "When A returns: expired mapping → re-upload"), 24, { max: 576 });
    s += chip(72, 1954, 576, "POST /files → file_A2 → /responses", 24);
    s += tx(72, 2034, c("重启保留映射；删除远端文件不会自动修复", "Restart keeps mappings; remote deletion is not auto-repaired"), 22, { muted: true, max: 576 });
    s += tx(48, 2122, c("默认请求 30 天有效期；以 DS 返回的过期时间为准。", "Requests a 30-day TTL by default; DS expiry takes precedence."), 21, { muted: true, max: 624 });
    s += tx(48, 2157, c("仅改写发给 DS 的请求，Codex 本地历史不变。", "Only the outbound request changes; Codex history stays intact."), 21, { muted: true, max: 624 });
    return svg(720, 2200, lang, title, s);
  }
  const xs = [202, 598, 994];
  ["Codex", c("本机代理 · 映射缓存", "Local proxy · ID mapping"), c("DeepSeek · 图片文件", "DeepSeek · image files")].forEach((label, i) => {
    s += box(xs[i] - 158, 193, 316, 65, "#f2f2f2", "#bbb", 11) + tx(xs[i], 234, label, 25, { anchor: "middle", bold: true, max: 292 });
    s += line(xs[i], 274, xs[i], 1477, true, false);
  });
  s += box(44, 292, 1112, 71, "#f7f7f7", "none", 9) + tx(66, 338, c("01 · 首次请求：A 还没有缓存映射", "01 · First request: A has no cached file mapping"), 27, { bold: true });
  s += photo(107, 390, "A", 76) + tx(220, 406, "image_url: Base64(A)", 23, { max: 370 });
  s += line(204, 434, 590, 434) + chip(624, 397, 315, "POST /files + bytes(A)", 21) + line(607, 455, 986, 455);
  s += tx(388, 481, c("解码 → SHA-256 → 未命中", "Decode → SHA-256 → miss"), 21, { anchor: "middle", max: 350 });
  s += photo(1015, 475, "A", 72) + tx(917, 588, c("DS 保存图片并生成 ID", "DS stores A; creates the ID"), 21, { anchor: "middle", max: 430 });
  s += line(985, 542, 607, 542, true) + tx(787, 521, '{ "id": "file_A" }', 25, { mono: true, anchor: "middle", bold: true });
  s += chip(403, 601, 390, "hash(A) → file_A + expiresAt", 23);
  s += tx(598, 680, c("持久化映射；不是缓存图片本体", "Persist the mapping, not image bytes"), 22, { anchor: "middle", max: 460 });
  s += line(607, 741, 986, 741) + tx(797, 721, "/responses · file_id: file_A", 22, { mono: true, anchor: "middle", max: 380 });
  s += tx(994, 787, c("读取 A → 模型理解", "Resolve A → model input"), 22, { anchor: "middle", max: 300 });
  s += line(985, 829, 210, 829, true) + tx(598, 817, c("模型回复经代理流式返回 Codex", "The model reply streams back through the proxy"), 23, { anchor: "middle", max: 760 });
  s += box(44, 879, 1112, 71, "#f7f7f7", "none", 9) + tx(66, 925, c("02 · 下一轮请求：历史 A + 新图 B", "02 · Next request: history A + new B"), 27, { bold: true });
  s += photo(83, 978, "A", 64) + photo(165, 978, "B", 64) + tx(244, 1005, "Base64(A) + Base64(B)", 22, { max: 332 });
  s += line(204, 1058, 590, 1058);
  s += chip(415, 1082, 366, "A → file_A · HIT", 25) + tx(598, 1162, c("A 不再上传；只有 B 进入 Files API", "A is reused; only B goes to the Files API"), 22, { anchor: "middle", max: 480 });
  s += line(607, 1220, 986, 1220) + tx(797, 1200, "POST /files · bytes(B)", 23, { mono: true, anchor: "middle", max: 380 });
  s += photo(1044, 1244, "B", 60) + line(985, 1286, 607, 1286, true) + tx(787, 1268, '{ "id": "file_B" }', 24, { mono: true, anchor: "middle" });
  s += line(607, 1379, 986, 1379) + tx(797, 1357, "/responses · file_A + file_B", 22, { mono: true, anchor: "middle", max: 380 });
  s += tx(994, 1430, c("模型仍理解 A、B 两张图", "The model still receives both images"), 21, { anchor: "middle", max: 316 });
  s += box(44, 1510, 1112, 202, "#f5f5f5", "#ccc");
  s += tx(66, 1555, c("03 · 有效期结束 / 本地记录丢失 → 下次出现时重新上传", "03 · Mapping expired or missing → re-upload when the image appears again"), 25, { bold: true, max: 1068 });
  s += chip(66, 1582, 245, "hash(A) → MISS", 23) + line(329, 1605, 391, 1605) + chip(410, 1582, 264, "POST /files · A", 23) + line(693, 1605, 755, 1605) + chip(774, 1582, 352, "DS → file_A2", 23);
  s += tx(66, 1682, c("默认请求 30 天 TTL；重启保留映射；远端提前删除目前不会自动重传。", "Default requested TTL: 30 days. Restart keeps the cache. Early remote deletion is not auto-repaired."), 21, { muted: true, max: 1068 });
  s += tx(48, 1764, c("实线：请求 / 上传    虚线：返回 / 生命线    图片 A、B 的字节身份跨轮保持一致", "Solid: request / upload. Dashed: return / lifeline. A and B identify exact bytes across requests."), 21, { muted: true, max: 1104 });
  return svg(1200, 1800, lang, title, s);
}

for (const lang of ["zh-CN", "en"]) {
  for (const mobile of [false, true]) {
    const heroStem = `deepseek-image-cache-proxy.${lang}${mobile ? "-mobile" : "-hero"}`;
    const lifecycleStem = `deepseek-image-cache-proxy.${lang}-lifecycle${mobile ? "-mobile" : ""}`;
    for (const [stem, contents] of [[heroStem, overview(lang, mobile)], [lifecycleStem, lifecycle(lang, mobile)]]) {
      const sourcePath = path.join(assets, `${stem}.svg`);
      await writeFile(sourcePath, contents);
      outputs.push({ sourcePath, pngPath: path.join(assets, `${stem.replace(/-hero$/, "")}.png`) });
    }
  }
}

const preview = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DeepSeek Image Cache Proxy · Visual lifecycle</title><style>
:root{color-scheme:light;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,"PingFang SC",sans-serif;color:#171717;background:#eee}*{box-sizing:border-box}body{margin:0}.bar{position:sticky;top:0;background:#ffffffed;border-bottom:1px solid #ddd;z-index:2;padding:16px max(24px,calc((100vw - 1200px)/2));display:flex;justify-content:space-between;align-items:center;gap:16px}.bar strong{font-size:15px}.controls{display:flex;gap:8px;flex-shrink:0}button{cursor:pointer;background:white;border:1px solid #aaa;border-radius:6px;padding:8px 14px;font:inherit;font-size:14px;white-space:nowrap}button[aria-pressed=true]{color:white;background:#171717;border-color:#171717}main{max-width:1200px;margin:24px auto 48px;background:white}picture{display:block}img{display:block;width:100%;height:auto}section+section{border-top:10px solid #eee}p{margin:0;padding:26px 48px;line-height:1.75;font-size:18px;border-top:1px solid #eee}a{color:inherit}section[hidden]{display:none}@media(max-width:600px){.bar{padding:12px 18px}.bar strong{max-width:170px;font-size:13px}main{margin:12px 0}p{padding:24px;font-size:16px}}
</style></head><body><header class="bar"><strong>DeepSeek Image Cache Proxy</strong><div class="controls"><button data-lang="zh-CN" aria-pressed="true">简体中文</button><button data-lang="en" aria-pressed="false">English</button></div></header><main id="content"></main><script>
const content=document.querySelector('#content');let selectedLang='zh-CN';function render(lang=selectedLang){selectedLang=lang;document.documentElement.lang=lang;const zh=lang==='zh-CN';const mobile=matchMedia('(max-width:600px)').matches;const stem='assets/deepseek-image-cache-proxy.'+lang;const hero=mobile?stem+'-mobile.png':stem+'.png';const flow=mobile?stem+'-lifecycle-mobile.png':stem+'-lifecycle.png';content.innerHTML='<section><img src="'+hero+'" alt="'+(zh?'为什么需要代理：当前请求中的历史图片复用 DS 文件引用':'Why the proxy is needed: reuse prior uploads as DS file references')+'"></section><section><img src="'+flow+'" alt="'+(zh?'图片生命周期：首次上传、获得 DS 文件 ID、保存映射、下轮复用及过期重传':'Image lifecycle: upload, DS-generated file ID, mapping, next-request reuse and expiry')+'"></section><p>'+(zh?'重复指字节完全相同。哈希只用于本地查找，文件 ID 由 DeepSeek 返回。上传失败默认终止；远端文件提前删除目前不会自动修复。':'Duplicate means identical bytes. Hashes are local lookup keys; DeepSeek returns the file IDs. Upload failure stops the request by default; early remote deletion is not automatically repaired.')+'</p>';document.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));}document.querySelectorAll('button').forEach(b=>b.onclick=()=>render(b.dataset.lang));addEventListener('resize',()=>render());render();
</script></body></html>\n`;
await writeFile(path.join(root, "preview.html"), preview);

if (process.argv.includes("--render")) {
  const { chromium } = await import(process.env.DOCS_PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({ executablePath: process.env.DOCS_CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  try {
    const page = await browser.newPage();
    for (const { sourcePath, pngPath } of outputs) {
      const size = sourcePath.includes("-mobile") ? { width: 720, height: 2200 } : { width: 1200, height: 1800 };
      await page.setViewportSize(size);
      await page.goto(new URL(`file://${sourcePath}`).href);
      await page.evaluate(() => document.fonts.ready);
      // Fit a label only when the primary/fallback font exceeds its reserved area.
      await page.evaluate(() => {
        for (const el of document.querySelectorAll("text[data-max-width]")) {
          const max = Number(el.dataset.maxWidth);
          const current = el.getBBox().width;
          if (current > max) el.setAttribute("font-size", String(Number(el.getAttribute("font-size")) * max / current));
        }
      });
      // Save the measured font sizing into SVG sources so SVG and PNG stay aligned.
      const fitted = await page.locator("svg").evaluate(el => el.outerHTML);
      await writeFile(sourcePath, fitted + "\n");
      const overflow = await page.evaluate(() => {
        const svg = document.querySelector("svg").viewBox.baseVal;
        return [...document.querySelectorAll("text")].filter(el => {
          const b = el.getBBox(); return b.x < 0 || b.y < 0 || b.x + b.width > svg.width || b.y + b.height > svg.height;
        }).map(el => el.textContent);
      });
      if (overflow.length) throw new Error(`Text outside ${sourcePath}: ${overflow.join(" | ")}`);
      await page.locator("svg").screenshot({ path: pngPath });
      console.log(path.relative(root, pngPath));
    }
  } finally { await browser.close(); }
}
