import sanitizeHtml from "sanitize-html";

/**
 * Email signatures are HTML the team pastes in. They end up in outgoing email and in a preview in the ops page, so they are cleaned on the server
 * before they are saved, with a short allow-list: no scripts, forms, frames, event handlers, javascript: or data: links, or style tricks that load
 * things. Images must be https. What comes out is what is stored, previewed and sent. A plain-text version is made from it for the text part of an email.
 */
export const SIGNATURE_MAX = 40_000;
const TAGS = ["a", "b", "strong", "i", "em", "u", "s", "br", "p", "div", "span", "table", "thead", "tbody", "tr", "td", "th", "img", "hr", "ul", "ol", "li", "h1", "h2", "h3", "h4", "small", "sub", "sup", "blockquote", "center", "font"];
const STYLE_PROPS = [
  "color", "background-color", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-align", "text-decoration", "text-transform",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border", "border-top", "border-right", "border-bottom", "border-left", "border-radius", "border-collapse", "border-spacing", "width", "max-width", "height", "vertical-align", "white-space",
];
// a style value may hold letters, numbers, spaces and a few symbols, and brackets only for colour functions: no url(), expression(), var(), calc(), escapes or semicolons
const SAFE_VALUE = /^(?:[#a-z0-9\s.,%'"\-+/]|(?:rgba?|hsla?)\([0-9\s.,%/]+\))*$/i;
const BLOCKED_WORDS = /expression|javascript|behavior|binding|import|url/i;

export function cleanSignatureHtml(input: string): { ok: true; html: string; text: string } | { ok: false; error: string } {
  if (typeof input !== "string") return { ok: false, error: "Paste the signature's HTML." };
  if (input.length > SIGNATURE_MAX) return { ok: false, error: "That signature is too long (40,000 characters at most)." };
  const html = sanitizeHtml(input, {
    allowedTags: TAGS,
    allowedAttributes: {
      a: ["href", "title", "style", "rel", "target"], img: ["src", "alt", "width", "height", "style"], font: ["color", "size", "face"],
      td: ["colspan", "rowspan", "align", "valign", "width", "height", "style", "bgcolor"], th: ["colspan", "rowspan", "align", "valign", "width", "height", "style", "bgcolor"],
      table: ["width", "cellpadding", "cellspacing", "border", "align", "style", "bgcolor"], tr: ["style"], tbody: ["style"], thead: ["style"],
      "*": ["style", "align"],
    },
    allowedSchemes: ["https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"], a: ["https", "mailto", "tel"] },
    allowProtocolRelative: false,
    allowedStyles: { "*": Object.fromEntries(STYLE_PROPS.map((p) => [p, [SAFE_VALUE]])) },
    // (a value that passes the pattern but names something risky is still refused, below)
    disallowedTagsMode: "discard",
    transformTags: {
      a: (tag, attribs) => {
        const { href, ...rest } = attribs;
        return { tagName: "a", attribs: { ...rest, ...(href && /^(https:|mailto:|tel:)/i.test(href.trim()) ? { href: href.trim() } : {}), rel: "noopener noreferrer", target: "_blank" } };
      },
    },
    // an image or link with nothing left to point at is dropped, not left half-built
    // an image has to be a full https address (a relative one can't load from an email), and a link with no usable address and no words is dropped
    exclusiveFilter: (frame) => (frame.tag === "img" && !/^https:\/\/[^\s]+$/i.test(frame.attribs.src ?? "")) || (frame.tag === "a" && !frame.attribs.href && !frame.text.trim()),
  }).trim().replace(/style="([^"]*)"/gi, (m, v: string) => (BLOCKED_WORDS.test(v) ? "" : m));
  if (!html) return { ok: false, error: "There's nothing in that signature once it's been cleaned. Paste the HTML of your signature." };
  return { ok: true, html, text: signatureText(html) };
}

/** The same signature as plain text, for the text part of an email: line breaks kept, links written out. */
export function signatureText(html: string): string {
  const withLinks = html.replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, inner: string) => {
    const label = inner.replace(/<[^>]+>/g, "").trim();
    const url = href.replace(/&amp;/g, "&");
    return !label || label === url || `mailto:${label}` === url ? url : `${label} (${url})`;
  });
  const broken = withLinks.replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-4]|hr)[^>]*>/gi, "\n").replace(/<\/t[dh]>/gi, "  ");
  return sanitizeHtml(broken, { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
