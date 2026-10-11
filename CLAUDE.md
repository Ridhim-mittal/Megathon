# CLAUDE.md — Megathon team rules

Four people commit to this repo, each through their own Claude Code session, often at the
same time. These rules exist to keep us out of merge-conflict hell. Follow them every session.

## Branch workflow (one branch per person)
- **Nobody commits or pushes to `main` directly.** `main` only changes by merging a pull request.
- Each person works on their own branch, named `<name>/<task>` (e.g. `alice/login-form`).
  In a Claude Code cloud session the branch is pre-assigned — use that one.
- One Claude session = one branch. Never commit to a teammate's branch.
- **At the end of every prompt that changed code**: merge `origin/main` into your branch, run
  the checks, commit, push your branch, and then finish your reply with this reminder:
  > ✅ Pushed to `<branch>`. **Merge it into `main` now:** open a PR from `<branch>` → `main`
  > on GitHub and merge it (link: `https://github.com/Ridhim-mittal/Megathon/compare/main...<branch>`).
  If the merge of `origin/main` had conflicts you could not safely resolve, say so instead of
  giving the reminder. Skip the reminder for prompts that changed nothing (questions, reviews).
- After the user merges, the next task starts again from the latest `origin/main`.
- To pick up teammates' work, merge `main` into your branch: `git fetch origin main && git merge origin/main`.
  Use merge, not rebase — rebasing a pushed branch needs a force-push, which is blocked.

## Before you start any task
0. Read `docs/GAME_SPEC.md` (the shared contract) if you haven't this session.
1. `git fetch origin main` and branch from it: `git checkout -b <name>/<task> origin/main`
   (or, if your branch already exists, `git merge origin/main` into it).
2. Check `git log --oneline -15 origin/main` to see what teammates just merged.
3. Stay inside the area of the task. If a change needs to touch someone else's area
   (see **Ownership**), keep that part as small as possible and say so in the commit message.

## While working
- Make small, focused commits. One logical change per commit.
- Do NOT reformat, rename, or reorganize files unrelated to the task — that is the #1
  cause of conflicts between parallel sessions.
- Do NOT edit lockfiles by hand. Change dependencies only with the package manager.
- Never commit secrets. Real values go in `.env` (git-ignored); add the key name with a
  placeholder to `.env.example`.
- Keep this file and `README.md` current when you add a new command, service, or folder.

## Before you push
1. Run the project's checks (fill these in once the stack is chosen):
   - Install: `npm ci` (Node.js 22.12+ or 24 LTS)
   - Run dev: `npm run dev`
   - Checks: `npm test` and `npm run build`
2. `git fetch origin main && git merge origin/main`, resolve any conflicts, re-run checks.
3. `git push -u origin <your-branch>` — never `main`.
4. When the work is usable, open a PR into `main`. The human merges it on GitHub.
- Never `git push --force`. Never rewrite history others may have pulled.
- If a merge conflict is in code you did not write, stop and ask the human rather than guessing.

## Commit messages
`<area>: <what changed>` — e.g. `frontend: add login form`, `backend: fix /api/score 500`.

## Ownership
Three Claude sessions build the game in parallel; `docs/GAME_SPEC.md` is the contract between them.
Read it fully before any task. Stay inside your area.

| Area | Owner | Files |
|------|-------|-------|
| Engine & systems | Claude A (Person 1) | `src/engine/**`, `scripts/**`, `src/game.js`, `src/game.test.js`, `api/**`, `vite.config.js`, `scripts` in `package.json`, section 7 of `docs/GAME_SPEC.md` |
| Story & content | Claude B (Person 2) | `src/content/**` |
| Screens, art, motion, sound | Claude C (Person 3) | `src/main.jsx`, `src/World.jsx`, `src/screens/**`, `src/ui/**`, `src/i18n/**`, `src/*.css`, `public/**`, `tests/**`, `index.html`, dependencies in `package.json` |
| Spec, research, pitch | Person 4 | `docs/**`, `README.md` |

- Only Claude C adds npm dependencies.
- Need something from another area? Don't edit their files. Write it in your own
  `docs/requests/from-<engine|content|ui>.md` and tell your human.

## Project overview
Lakshyam is a story-driven financial-literacy life simulation for Class 11–12 students from
underserved communities. The player picks a storyline (an underprivileged persona) and a dream, then
lives from age 11 to 36, one year per turn, learning the full curriculum in `docs/GAME_SPEC.md`
section 4. React 19 + Vite, plain JavaScript.

- `src/engine/`: pure, seeded game engine (no React); `src/engine/README.md` lists its API.
- `src/content/`: storylines, cards, lessons, glossary, documents, endings, in English, Hindi and Telugu.
- `src/screens/`, `src/ui/`, `src/i18n/`: React screens, components and UI strings.
- `src/ui/dev/`: the dev menu (` toggles it in `npm run dev`; `?dev=1` in a build): jump to any chapter or
  scene, open any mini-game, cheats. It reads missions and game registries, so new ones show up by themselves.
- `src/World.jsx`: the illustrated village scene. Its cozy style is the game's visual identity.
- `api/ask.js`: optional AI mentor endpoint; the game works fully offline without it.

Checks: `npm test` (engine and rules), `npm run validate:content` (content against the spec, once it
exists), `npm run build`, `npm run size` (download budget, after a build), and `npm run test:e2e`
(Playwright; install Chromium first). GitHub Actions runs them on every pull request.

Languages: listed once in `src/languages.js`. Text stays as `{ "en", "hi", "te" }` in content and
`src/i18n/<code>.json` for screens; the build makes one pack per language (`scripts/lang-packs.js`).
Translators use `npm run lang:export` / `lang:import` (a CSV). See `docs/SCALABILITY.md`.
Never put API keys in client code. Real values go in `.env` (git-ignored). See README.md for running
the game.
