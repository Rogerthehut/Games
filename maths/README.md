# Quarter Maths

Quarter is a maths practice app with selected topics from England’s curriculum, from Key Stage 2 to A-level, and separate 11+ practice. This package includes the web app, the optional tutor service and the Expo prototype.

## Develop the web app

Run these commands from the extracted repository root:

```sh
cd maths
npm ci
npm run dev
```

For checks and a production build, run `npm run typecheck`, `npm test` and `npm run build` from `maths/`. Deploy the generated `maths/dist/` directory to a static web host.

## Preview the included build

From the extracted repository root, run `python3 -m http.server 4173 --directory maths/dist` (use `py` on Windows), then open [http://localhost:4173/](http://localhost:4173/).

This snapshot includes the Skills and Parents’ area filters, the searchable 11+ test finder, desktop avatar navigation, the Today heading fix and the footer credit. Progress and settings in this build are stored in the learner’s browser.

## Documentation

- [Roadmap](docs/ROADMAP.md)
- [Qualifications and accreditation](docs/QUALIFICATIONS.md)
- [Design notes](docs/DESIGN.md)
- [Optional tutor service](docs/TUTOR.md)
- [Expo prototype](native/README.md)

## GitHub handover

Copy the contents of the extracted `Quarter` folder into your repository root. Keep the `maths/` and `maths/native/` directories in place because the Expo prototype uses the shared maths engine. The included web build is for preview. Git ignores generated build output and installed dependencies. Keep local credentials and environment files outside version control.
