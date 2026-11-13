/**
 * Apple's "apple-app-site-association" file: the proof, served from our own site, that quarter's iPhone and iPad app (team and bundle id below, both
 * public) may open links to yourquarter.co.uk. Links to the team page, the API and the unsubscribe page are kept out, so those always open in the browser.
 * Apple fetches it over HTTPS with no redirect, so the site serves it itself at /.well-known/apple-app-site-association.
 */
export const APPLE_TEAM_ID = "UM58XBX7LH";
export const APP_BUNDLE_ID = "uk.co.yourquarter.app";

export function appSiteAssociation(teamId = APPLE_TEAM_ID, bundleId = APP_BUNDLE_ID) {
  return {
    applinks: {
      details: [{
        appIDs: [`${teamId}.${bundleId}`],
        components: [
          { "/": "/ops*", exclude: true },
          { "/": "/api/*", exclude: true },
          { "/": "/unsubscribe*", exclude: true },
          { "/": "/.well-known/*", exclude: true },
          { "/": "/*" },
        ],
      }],
    },
  };
}
