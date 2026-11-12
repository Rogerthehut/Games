import { describe, expect, it } from "vitest";
import { inAppBrowser } from "./inapp";

describe("in-app browser detection", () => {
  it("spots the common apps' built-in browsers", () => {
    expect(inAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/430.0]")).toBe("Facebook");
    expect(inAppBrowser("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0.0")).toBe("Instagram");
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile Safari/537.36 musical_ly_30.0")).toBe("TikTok");
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 13; SM-S901B; wv) AppleWebKit/537.36 Version/4.0 Chrome/120 Mobile Safari/537.36")).toBe("this app");
  });
  it("leaves ordinary browsers alone", () => {
    expect(inAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")).toBeNull();
    expect(inAppBrowser("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 Edg/120")).toBeNull();
    expect(inAppBrowser("")).toBeNull();
  });
});
