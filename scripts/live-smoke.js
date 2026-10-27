const apiKey = process.env.DEEPSEEK_API_KEY;
const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(
  /\/+$/,
  "",
);
const model = process.env.DEEPSEEK_MODEL || "deepseek-flash";

if (!apiKey) {
  throw new Error("DEEPSEEK_API_KEY is required for the live smoke test");
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  "base64",
);

async function readJson(response) {
  const text = await response.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

const form = new FormData();
form.append("purpose", "user_data");
form.append(
  "file",
  new Blob([png], { type: "image/png" }),
  "media-proxy-smoke.png",
);
form.append("expires_after[anchor]", "created_at");
form.append("expires_after[seconds]", "3600");

const upload = await fetch(`${baseUrl}/files`, {
  method: "POST",
  headers: { authorization: `Bearer ${apiKey}` },
  body: form,
  signal: AbortSignal.timeout(60_000),
});
const uploaded = await readJson(upload);
if (!upload.ok || !uploaded.json?.id) {
  throw new Error(
    `File upload failed: HTTP ${upload.status} ${uploaded.text.slice(0, 500)}`,
  );
}

const fileId = uploaded.json.id;
let responseStatus = null;
try {
  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_output_tokens: 32,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Reply with exactly OK." },
            { type: "input_image", file_id: fileId },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  responseStatus = response.status;
  const result = await readJson(response);
  if (!response.ok) {
    throw new Error(
      `Responses request failed: HTTP ${response.status} ${result.text.slice(0, 500)}`,
    );
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        uploadStatus: upload.status,
        fileIdPrefix: fileId.slice(0, 12),
        responseStatus,
        responseBytes: Buffer.byteLength(result.text),
        model,
      },
      null,
      2,
    ),
  );
} finally {
  const deleted = await fetch(
    `${baseUrl}/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30_000),
    },
  ).catch(() => null);
  console.error(
    JSON.stringify({
      cleanup: {
        deleted: Boolean(deleted?.ok),
        status: deleted?.status ?? null,
      },
    }),
  );
}
