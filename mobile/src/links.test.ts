import assert from "node:assert/strict";
import { test } from "node:test";
import { decideNavigation, isAppUrl } from "./links";

const H = "yourquarter.co.uk";
test("the site itself stays in the app", () => {
  for (const u of ["https://yourquarter.co.uk/", "https://yourquarter.co.uk/?info=privacy", "https://www.yourquarter.co.uk/blog/", "about:blank"]) assert.equal(decideNavigation(u, H), "allow", u);
});
test("sign-in and the human check stay in the app", () => {
  for (const u of ["https://clerk.yourquarter.co.uk/v1/client", "https://quarter-12.clerk.accounts.dev/sign-in", "https://challenges.cloudflare.com/turnstile/v0/api.js", "https://appleid.apple.com/auth/authorize"]) assert.notEqual(decideNavigation(u, H), "block", u);
  assert.equal(decideNavigation("https://challenges.cloudflare.com/x", H), "allow");
  assert.equal(decideNavigation("https://quarter-12.clerk.accounts.dev/sign-in", H), "allow");
});
test("other websites open in a browser sheet", () => {
  for (const u of ["https://example.com/", "https://www.trustpilot.com/review/yourquarter.co.uk", "https://evil.com/yourquarter.co.uk"]) assert.equal(decideNavigation(u, H), "browser", u);
  assert.equal(decideNavigation("https://yourquarter.co.uk.evil.com/", H), "browser");
  assert.equal(decideNavigation("https://notchallenges.cloudflare.com.evil.com/", H), "browser");
});
test("mail and phone links go to the phone", () => { for (const u of ["mailto:hello@yourquarter.co.uk", "tel:+441234567890", "sms:+441234567890"]) assert.equal(decideNavigation(u, H), "external", u); });
test("anything else is refused", () => { for (const u of ["http://example.com", "javascript:alert(1)", "file:///etc/passwd", "itms-apps://apps.apple.com/x", "about:srcdoc", "not a url", "data:text/html,hi"]) assert.equal(decideNavigation(u, H), "block", u); });
test("pages inside the page are let through when secure", () => { assert.equal(decideNavigation("https://anything.example/frame", H, { isTopFrame: false }), "allow"); assert.equal(decideNavigation("javascript:1", H, { isTopFrame: false }), "block"); });
test("local development over http works only for the same local host", () => { assert.equal(decideNavigation("http://localhost:5173/", "localhost"), "allow"); assert.equal(decideNavigation("http://localhost:5173/", H), "block"); });
test("only the site's own pages are trusted to send messages", () => {
  assert.equal(isAppUrl("https://yourquarter.co.uk/x", H), true); assert.equal(isAppUrl("https://www.yourquarter.co.uk/", H), true);
  assert.equal(isAppUrl("https://evil.com/", H), false); assert.equal(isAppUrl("https://yourquarter.co.uk.evil.com/", H), false); assert.equal(isAppUrl("javascript:1", H), false);
});
