/** Where the app loads quarter from. Set EXPO_PUBLIC_APP_URL to try another address (a test deployment, for example). */
export const APP_URL = (process.env.EXPO_PUBLIC_APP_URL ?? "https://yourquarter.co.uk").replace(/\/$/, "");
export const APP_HOST = new URL(APP_URL).hostname;
export const APP_VERSION = "1.0.0";
/** Added to the web view's user agent, so the site (and its logs) can tell the app from a browser. */
export const USER_AGENT_SUFFIX = `quarter-app/${APP_VERSION}`;
/** Behind the web page while it loads, matching the site's cream so there is no flash. */
export const BACKGROUND = "#faf5ea";
