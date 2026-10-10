# Lakshyam 🌱

A cosy, story-driven financial-literacy life simulation for Class 11–12 students, designed for laptops. Pick a life (the village), pick a dream, and live from age 11 to 36, one year per turn: budget your jars, shop for little joys, make choices on story cards, and see where every rupee went. English, हिंदी and తెలుగు.

## Run locally

Use Node.js 22.12+ (or Node 24 LTS) and npm.

```bash
npm ci
npm run dev
```

Vite prints the development address. From another device on the same network, use the host machine's IP and the printed port. No API keys, database, or `.env` file are required.

```bash
npm test                  # Engine and rules tests (every src/**/*.test.js)
npm run validate:content  # Check src/content against docs/GAME_SPEC.md
npm run build    # Production bundle in dist/
npm run preview  # Serve the production bundle for local verification
```

Deploy as a static Vite site: build command `npm run build`, output directory `dist`. Fonts, illustrations, and icons are bundled; gameplay makes no external requests.

## How to play

1. **Play** → choose a language → choose your life (the village; the city is "coming soon") → meet your family → choose your dream and your name.
2. **Each year:** split your monthly money into jars (needs first), spend the little-joys jar in the wants shop if you like, then make choices on 1–3 story cards. Press **1–4** or click to choose. **Why?** explains every outcome, with numbers.
3. **Ammamma's glasses** reveal what tricky phrases really mean (limited charges). **Documents** look like real paper: tap suspicious lines, or pay to verify. **Ask Ammamma** (top bar, or click her in the village) answers questions; without the optional `/api/ask` endpoint she answers from her offline notebook.
4. **Echoes:** some choices ripple quietly and come back years later.
5. At 36: your **ending** and the storyteller's reveal, your **Gyaan report**, then **Parallel Life** (change one decision and compare both lives) and the **ending gallery**.

The top bar switches language and sound (off by default) at any time. Progress is saved in this browser's `localStorage` only; `?seed=demo` gives a fixed, rehearsed life. All numbers are illustrative teaching assumptions, not advice.

## Files

- `src/engine/`: the pure, seeded life engine; `src/engine/README.md` lists its API.
- `src/content/`: storylines, cards, lessons, glossary, documents and endings.
- `src/ui/gameAdapter.js`: the only door from the UI to the engine and content.
- `src/screens/`: one file per screen (`App.jsx` routes them); `src/screens/life/` holds the year-loop views.
- `src/ui/`: shared components (HUD, jars, portraits, document viewer, Ask Ammamma, rich text).
- `src/i18n/`: UI strings in `en.json`, `hi.json`, `te.json` and the `useT()` hook.
- `src/World.jsx`: the illustrated village, the cast and the dream that grows in it.
- `src/styles.css`, `src/game-scene.css`, `src/life.css`: styles.

## Browser checks

```bash
npx playwright install chromium  # One-time browser installation for developers
npm run test:e2e
```

The browser suite plays start → language → village → dream → one full year → year-end summary, switches between English, Hindi and Telugu (checking nothing overflows), checks saving/Continue and Ask Ammamma, and the 1024×768, 1280×720 and 1366×768 layouts. It starts its own Vite server on port 5180. To use an existing Chromium installation in a cloud machine, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to that browser's executable path.

## Team workflow

Use the assigned cloud branch or a personal `<name>/<task>` branch. Do not push to `main`. Team rules are in [CLAUDE.md](CLAUDE.md). Each cloud task already has an isolated checkout; an additional worktree is unnecessary unless explicitly requested.
