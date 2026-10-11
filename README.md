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

1. **Play** (or **Start a new life**) → pick your look and name in "Who are you?" → choose a language → choose your life (the village; the city is "coming soon") → meet your family → choose your dream.
2. **Each chapter** opens with a title card, then one question: **Save first?** Pick Little, Some or Lots (needs are fixed; the rest is fun money). A live forecast shows what it means: the age your dream arrives (🎯 on a timeline), how many surprises your safety jar covers (🛟) and how much fun is left (🍬). Savings fill the safety jar first, then the dream. During the chapter most years bring a **surprise** (fever, a broken phone, school fees, a family wedding): a pop-up shows which jar paid, and with no safety money it is borrowed at interest. A jar dock on the map keeps 🛟 safety, 🍬 fun and any 😬 loan in view.
3. **Follow the objective** (top of the screen): it says what to do and where. A gold trail and arrow lead to the place; walk with the arrow keys or WASD and press **Enter** at the door, or press **Go to …** to walk there. Each scene is a story card: press **1–4** or click to choose; **Why?** explains every outcome with numbers, and **Learn more** opens the Gyaan lesson as a few picture slides (big idea, key points, a step-by-step example, a myth card to flip, a calculator and a quick quiz).
4. **Race the clock:** some scenes are urgent (a red objective and countdown: report a fraud in the golden hour, rush to the hospital). Some choices must be made before a timer runs out, like a scammer shouting for an OTP.
5. **STOP warnings:** before a very bad choice (sharing an OTP, a loan app, becoming a money mule, a Ponzi scheme) the screen flashes STOP with Ammamma's warning. You can think again, or go ahead and live with it. Choices locked by earlier decisions show a 🔒 and why; a red banner warns when debt gets dangerous.
6. **Evidence:** seeing through scams (recording the call, checking SEBI registration, photographing a fake certificate) adds to your evidence file. In the last chapter it decides whether Lucky Prakash is caught.
7. **Flowcharts:** each chapter ends with its outcome and a Detroit-style flowchart: your path lit, branches from earlier lives shown, the rest locked. Open the current chapter's flowchart from the objective panel any time.
8. **Mini-games:** the bank (marked 🎮) hosts **Savings Snowball** (roll a savings ball that earns on itself; SALE! signs break it). Each ends with stars and a one-line lesson; best scores are kept in this browser. They are also in the phone's **Arcade** app. Like free mobile games, the arcade now and then shows an **ad** as a game opens (about one in three, never twice in a row) that look like the game's own posters, and they are scams: a jatara spin-to-win that ends at a UPI PIN screen, "get paid to play Jar Dash" that keeps asking for deposits, a ₹1 "Lakshyam PRO" whose pre-ticked small print is a ₹999-a-month AutoPay, a Sahukar Now loan app that wants your contacts and photos, "free gold coins" behind a fake bank login and OTP, and a "free phone for champions" with delivery and customs fees. Clicking one opens a realistic fake site on a phone; close it any time, or report the ad (⚑). A short reveal shows what was lost (practice money only) and the red flags.
9. **Interest race (mini-game):** choosing the state scholarship at college starts a race: in each of 5 rounds, three offers show P, R and T, and you pick the one with the most simple interest (P × R × T ÷ 100) before the clock runs out. Get 4 of 5 right to win the scholarship, or try again (or choose another way). You can also play it any time from **Mini-game: Interest race** on the title screen.
10. **The first scene is a game, Rat Guard:** rats swarm Ammamma's tin box; click them (or press Space) to POOF them, stage after stage, until "DANGER! HIGH FREQUENCY" brings too many and one gets in and eats ₹500. The first time, only the tin box can be chosen (the bank is locked: "Banks are for rich people"). After the cutscene the bank unlocks: in the bank, rats bonk off the vault and nothing is lost; keep the tin box and they get in again. What you choose sets the story's path. In the bank round, rats that reach the vault clang off, see stars and run; after five, the rest give up. The rats are code-drawn pixel art that scurry, stop to sniff and curve in. Play it again any time in the prologue at **Home 🎮**, or from **Mini-game: Rat Guard** on the title screen (with your best score).
11. **More choices you play, not read:** the best option in other key scenes is also a mini-game you must win (a 🎮 tag on the choice says so; lose, and you can try again or choose something else):
    - **Fine Print Hunter** (first job, choosing the bank loan over the loan app): tap the 5 hidden charges in QuickCash's "only 1.5% a month" agreement, work out what you really pay back (₹19,000 in hand, ₹24,800 back), then pick the cheaper loan by "how much you pay back for every ₹100 you get" (₹131 vs the bank's ₹110). Also playable from the Arcade.
    - **SIP Garden** (family money plan, "Spread it"): a one-minute pixel-art lane defence about mutual funds and SIPs. Three fund lanes (Equity fund: a sapling that fires rockets; Debt fund: a shield cannon; Gold fund: a gold cannon) and a Fixed deposit (a brick safe that pays interest coins) lead to your piggy-bank vault. Each fund has a live **NAV** (shown on its lane button, with a faint NAV chart along the lane): ₹100 buys units at today's NAV, and a lane's value (units × NAV) levels up its defender. Thieves walk down every lane evenly: the Inflation goblin (gold hits it twice as hard, FD only half), the Debt goblin, the Market-drop raccoon and the Scam shadow (tap to report it). An empty lane lets them into the vault; a lane far below the rest flashes **NEED DIVERSIFICATION!** **Auto-SIP** buys ₹50 of every lane each month: more units when the NAV is low. In the crash year equity's NAV falls 25% and the game asks whether to keep your SIP going. Survive 3 years; the report shows units held, the average price your SIP paid against today's NAV, and how evenly you spread. Add `?speed=4` to the URL to test it faster.
    - **Flood Rescue** (family chapter, before "The water rises"): rains are coming, and Nanna's crop is worth ₹1,20,000. Insure it for ₹2,400 or skip it. Then the canal bursts: the field drowns, water rushes through the door and rises through the house, and you have 35 seconds to tap 4 things into your bag: the insurance policy, Aadhaar, the bank passbook, the land papers, the emergency cash tin, or tempting things that don't help (TV, silk saree, sweets, radio). Whatever the water reaches floats away. The crop is lost either way; only insurance brings its money back (quickly if you saved the policy and an ID), and the cash tin pays for the walls instead of a loan. Also in the Arcade.
