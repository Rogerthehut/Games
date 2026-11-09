# MathPath Native

The iPhone and iPad version of MathPath, built with React Native and Expo SDK 58.

## What is implemented

- Native Today screen with responsive phone, iPad and large-iPad layouts
- Spring-based press interactions and restrained haptic feedback
- Native stack navigation and iOS swipe-back behaviour
- A complete three-question Year 3 practice run powered by the existing MathPath curriculum and answer checker
- Read-aloud using the device speech engine
- Responsive working-out tools:
  - iPhone: presented as an iOS page sheet
  - iPad landscape: kept beside the question
  - scrap paper with pencil, eraser and undo
  - bean counters
  - place-value abacus
- Native app icon and splash treatment

## Run it

```bash
cd native
npm install
npx expo start
```

Scan the QR code with Expo Go on an iPhone or iPad. Press `i` for the iOS Simulator on a Mac, `a` for Android, or `w` for the web build.

## Shared code

`metro.config.js` exposes the parent project to Metro. The native practice flow imports the real curriculum generator and marking engine from `../src`; it does not maintain a second copy of the maths rules.

The current native slice deliberately leaves the existing Preact web app untouched. The next migration units are profile storage/onboarding, Skills, Plan, Check-up and Me.
