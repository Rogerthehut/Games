import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_HTML, parseMessage, safeFilename } from "./messages";

const j = (x: unknown) => JSON.stringify(x);
test("accepts the messages the page sends", () => {
  assert.deepEqual(parseMessage(j({ type: "print", html: "<p>hi</p>" })), { type: "print", html: "<p>hi</p>" });
  assert.deepEqual(parseMessage(j({ type: "haptic", kind: "success" })), { type: "haptic", kind: "success" });
  assert.deepEqual(parseMessage(j({ type: "open-url", url: "https://example.com/a" })), { type: "open-url", url: "https://example.com/a" });
  assert.deepEqual(parseMessage(j({ type: "share-file", filename: "report.csv", mime: "text/csv;charset=utf-8", base64: "YSxi" })), { type: "share-file", filename: "report.csv", mime: "text/csv;charset=utf-8", base64: "YSxi" });
});
test("accepts the native feature messages", () => {
  assert.deepEqual(parseMessage(j({ type: "haptic", kind: "soft" })), { type: "haptic", kind: "soft" });
  assert.deepEqual(parseMessage(j({ type: "biometric", id: "b-1", reason: "Open the Parents' area" })), { type: "biometric", id: "b-1", reason: "Open the Parents' area" });
  assert.deepEqual(parseMessage(j({ type: "reminders", enabled: true, hour: 16, minute: 30, days: [5, 2, 2, 3] })), { type: "reminders", enabled: true, hour: 16, minute: 30, days: [2, 3, 5] });
  assert.deepEqual(parseMessage(j({ type: "reminders", enabled: false, hour: 0, minute: 0, days: [] })), { type: "reminders", enabled: false, hour: 0, minute: 0, days: [] });
  assert.deepEqual(parseMessage(j({ type: "review" })), { type: "review" });
});
test("refuses malformed native feature messages", () => {
  for (const bad of [j({ type: "biometric" }), j({ type: "biometric", id: "a b", reason: "x" }), j({ type: "biometric", id: "x".repeat(41), reason: "x" }), j({ type: "biometric", id: "ok", reason: 5 }),
    j({ type: "reminders", enabled: "yes", hour: 9, minute: 0, days: [1] }), j({ type: "reminders", enabled: true, hour: 24, minute: 0, days: [1] }), j({ type: "reminders", enabled: true, hour: 9, minute: 60, days: [1] }),
    j({ type: "reminders", enabled: true, hour: 9.5, minute: 0, days: [1] }), j({ type: "reminders", enabled: true, hour: 9, minute: 0, days: [0] }), j({ type: "reminders", enabled: true, hour: 9, minute: 0, days: [8] }),
    j({ type: "reminders", enabled: true, hour: 9, minute: 0, days: [1, 2, 3, 4, 5, 6, 7, 1] }), j({ type: "reminders", enabled: true, hour: 9, minute: 0, days: "all" })]) assert.equal(parseMessage(bad), null, bad.slice(0, 50));
});
test("refuses anything malformed, oversized or unexpected", () => {
  for (const bad of ["not json", "null", "[]", j({}), j({ type: "nope" }), j({ type: "print" }), j({ type: "print", html: "" }), j({ type: "print", html: "x".repeat(MAX_HTML + 1) }),
    j({ type: "open-url", url: "http://example.com" }), j({ type: "open-url", url: "javascript:1" }), j({ type: "haptic", kind: "boom" }),
    j({ type: "share-file", filename: "a.exe", mime: "application/x-msdownload", base64: "AA==" }), j({ type: "share-file", filename: "a.pdf", mime: "application/pdf", base64: "not base64!" }), j({ type: "share-file", filename: "a.pdf", mime: "application/pdf", base64: "" })]) assert.equal(parseMessage(bad), null, bad.slice(0, 40));
});
test("file names can't point anywhere else", () => {
  assert.equal(safeFilename("../../etc/passwd"), "passwd"); assert.equal(safeFilename("C:\\Windows\\x.pdf"), "x.pdf"); assert.equal(safeFilename(".hidden"), "hidden");
  assert.equal(safeFilename(""), "quarter-file"); assert.equal(safeFilename("..."), "quarter-file"); assert.equal(safeFilename("my report (1).pdf"), "my report _1_.pdf");
  assert.ok(safeFilename("a".repeat(300)).length <= 80);
});
test("accepts the dock message only for the four real tabs", () => {
  assert.deepEqual(parseMessage(j({ type: "dock", visible: true, tab: "skills" })), { type: "dock", visible: true, tab: "skills" });
  assert.equal(parseMessage(j({ type: "dock", visible: true, tab: "admin" })), null);
  assert.equal(parseMessage(j({ type: "dock", visible: "yes", tab: "me" })), null);
});
