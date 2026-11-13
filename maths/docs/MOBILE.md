# quarter on iPhone and iPad

The app lives in `/mobile` (an Expo project, TypeScript). It is a thin shell: the quarter website in a web view, with the few things a web view can't do handed to the phone. **iPad and tablet are the priority**: the app runs full screen on iPad in every orientation and in Split View, and the website already has the tablet layouts.

## What is built

| Piece | Where | Status |
|---|---|---|
| The web view loading the live site (`https://yourquarter.co.uk`, or `EXPO_PUBLIC_APP_URL`) | `mobile/src/App.tsx` | Built. **Not run on a device or simulator yet.** The iOS bundle compiles (`npx expo export --platform ios`). |
| Which links stay in the app, open in a browser sheet, go to the phone (mail, phone) or are refused | `mobile/src/links.ts` (+ tests) | Built and tested |
| What the page may ask the app to do (print, save a file, open a link, haptic) and the checks on it | `mobile/src/messages.ts` (+ tests) | Built and tested. Only the site's own pages may send messages. |
| The web side of that link (`window.__quarterNative`, print and file saving) | `src/native/bridge.ts` in the web app | Built and tested |
| Printing (AirPrint), saving PDFs, CSV and data files (share sheet: Save to Files, AirDrop, Mail) | `App.tsx` handlers | Built, **untested on a device** |
| An offline / can't-reach-us screen with Try again | `App.tsx` | Built |
| iPad: full screen, all orientations, Split View, no zoom tricks | `mobile/app.json` | Built |
| Card payments hidden inside the app (Apple requires the App Store for in-app subscriptions) | web app: `isNativeApp()` in `account.tsx`, `account-section.tsx` | Built. The paywall shows "Subscriptions are coming to the app". |
| Sign-in is email only, so there is no Google sign-in to hide in the app | `src/account/auth.ts` | Decided |
| App icon and splash | `mobile/assets` | Made from the site icon. Check them on a device. |

## Not built yet (in order)

1. **In-app subscriptions (RevenueCat).** Needed before the app can ship with a paywall. Plan: RevenueCat entitlements (monthly and yearly, with the free trial), a webhook to the server that records the entitlement against the parent so web and app agree, a native paywall, and Restore Purchases. Apple takes its commission on these.
2. **Sign in with Apple is not needed.** Apple only requires it when an app offers another third-party sign-in (Google, Facebook and so on). quarter signs in by email code only, so the rule doesn't apply. Keep it that way, or add Apple at the same time as any social sign-in.
3. **Voice input for the AI tutor** (on-device, parent opt-in, transcript shown, nothing recorded or stored).
4. **A bundled offline copy of the site.** Not possible as things stand: sign-in, the human check and payments all need a real web address. The site keeps a learner's progress on the device, but the page itself needs a connection to load.
5. **Push notifications**, if wanted (weekly summary).

## Building (from Git Bash on Windows, as you already do)

1. Pull the repo, then `cd mobile && npm install`.
2. `npx eas-cli login` (your Expo account), then `npx eas-cli init` to create the project and put its id into `app.json` (`extra.eas.projectId`).
3. In `app.json` set the real bundle id (it is `uk.co.yourquarter.app` for now; it must match the App ID you create in the Apple Developer account, and can't be changed after the first release).
4. `npx eas-cli build --platform ios --profile preview` for a TestFlight-style internal build, or `--profile production` for the store. The first run asks to create certificates and a provisioning profile (let EAS manage them).
5. `npx eas-cli submit --platform ios` to send the build to App Store Connect (set `ascAppId` in `eas.json` first).
6. Try it first in the iOS simulator is not possible from Windows; use a real iPhone and iPad through TestFlight.

Try a different site address (a test deployment) with `EXPO_PUBLIC_APP_URL=https://... npx expo start`.

## App Store checklist

- **Apple Developer Program** membership, an App ID, and an App Store Connect record.
- **Age rating and audience.** quarter is for ages 7 to 18, so choose "not made for kids" (the Kids category has stricter rules about third-party services). Answer the rating questionnaire honestly (no violence, no user-generated content, an AI chat that is off by default).
- **Privacy:** the privacy policy URL is `https://yourquarter.co.uk/?info=privacy`. Fill in the App Privacy "nutrition labels" from `docs/DPIA.md` (nickname, school year, progress, parent email; no tracking, no ads).
- **Account deletion** is required and exists (Parents' area, "Delete account").
- **AI disclosure:** describe the AI tutor and the parents' assistant in the review notes (off by default, parent controlled, messages screened, answers can be wrong).
- **Review notes:** give the reviewer a sign-in. Use a dedicated reviewer parent account with a learner already set up and, once subscriptions exist, an active subscription or a sandbox note. Say where the Parents' area is and what the PIN steps are.
- **Guideline 4.2 (minimum functionality / web wrappers)** is the main risk for an app that is mostly a web view. What helps: native print and file sharing, native sign-in and subscriptions (to come), haptics, offline messaging, iPad-first behaviour. Expect questions; the answer is that the app delivers a complete learning product, not a website bookmark.
- **Guideline 3.1.1 (payments):** no card payments and no links to pay on the website inside the app. The app already hides Stripe screens.
- **Screenshots:** App Store Connect needs the 13-inch iPad size (2064 × 2752) and a 6.9-inch iPhone size. Take them from the real app on devices or from the web app at those sizes through the screen audit's `--shots` option.
- **Export compliance** is answered in `app.json` (`ITSAppUsesNonExemptEncryption: false`: only standard HTTPS).

## Things I have not been able to verify

- Everything on an actual iPhone or iPad. The shell compiles and its rules are tested, but the web view, the share sheet, AirPrint and the splash screen have not been seen running.
- Whether Apple's sign-in or Clerk's sign-in screens load fully inside the web view (the allowed hosts are in `links.ts`; if a screen is blank, the console will show a blocked host to add).
- That the print preview looks right (the app prints a snapshot of the page, loaded from the live site's styles, so it needs a connection).
- The iPad share sheet position (iPad shares as a popover; check it doesn't land off screen).
