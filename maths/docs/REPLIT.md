# Running on Replit

## Import

1. In Replit choose **Import from GitHub** and pick `Rogerthehut/games`, branch `main`.
2. The repo's `.replit` file does the rest. Press Run. It installs, builds the app, and starts one server that serves the app and the tutor API on port 5000 (shown as port 80 in the preview).

The app lives in `maths/`, which is why `.replit` starts with `cd maths`. Nothing else is needed for the app to work: progress is stored in each learner's browser.

## Secrets (optional)

Add these in the Secrets tool, never in files:

| Secret | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Turns the AI tutor on. Without it the tutor answers "unavailable" and everything else works. |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Use OpenRouter instead, for example a free model. By default only providers that do not keep prompts are allowed, which stops most free models. See "Using an OpenRouter free model" in `docs/TUTOR.md` before changing `OPENROUTER_DATA_COLLECTION`. |
| `TUTOR_MODEL`, `TUTOR_EFFORT` | Optional. Defaults are in `server/tutor/provider.ts`. |

`maths/.env.example` lists every setting. `TRUST_PROXY=1` is already set in `.replit` so rate limits see the real visitor address.

## Deploying

`.replit` is set up for an **Autoscale** deployment: it builds with `npm run build` and runs `npm run server`. Check the tutor after deploying: open `/api/health`, which should return `{"ok":true,"tutor":true}` once a key is set.

## Node version

`.replit` asks for Node 20. The code was developed on Node 22. If the install or build complains, switch the module to `nodejs-22`.

## Database (not set up yet)

The app has no database today. The plan is Replit's managed Postgres, using Drizzle, starting with reference data (schools, test providers, areas) which holds no personal information. Learner accounts and progress sync come later, after the privacy review. See the roadmap.

## Not needed on Replit

`maths/native/` is the Expo prototype. It has its own dependencies and is hidden in the Replit file tree.
