/**
 * Spotting an app's built-in browser (Facebook, Instagram, TikTok and so on). Google refuses to show its sign-in page inside those, and
 * they can fail without saying why, so the sign-in screen suggests opening quarter in Safari or Chrome instead. Some apps (WhatsApp on
 * most phones) open links in the phone's own browser and can't be told apart; those need no notice.
 */
const APPS: [RegExp, string][] = [
  [/Instagram/i, "Instagram"], [/FBAN\/Orca|Messenger/i, "Messenger"], [/FBAN|FBAV|FB_IAB/i, "Facebook"], [/TikTok|musical_ly|BytedanceWebview/i, "TikTok"],
  [/Snapchat/i, "Snapchat"], [/LinkedInApp/i, "LinkedIn"], [/Pinterest/i, "Pinterest"], [/MicroMessenger/i, "WeChat"], [/\bLine\//i, "LINE"],
  [/Twitter/i, "X"], [/WhatsApp/i, "WhatsApp"],
];
/** The name of the app, "this app" for an unnamed Android web view, or null in an ordinary browser. */
export function inAppBrowser(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent): string | null {
  for (const [re, name] of APPS) if (re.test(ua)) return name;
  return /Android.*; wv\)/.test(ua) ? "this app" : null;
}
