# Lakshyam 🌱

A cosy, story-driven financial-literacy game for Class 11–12 students, designed for laptops. Pick a life (the village), a dream and a look, then walk a pixel-art village from age 11 to 36 in five chapters (school life, college life, first job, marriage & family, the dream). Every place on the map (bank, school, hospital, kirana shop, sahukar, post office, panchayat, workplace, field) holds the chapter's story cards and lessons. A full life takes about 15–20 minutes. English, हिंदी and తెలుగు.

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

1. **Play** → choose a language → choose your life (the village; the city is "coming soon") → meet your family → choose your dream, your name and your look.
2. **Each chapter** opens with a title card, then your jar split (needs first) for its years.
3. **Walk the village:** arrow keys or WASD to move, **Enter** to go in, or click a place (or a line in the quest log) to walk there. A yellow **!** is a must-live event, a white **!** is optional. Each event is a story card: press **1–4** or click to choose; **Why?** explains every outcome with numbers, and **Learn more** opens the Gyaan lesson.
4. When the quest log says so, **go home** to finish the chapter and see how its years went (money, dream, the index fund year by year).
5. **The phone** arrives with your first job (or buy one). Press **P** or the phone button: messages (some events arrive here), the bank (move money, prepay loans) and invest (index, debt and active mutual funds and four shares, from age 18, with fees, risk and a concentration warning).
6. **Ammamma's glasses**, **documents**, **Ask Ammamma** (top bar, or click her on the road) and **echoes** work as before. At 36: your **ending**, your **Gyaan report**, **Parallel Life** and the **ending gallery**.

The top bar switches language and sound (off by default) at any time. Progress is saved in this browser's `localStorage` only; `?seed=demo` gives a fixed, rehearsed life. All numbers are illustrative teaching assumptions, not advice.

## Files

- `src/engine/`: the pure, seeded life engine; `src/engine/README.md` lists its API.
- `src/content/`: storylines, cards, lessons, glossary, documents and endings.
- `src/ui/gameAdapter.js`: the only door from the UI to the engine and content.
- `src/screens/`: one file per screen (`App.jsx` routes them). `MapScreen.jsx` is the game; `src/screens/map/` holds its HUD, quest log and chapter cards, and `src/screens/life/` the card, outcome, budget, shop and mini-game views.
- `src/ui/map/`: the pixel village: `village.js` (tile map, places, paths), `art.js` (code-drawn pixel art and characters), `MapCanvas.jsx` (movement, camera, clicks).
- `src/ui/PhoneLite.jsx`, `src/ui/GyaanLite.jsx`: the in-game phone and the lesson reader.
- `src/ui/`: shared components (HUD, jars, portraits, document viewer, Ask Ammamma, rich text).
- `src/i18n/`: UI strings in `en.json`, `hi.json`, `te.json` and the `useT()` hook.
- `src/World.jsx`: the earlier SVG village (no longer routed).
- `src/styles.css`, `src/game-scene.css`, `src/life.css`, `src/pixel.css`: styles (`pixel.css` is the map game).

## Browser checks

```bash
npx playwright install chromium  # One-time browser installation for developers
npm run test:e2e
```

The browser suite plays start → language → village → dream → chapter 1 (walking to every event) → chapter summary, checks arrow-key walking, switches between English, Hindi and Telugu (checking nothing overflows), checks saving/Continue and Ask Ammamma, and the 1024×768, 1280×720 and 1366×768 layouts. It starts its own Vite server on port 5180. To use an existing Chromium installation in a cloud machine, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to that browser's executable path.

## Team workflow

Use the assigned cloud branch or a personal `<name>/<task>` branch. Do not push to `main`. Team rules are in [CLAUDE.md](CLAUDE.md). Each cloud task already has an isolated checkout; an additional worktree is unnecessary unless explicitly requested.
