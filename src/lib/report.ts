export type ReportMode = "text" | "image";

export type ReportPayload = {
  app: "TruthShield";
  version: 1;
  generated_at: string;
  mode: ReportMode;
  input: {
    text?: string;
    imageDataUrl?: string;
    media?: {
      file_name?: string;
      mime_type?: string;
      size_bytes?: number;
      duration_sec?: number;
    };
  };
  transcript?: {
    text: string;
    words_count?: number;
  };
  result: unknown;
};

function safeFileStem(s: string) {
  return (s || "report")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function nowStamp() {
  // YYYYMMDD-HHMMSS
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // revoke a moment later to avoid Safari issues
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function openHtmlBlobInNewTab(html: string) {
  const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(blobUrl);
    throw new Error("Popup blocked. Please allow popups to open the report.");
  }
  // Revoke after the new tab has had time to load.
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  return win;
}

export function downloadReportJson(payload: ReportPayload, baseName?: string) {
  const stem = safeFileStem(baseName ?? payload.mode);
  const filename = `truthshield-${stem}-${nowStamp()}.json`;
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), filename);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildReportHtml(payload: ReportPayload, opts?: { autoPrint?: boolean }) {
  const title = `TruthShield Report • ${payload.mode.toUpperCase()}`;
  const autoPrint = !!opts?.autoPrint;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; background:#0b0f1a; color:#f1f5f9; }
    main { max-width: 980px; margin: 0 auto; padding: 28px 20px 60px; }
    header { padding: 22px 20px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.08); }
    h1 { margin: 0; font-size: 20px; letter-spacing: 0.3px; }
    .meta { margin-top: 6px; color: rgba(241,245,249,0.75); font-size: 12px; }
    section { margin-top: 18px; padding: 16px; border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; background: rgba(255,255,255,0.03); }
    h2 { margin: 0 0 10px; font-size: 14px; letter-spacing: 0.2px; color: rgba(241,245,249,0.9); }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.45; color: rgba(241,245,249,0.9); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    img { max-width: 100%; border-radius: 10px; border: 1px solid rgba(255,255,255,0.09); }
    .grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
    .toolbar { margin-top: 14px; display:flex; flex-wrap:wrap; gap: 10px; }
    .btn { appearance:none; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.06); color: #f1f5f9; padding: 10px 12px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; }
    .btn:hover { background: rgba(255,255,255,0.09); }
    @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
    @media print {
      header { background: none; }
      body { background: white; color: black; }
      section { background: white; }
      .meta, h2 { color: #222; }
      .toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Generated: ${escapeHtml(payload.generated_at)} • Mode: ${escapeHtml(payload.mode)} • Version: ${payload.version}</div>
    <div class="toolbar">
      <button class="btn" onclick="window.print()">Print / Save as PDF</button>
    </div>
  </header>

  <main>
    <div class="grid">
      <section>
        <h2>Input</h2>
        <pre><code>${escapeHtml(JSON.stringify(payload.input, null, 2))}</code></pre>
      </section>

      <section>
        <h2>Result</h2>
        <pre><code>${escapeHtml(JSON.stringify(payload.result, null, 2))}</code></pre>
      </section>
    </div>

    ${payload.transcript ? `
    <section>
      <h2>Transcript (preview)</h2>
      <pre><code>${escapeHtml(payload.transcript.text)}</code></pre>
    </section>
    ` : ""}

    ${payload.input?.imageDataUrl ? `
    <section>
      <h2>Image</h2>
      <img src="${payload.input.imageDataUrl}" alt="Uploaded image" />
    </section>
    ` : ""}

    <section>
      <h2>Notes</h2>
      <pre><code>This report is generated from probabilistic analysis and should be used as a tool, not a final verdict.</code></pre>
    </section>
  </main>

  <script>
    ${autoPrint ? "window.addEventListener('load', () => setTimeout(() => window.print(), 350));" : ""}
  </script>
</body>
</html>`;

  return { title, html };
}

export function downloadReportHtml(payload: ReportPayload, baseName?: string) {
  const stem = safeFileStem(baseName ?? payload.mode);
  const filename = `truthshield-${stem}-${nowStamp()}.html`;
  const { html } = buildReportHtml(payload);
  downloadBlob(new Blob([html], { type: "text/html" }), filename);
}

export function openReportHtmlTab(payload: ReportPayload) {
  const { html } = buildReportHtml(payload);
  openHtmlBlobInNewTab(html);
}

export function openReportPrintToPdf(payload: ReportPayload) {
  const { html } = buildReportHtml(payload, { autoPrint: true });
  openHtmlBlobInNewTab(html);
}
