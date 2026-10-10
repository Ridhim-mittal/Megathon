# Lakshyam 🌱

A story-driven financial-literacy game for Class 11–12 students, designed for laptops. Pick a dream and a look, then live from age 11 to 36 in a pixel-art village, one story chapter at a time: a childhood prologue, then **The OTP Heist** (school), **The Telegram Guru** (college), **The Loan App** (first job), **Wedding Season** (marriage & family) and **Golden Harvest** (the dream). Like Detroit: Become Human, every chapter branches: choices open or lock later ones, chapters end in different outcomes (from "The Scam Buster" to "Bankrupt at 24"), and a flowchart shows the paths you didn't take. A full life takes about 15–20 minutes. English, हिंदी and తెలుగు.

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
3. **Follow the objective** (top of the screen): it says what to do and where. A gold trail and arrow lead to the place; walk with the arrow keys or WASD and press **Enter** at the door, or press **Go to …** to walk there. Each scene is a story card: press **1–4** or click to choose; **Why?** explains every outcome with numbers, and **Learn more** opens the Gyaan lesson.
4. **Race the clock:** some scenes are urgent (a red objective and countdown: report a fraud in the golden hour, rush to the hospital). Some choices must be made before a timer runs out, like a scammer shouting for an OTP.
5. **STOP warnings:** before a very bad choice (sharing an OTP, a loan app, becoming a money mule, a Ponzi scheme) the screen flashes STOP with Ammamma's warning. You can think again, or go ahead and live with it. Choices locked by earlier decisions show a 🔒 and why; a red banner warns when debt gets dangerous.
6. **Evidence:** seeing through scams (recording the call, checking SEBI registration, photographing a fake certificate) adds to your evidence file. In the last chapter it decides whether Lucky Prakash is caught.
7. **Flowcharts:** each chapter ends with its outcome and a Detroit-style flowchart: your path lit, branches from earlier lives shown, the rest locked. Open the current chapter's flowchart from the objective panel any time.
8. **The phone** arrives in college (press **P**): messages (some scenes arrive here), the bank and the invest app (index, debt and active mutual funds and four shares, from age 18). The **Exchange** app is a practice stock market: a live order book with simulated traders, market and limit orders, and seven missions that teach the spread, queues, slippage and how news moves prices (practice money only). Updates also pop up on the map without opening the phone. At 36: your **story ending**, the money ending, your **Gyaan report**, **Parallel Life** and the **ending gallery**.

The top bar switches language and sound at any time. Sound is on by default: the background music ("Sunlight on the Well", `public/audio/`) starts with the first tap or key press. Progress is saved in this browser's `localStorage` only; `?seed=demo` gives a fixed, rehearsed life. All numbers are illustrative teaching assumptions, not advice.

## Files

- `src/engine/`: the pure, seeded life engine; `src/engine/README.md` lists its API.
- `src/content/`: storylines, cards, lessons, glossary, documents and endings; `src/content/story/` holds the six story chapters (scenes, choices, routing, outcomes) in en/hi/te.
- `src/ui/gameAdapter.js`: the only door from the UI to the engine and content.
- `src/screens/`: one file per screen (`App.jsx` routes them). `StoryScreen.jsx` is the game (story mode) and `src/screens/story/` its objective panel, STOP warning, timers, chapter title cards, flowcharts and story ending; `MapScreen.jsx` is the older free-roam chapter mode; `src/screens/map/` holds its HUD, quest log and chapter cards, and `src/screens/life/` the card, outcome, budget, shop and mini-game views.
- `src/ui/map/`: the pixel village: `village.js` (tile map, places, paths), `art.js` (code-drawn pixel art and characters), `MapCanvas.jsx` (movement, camera, clicks).
- `src/ui/PhoneLite.jsx`, `src/ui/GyaanLite.jsx`: the in-game phone and the lesson reader.
- `src/ui/exchange/`: the phone's practice stock exchange: `orderbook.js` (matching engine and simulated traders, tested in `orderbook.test.js`) and `StockExchange.jsx`.
- `src/ui/Notifications.jsx`: phone notifications over the map.
- `src/ui/`: shared components (HUD, jars, portraits, document viewer, Ask Ammamma, rich text).
- `src/i18n/`: UI strings in `en.json`, `hi.json`, `te.json` and the `useT()` hook.
- `src/World.jsx`: the earlier SVG village (no longer routed).
- `src/styles.css`, `src/game-scene.css`, `src/life.css`, `src/pixel.css`: styles (`pixel.css` is the map game).

## Browser checks

```bash
npx playwright install chromium  # One-time browser installation for developers
npm run test:e2e
```

The browser suite plays start → language → village → dream → the prologue (following the objective through three scenes) → its outcome and flowchart, checks the STOP warning and timed OTP scene, arrow-key walking, switches between English, Hindi and Telugu (checking nothing overflows), checks saving/Continue and Ask Ammamma, and the 1024×768, 1280×720 and 1366×768 layouts. It starts its own Vite server on port 5180. To use an existing Chromium installation in a cloud machine, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to that browser's executable path.

## Team workflow

Use the assigned cloud branch or a personal `<name>/<task>` branch. Do not push to `main`. Team rules are in [CLAUDE.md](CLAUDE.md). Each cloud task already has an isolated checkout; an additional worktree is unnecessary unless explicitly requested.
