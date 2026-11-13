import { describe, expect, it } from "vitest";
import { cleanSignatureHtml, signatureText } from "./signature-html";

const clean = (h: string) => { const r = cleanSignatureHtml(h); if (!r.ok) throw new Error(r.error); return r; };
describe("cleanSignatureHtml", () => {
  it("keeps ordinary signature markup", () => {
    const r = clean('<table><tr><td><img src="https://yourquarter.co.uk/email/logo.png" alt="quarter" width="48"></td><td style="font-family:Arial;color:#2f3a73"><b>Roger</b><br>Founder<br><a href="https://yourquarter.co.uk">yourquarter.co.uk</a></td></tr></table>');
    expect(r.html).toContain("<table>"); expect(r.html).toContain('src="https://yourquarter.co.uk/email/logo.png"'); expect(r.html).toContain("font-family:Arial");
    expect(r.html).toContain('rel="noopener noreferrer"');
    expect(r.text).toContain("Roger"); expect(r.text).toContain("yourquarter.co.uk");
  });
  it("removes scripts, handlers, frames, forms, styles that load things and bad links", () => {
    const attacks = [
      '<script>alert(1)</script><b>x</b>', '<b onclick="alert(1)">x</b>', '<img src="https://a.co/x.png" onerror="alert(1)">', '<iframe src="https://evil.example"></iframe><b>x</b>',
      '<form action="https://evil.example"><input name="p"></form><b>x</b>', '<a href="javascript:alert(1)">x</a>', '<a href="JaVaScRiPt:alert(1)">x</a>', '<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>',
      '<img src="data:image/png;base64,AAAA"><b>x</b>', '<img src="http://insecure.example/x.png"><b>x</b>', '<div style="background:url(https://evil.example/t.gif)">x</div>',
      '<div style="width:expression(alert(1))">x</div>', '<div style="position:fixed;top:0">x</div>', '<style>body{display:none}</style><b>x</b>', '<link rel="stylesheet" href="https://evil.example/x.css"><b>x</b>',
      '<svg onload="alert(1)"><circle/></svg><b>x</b>', '<object data="x"></object><embed src="x"><b>x</b>', '<meta http-equiv="refresh" content="0;url=https://evil.example"><b>x</b>', '<base href="https://evil.example/"><b>x</b>',
    ];
    for (const a of attacks) {
      const r = cleanSignatureHtml(a);
      const out = r.ok ? r.html : "";
      expect(out, a).not.toMatch(/<script|onclick|onerror|onload|<iframe|<form|<input|javascript:|data:|url\(|expression|position|<style|<link|<svg|<object|<embed|<meta|<base|http:\/\//i);
    }
  });
  it("drops images that aren't full https addresses, and links to relative or other places", () => {
    expect(clean('<img src="logo.png"><b>x</b>').html).toBe("<b>x</b>");
    expect(clean('<img src="//evil.example/x.png"><b>x</b>').html).toBe("<b>x</b>");
    expect(clean('<a href="/relative">go</a>').html).not.toContain("href=");
    expect(clean('<a href="ftp://x.example/f">go</a>').html).not.toContain("href=");
    expect(clean('<a href="tel:+441234567890">call</a>').html).toContain('href="tel:+441234567890"');
    expect(clean('<a href="mailto:hello@yourquarter.co.uk">mail</a>').html).toContain("mailto:hello@yourquarter.co.uk");
  });
  it("refuses an empty, huge or non-string signature", () => {
    expect(cleanSignatureHtml("   ").ok).toBe(false);
    expect(cleanSignatureHtml("<script>x</script>").ok).toBe(false);
    expect(cleanSignatureHtml("a".repeat(40_001)).ok).toBe(false);
    expect(cleanSignatureHtml(undefined as unknown as string).ok).toBe(false);
  });
  it("writes the plain-text version with line breaks and links written out", () => {
    expect(signatureText('<p>Roger<br>Founder</p><a href="https://yourquarter.co.uk">our site</a>')).toBe("Roger\nFounder\nour site (https://yourquarter.co.uk)");
  });
});
