# Lakshyam 🌱

A cosy 2D financial-literacy game for Class 11–12 students. Make a small budget, handle a surprise, and explore how a different choice changes your story.

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
- `src/main.jsx`: illustrated scene, four jars, repair choices, results, comparison, and keyboard-accessible help dialog.
- `src/styles.css`: responsive styles, jar animations, and reduced-motion support.
- `public/favicon.svg`: sprout mark.

Browser validation covered both payment routes, replay, allocation constraints, keyboard dismissal of help, reset, and horizontal overflow at 320, 390, and 768px widths.

## Team workflow

Use the assigned cloud branch or a personal `<name>/<task>` branch. Do not push to `main`. Team rules are in [CLAUDE.md](CLAUDE.md). Each cloud task already has an isolated checkout; an additional worktree is unnecessary unless explicitly requested.
