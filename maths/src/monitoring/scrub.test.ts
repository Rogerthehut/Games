import { describe, expect, it } from "vitest";
import { cleanMessage, cleanUrl, scrubEvent, type ReportEvent } from "./scrub";

const messy = (): ReportEvent => ({
  user: { id: "p_1", email: "parent@example.com", ip_address: "1.2.3.4" },
  request: { url: "https://yourquarter.co.uk/?tab=plan&learner=maya#top", headers: { cookie: "x", authorization: "Bearer abc" }, cookies: { a: "b" }, data: { answer: "7" }, query_string: "learner=maya" },
  breadcrumbs: [{ message: "clicked Maya" }], extra: { typed: "my answer" }, server_name: "replit-123",
  contexts: { browser: { name: "Safari" }, os: { name: "iOS" }, device: { model: "iPhone14,2", name: "Maya's iPhone" }, runtime: { name: "node" }, culture: { locale: "en-GB" } },
  tags: { area: "ops", handled: "yes", learner: "Maya", url: "https://x" },
  message: "Could not save for parent@example.com with token abcdefghijklmnopqrstuvwxyz0123",
  exception: { values: [{ type: "TypeError", value: "Cannot read x of parent@example.com" }] },
  transaction: "/ops?code=123456",
});

describe("what leaves quarter in an error report", () => {
  it("drops the user, request details, breadcrumbs and extra data", () => {
    const e = scrubEvent(messy());
    expect(e.user).toBeUndefined(); expect(e.breadcrumbs).toBeUndefined(); expect(e.extra).toBeUndefined(); expect(e.server_name).toBeUndefined();
    expect(e.request).toEqual({ url: "/" });
    expect(JSON.stringify(e)).not.toMatch(/maya|parent@|1\.2\.3\.4|Bearer|cookie|my answer|iPhone|abcdefghij|123456/i);
  });
  it("keeps only the technical context and a few tags", () => {
    const e = scrubEvent(messy());
    expect(Object.keys(e.contexts ?? {}).sort()).toEqual(["browser", "os", "runtime"]);
    expect(e.tags).toEqual({ area: "ops", handled: "yes" });
    expect(e.exception?.values?.[0].type).toBe("TypeError");
  });
  it("on the server reduces the error message to its type, since it can quote a request", () => {
    const e = scrubEvent(messy(), true);
    expect(e.exception?.values?.[0].value).toBeUndefined();
    expect(e.exception?.values?.[0].type).toBe("TypeError");
  });
  it("cleans messages and addresses", () => {
    expect(cleanMessage("hi a.b@c.co and tok_" + "x".repeat(30))).toBe("hi [email] and [token]");
    expect(cleanMessage("word ".repeat(100))?.length).toBe(200);
    expect(cleanUrl("https://yourquarter.co.uk/blog/post.html?utm=1#x")).toBe("/blog/post.html");
    expect(cleanUrl(undefined)).toBeUndefined();
  });
});