12. **The phone** arrives in college (press **P**): messages (some scenes arrive here), the bank and the invest app (index, debt and active mutual funds and four shares, from age 18). The **Exchange** app is a practice stock market: a live order book with simulated traders, market and limit orders, and seven missions that teach the spread, queues, slippage and how news moves prices (practice money only). Updates also pop up on the map without opening the phone. At 36: your **story ending**, the money ending, your **Gyaan report**, **Parallel Life** and the **ending gallery**.

The top bar switches language and sound at any time. Sound effects are synthesized in `src/ui/sound.js` (no audio files) and kept quiet on purpose: one master level through a limiter, calibrated so big moments sit about 8 dB and small sounds about 18 dB under the music, and each effect has a minimum gap so hovers, footsteps and coins never pile up. They cover clicks, hovering highlighted words, coins everywhere, chapter fanfares and endings, the STOP alarm, ticking timers, footsteps and doors, the phone, notifications, lesson slides, and each mini-game (slashes and slices, the car's engine, drift screech, horns and passing traffic, kite flaps, rat poofs, and more). Sound is on by default: the background music ("Sunlight on the Well", `public/audio/`) starts with the first tap or key press. Progress is saved in this browser's `localStorage` only; `?seed=demo` gives a fixed, rehearsed life. All numbers are illustrative teaching assumptions, not advice.

## Files

- `src/engine/`: the pure, seeded life engine; `src/engine/README.md` lists its API.
- `src/content/`: storylines, cards, lessons, glossary, documents and endings; `src/content/story/` holds the six story chapters (scenes, choices, routing, outcomes) in en/hi/te.
- `src/ui/gameAdapter.js`: the only door from the UI to the engine and content.
- `src/screens/`: one file per screen (`App.jsx` routes them). `StoryScreen.jsx` is the game (story mode) and `src/screens/story/` its objective panel, STOP warning, timers, chapter title cards, flowcharts and story ending; `MapScreen.jsx` is the older free-roam chapter mode; `src/screens/map/` holds its HUD, quest log and chapter cards, and `src/screens/life/` the card, outcome, budget, shop and mini-game views.
- `src/ui/map/`: the pixel maps: `village.js` (village tile map, places, paths), `art.js` (code-drawn village art and characters), `city.js` and `cityArt.js` (the town of the First Job chapter: roads you cross at zebra crossings, the PG hostel, supermarket and ATM, park, hospital, bank and tech park, with moving cars), `mapkit.js` (shared path finding), `maps.js` (which map each story mission uses) and `MapCanvas.jsx` (movement, camera, clicks).
- `src/ui/PhoneLite.jsx`, `src/ui/GyaanLite.jsx`: the in-game phone and the lesson reader.
- `src/ui/exchange/`: the phone's practice stock exchange: `orderbook.js` (matching engine and simulated traders, tested in `orderbook.test.js`) and `StockExchange.jsx`.
- `src/ui/Notifications.jsx`: phone notifications over the map.
- `src/ui/games/`: mini-games that decide story choices (`choiceGames.js` maps a choice to its game; `MiniShell.jsx` is their shared frame; `InterestRace`, `FinePrintHunter` (its loan maths in `finePrint.js`)), styled by `src/games.css` and `src/minigames.css`.
- `src/ui/arcade/`: the mini-games: `games.js` (pure game logic, tested in `games.test.js`) and `Arcade.jsx` (title card, countdown, canvas, result); `ads.js` and `ScamAds.jsx` the scam ads and the fake sites behind them (tested in `ads.test.js`).
- `src/ui/`: shared components (HUD, jars, portraits, document viewer, Ask Ammamma, rich text).
- `src/i18n/`: UI strings in `en.json`, `hi.json`, `te.json` and the `useT()` hook.
- `src/World.jsx`: the earlier SVG village (no longer routed).
- `src/styles.css`, `src/game-scene.css`, `src/life.css`, `src/pixel.css`: styles (`pixel.css` is the map game); `src/arcade.css` the mini-games; `src/calm.css` (loaded last) the calmer story-game look: icon top bar, one-line objective, bell notifications, simpler outcomes and Gyaan slides.

## Browser checks

```bash
npx playwright install chromium  # One-time browser installation for developers
npm run test:e2e
```

The browser suite plays start → language → village → dream → the prologue (following the objective through three scenes) → its outcome and flowchart, checks the STOP warning and timed OTP scene, arrow-key walking, switches between English, Hindi and Telugu (checking nothing overflows), checks saving/Continue and Ask Ammamma, and the 1024×768, 1280×720 and 1366×768 layouts. It starts its own Vite server on port 5180. To use an existing Chromium installation in a cloud machine, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to that browser's executable path.

## Team workflow

Use the assigned cloud branch or a personal `<name>/<task>` branch. Do not push to `main`. Team rules are in [CLAUDE.md](CLAUDE.md). Each cloud task already has an isolated checkout; an additional worktree is unnecessary unless explicitly requested.
