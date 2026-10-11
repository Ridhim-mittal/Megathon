# Lakshyam

## Requirements

- Node.js 22.12+ (or 24 LTS) and npm
- A modern browser (Chrome, Edge or Firefox), laptop screen 1024×768 or larger

No API keys, database, `.env` file, datasets or model weights are needed.

## Setup and run

```bash
npm ci
npm run dev
```

Open the address Vite prints (for example `http://localhost:5173`).

Production build (fully offline static site):

```bash
npm run build      # output in dist/
npm run preview    # serve dist/ locally
```

Optional URL parameters: `?seed=demo` gives a fixed, reproducible life; `?speed=4` speeds up the SIP Garden mini-game.

## Tests

```bash
npm test                    # engine and rules unit tests (Node test runner)
npm run validate:content    # content and translation validator
npx playwright install chromium
npm run test:e2e            # browser tests (Playwright)
```

To use an existing Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable.

## Third-party credits

| Component | Licence |
|---|---|
| [React](https://react.dev) and React DOM | MIT |
| [Vite](https://vitejs.dev) | MIT |
| [lucide-react](https://lucide.dev) icons | ISC |
| [Fontsource](https://fontsource.org): DM Sans, Manrope, Noto Sans Devanagari, Noto Sans Telugu, Pixelify Sans | SIL Open Font License 1.1 |
| [Playwright](https://playwright.dev) (tests only) | Apache 2.0 |
| Background music `public/audio/sunlight-on-the-well.mp3` | AI-generated with a Google music tool (C2PA content credentials embedded in the file) |

All pixel art, characters, story content and sound effects (synthesized in code) were made by the team during the hackathon. AI coding assistants were used during development, as permitted by the rules.

## Licence

[MIT](LICENSE)
