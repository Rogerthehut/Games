import { describe, expect, it } from "vitest";
import { APP_BUNDLE_ID, APPLE_TEAM_ID, appSiteAssociation } from "./aasa";

describe("apple-app-site-association", () => {
  it("names the app and keeps the team page, API and unsubscribe page in the browser", () => {
    const d = appSiteAssociation().applinks.details[0];
    expect(d.appIDs).toEqual([`${APPLE_TEAM_ID}.${APP_BUNDLE_ID}`]);
    const excluded = d.components.filter((c) => "exclude" in c).map((c) => c["/"]);
    expect(excluded).toEqual(expect.arrayContaining(["/ops*", "/api/*", "/unsubscribe*"]));
    expect(d.components[d.components.length - 1]).toEqual({ "/": "/*" });   // everything else opens the app; exclusions are listed first because Apple uses the first match
  });
  it("matches the bundle id in the app", async () => {
    const { readFileSync } = await import("node:fs");
    const app = JSON.parse(readFileSync(new URL("../../mobile/app.json", import.meta.url), "utf8"));
    expect(app.expo.ios.bundleIdentifier).toBe(APP_BUNDLE_ID);
    expect(app.expo.ios.associatedDomains).toContain("applinks:yourquarter.co.uk");
  });
});
