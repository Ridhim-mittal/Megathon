# Scalability: from 1,500 students to many more

The brief: *start with ~1,500 students (Class 11–12, underserved communities across Hyderabad) and
design to scale*, with the experience **language-ready**, **NGO-integrated** and
**privacy-conscious**. This page says what "scale" means for Lakshyam, what is already built, how
to add a language, and what comes next. Numbers were measured on the production build.

## 1. What scales, and how

| Dimension | What could break at scale | What Lakshyam does |
|---|---|---|
| **Servers and cost** | Logins, databases and APIs slow down or cost money per student | There is no server. The game is a static site served from a CDN; all play runs on the student's device. 1,500 or 1,50,000 players need the same setup. |
| **Concurrency** | A whole school starts at 10 am | A CDN serves static files to any number of players at once; there is nothing to overload. |
| **Data and slow networks** | Phones on 3G, shared data packs | First visit ≈ 0.8 MB (gzipped). Each player downloads only their language. After the first visit the game works **offline** and a return visit downloads almost nothing. |
| **Languages** | Every new language makes the game heavier and needs a developer | One list (`src/languages.js`), one pack per language, translation in a spreadsheet, English fallback for lines not done yet (section 3). |
| **Content** | More stories, lessons and personas get inconsistent | Content is data (JSON) checked against the spec by `npm run validate:content` on every pull request. |
| **Devices** | Cheap Android phones, old lab PCs | Pixel art drawn in code (no heavy images); budgets on every download (`npm run size`). |
| **Privacy** | Student data on servers | Nothing leaves the device: no accounts, no tracking, progress stays in the browser. Nothing to leak, no consent forms to collect. |
| **Team and quality** | Four people editing at once, regressions | Area ownership (CLAUDE.md), 125 unit tests, content validator, 14 browser tests, all run by GitHub Actions on every pull request. |
| **Rollout and updates** | Fixes must reach every school | Each deploy is atomic; the offline worker always checks for a new page, so a fix reaches students on their next visit. Rolling back is redeploying the previous build. |

## 2. Capacity for the 1,500-student pilot

| | English player | Hindi / Telugu player |
|---|---|---|
| Game (JS, gzipped) | 370 KB | 370 KB + 116 KB pack |
| Styles | 71 KB | 71 KB |
| Fonts (only the glyphs shown) | ≈ 335 KB | ≈ 335 KB |
| **First visit** | **≈ 0.8 MB** | **≈ 0.9 MB** |
| Music (streams only with sound on) | 4.2 MB | 4.2 MB |
| Return visit | a few KB (page check) | a few KB |

Before the language split every player downloaded every language (667 KB of JS). With ten
languages that would have been about 1.7 MB; now it stays at 370 KB plus one ~120 KB pack.

**1,500 students** all starting on the same day ≈ 1.3 GB without music, ≈ 7.5 GB with it: well
inside the free tier of Netlify, Vercel or Cloudflare Pages (Cloudflare Pages has no bandwidth limit).
Hosting cost: ₹0. Server capacity needed: none.

**Deploy:** `npm run build`, publish `dist/`. `vercel.json` (Vercel) and `public/_headers` (Netlify,
Cloudflare Pages) set the cache rules: built files for a year (their names change every build),
the page and offline worker re-checked on every visit.

## 3. Adding a language

Example: Urdu (`ur`), widely spoken in Hyderabad.

1. **Register it**: add one entry to `src/languages.js` (code, its own name, a greeting, the pet name
   "kanna" in that script, the words for lakh and crore, and whether letters join).
2. **Export the sheet**: `npm run lang:export -- ur` writes `translations/ur.csv` with every English
   line (about 1,600 screen lines and 3,000 story lines). It opens in Excel or Google Sheets.
3. **Translate**: translators (teachers, NGO volunteers, a translation service) fill the `ur`
   column. They keep `{player}`, `{cast:…}` and `[[glossary]]` words as they are.
4. **Import**: `npm run lang:import -- ur translations/ur.csv`. Lines with broken placeholders, or
   whose English changed since the export, are skipped and listed. Content files are edited in
   place, one line per translation, so teammates' work does not conflict.
5. **Check**: `npm run lang:status` shows how much is done; `npm run validate:content` and `npm test`.

A language can go live **half translated**: anything missing shows in English, and the next
export lists only what is still missing. Fonts: browsers already have fonts for most Indian
scripts; to make one look the same on every device, add its Noto font package in `src/main.jsx`.

Today: `npm run lang:status` shows Hindi and Telugu at 97%. The 111 missing screen lines are all
in the Swipe Bazaar mini-game (`arcade.swipe.*`), which shows in English for now.

**Known gap:** Urdu is written right to left. The registry and packs support it, but the screens
need a right-to-left layout pass (`dir="rtl"`) before Urdu ships.

## 4. What else comes under scalability (next steps)

**Delivery with NGOs (the brief's "NGO-integrated")**
- A one-page **facilitator guide** per session (60–90 minutes; what to say before and after; the
  discussion questions in each lesson). Facilitators scale the program; the game scales the content.
- **Lab setup**: open the game once on each lab PC while online; after that it runs offline.
- **Shared devices**: progress is saved per browser, so on a shared lab PC each student should use
  their own browser profile, or a "Who's playing?" switch could be added later.
- **Class codes**: an optional code typed at the start, so an NGO can group results by school.

**Measuring learning without collecting personal data**
- The game already knows which lessons a player has seen and applied. An optional, anonymous
  "share my progress" step (a class code plus lesson counts, no names) sent to a small serverless
  endpoint would let NGOs see class-level progress. It is off by default and the only network
  call the game would make.
- `src/content/quiz.json` already holds pre- and post-questions, but no screen shows them yet. Asking
  them at the start and the end would show learning gains for the pitch and for funders.

**Reach**
- More languages through the sheet workflow: Urdu (after the right-to-left pass), Marathi, Kannada,
  Tamil, Odia, Bengali.
- More personas (the city storyline is already "coming soon") for students in other contexts.
- Install to the home screen (the manifest is in place) and share the link over WhatsApp.

**Operations**
- Privacy-friendly error reporting (crash messages only, no personal data) so problems in the
  field are seen.
- Content review before each release, against the guardrail *educate, do not recommend
  investments; simulations are assumptions, not promises*.

**Smaller optimisations**
- The music could be re-encoded at about 120 kbps (4.2 MB → 2.6 MB) once someone has checked it by ear.
- The language picker loads the Hindi and Telugu fonts to show their names (~245 KB); with many
  languages, those names could use small font subsets.

## 5. How it is built (for developers)

- `src/languages.js`: the language list, read by the UI, the engine's checks and the scripts.
- `scripts/lang-packs.js` (Vite plugin): content JSON is served with English only; each other
  language becomes a pack (its screen strings plus "string *n* of file *f*").
- `src/i18n/packs.js`: loads the chosen pack before the first screen (and on a switch) and puts the
  strings back into the same content objects, so game code reads `{ en, hi, te }` as before. Text
  copied out of content (for example in a saved game) is matched by its English.
- `src/i18n/translate.js` + `scripts/lang.js`: the spreadsheet workflow; tested in `translate.test.js`.
- `public/sw.js`: the offline worker (production builds only). `public/manifest.webmanifest`: install.
- `scripts/check-size.js` (`npm run size`): download budgets. `.github/workflows/ci.yml`: all checks
  on every pull request.
