# Lakshyam 🌱

A cosy 2D financial-literacy game for Class 11–12 students, designed for laptops. Press Play, enter a village, and visit your home to budget, handle a surprise, and explore how a different choice changes your story.

## Run locally

Use Node.js 22.12+ (or Node 24 LTS) and npm.

```bash
npm ci
npm run dev
```

Vite prints the development address. From another device on the same network, use the host machine's IP and the printed port. No API keys, database, or `.env` file are required.

```bash
npm test          # Financial rules, invalid inputs, and every allowed allocation
npm run build    # Production bundle in dist/
npm run preview  # Serve the production bundle for local verification
```

Deploy as a static Vite site: build command `npm run build`, output directory `dist`. Fonts, illustrations, and icons are bundled; gameplay makes no external requests.

## Village controls

- Click **Play** on the title screen to enter the village.
- Click **Your home** or **Open my jars** to divide the allowance. The budgeting and story screens open inside an in-game panel.
- Click the ground to move your character around the village path.
- Click **Ammamma** or the **Kirana shop** for dialogue. Shopping is not implemented in this chapter.
- Press **Escape** or the panel's close button to return to the village. Your current choices stay intact.
- Use the top-right controls for help, fullscreen, or the title screen. **Continue** returns to the same session.
- Designed and tested for laptop windows at 1024×768, 1280×720, and 1366×768. Mobile is outside the current scope.

## First playable chapter

1. Allocate a ₹2,000 monthly allowance across everyday needs, little joys, emergency savings, and a laptop goal. Use − and + to move ₹100 at a time. Cover at least ₹800 in essentials.
2. A bicycle repair costs ₹600. Needs and wants have already been spent this month.
3. Use emergency savings and then laptop savings, borrowing only an uncovered shortfall; or use emergency savings and borrow the remainder to protect the laptop jar.
4. See the exact money movements, remaining savings, borrowing costs, and next month's allowance after repayment.
5. Replay with another budget. The repair and payment approach stay identical, isolating the effect of the allocation. Compare both outcomes, including savings minus debt and changes to spending on enjoyment.

The starting budget is editable, not a recommended allocation. All amounts are fictional teaching assumptions: the laptop target is ₹12,000 and the example expensive loan charges 10% once, due next month. This is a one-month chapter, not an investment projection. Progress is held in memory and resets on refresh. There are no accounts or analytics.

## Files

- `src/game.js`: pure financial rules and constants; UI-independent.
- `src/game.test.js`: Node test suite, including fund-conservation checks over every allowed budget.
- `src/main.jsx`: title/village navigation, in-game panels, four jars, repair choices, results, and comparison.
- `src/World.jsx`: village artwork, character, building interactions, and title screen.
- `src/game-scene.css`: full-window village, HUD, scene animation, and in-game panels.
- `src/styles.css`: shared jar and story styles. Scene styles take precedence in the laptop game.
- `public/favicon.svg`: sprout mark.

## Browser checks

```bash
npx playwright install chromium  # One-time browser installation for developers
npm run test:e2e
```

The browser suite checks Play → village → jars, movement, dialogue, preserving a budget when leaving a room, title/Continue, both repair routes, replay, budget constraints, Escape behavior, and laptop viewport layouts. It starts its own Vite server on port 5180. To use an existing Chromium installation in a cloud machine, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to that browser's executable path.

## Team workflow

Use the assigned cloud branch or a personal `<name>/<task>` branch. Do not push to `main`. Team rules are in [CLAUDE.md](CLAUDE.md). Each cloud task already has an isolated checkout; an additional worktree is unnecessary unless explicitly requested.
