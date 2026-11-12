/** The small page behind the unsubscribe link in the weekly email. Plain on purpose: it has to work in any browser, with nothing loaded. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
export function unsubscribePage(title: string, body: string): string {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} | quarter</title>
<style>body{font:17px/1.6 system-ui,sans-serif;background:#f8f4e8;color:#1e2038;margin:0}main{max-width:520px;margin:12vh auto;padding:0 20px}h1{font:800 1.6rem Georgia,serif}button,a.b{display:inline-block;padding:12px 22px;border-radius:999px;border:2px solid #1e2038;background:#1e2038;color:#fff;font:700 1rem system-ui;cursor:pointer;text-decoration:none}</style></head>
<body><main><h1>${esc(title)}</h1>${body}<p><a href="/">Back to quarter</a></p></main></body></html>`;
}
