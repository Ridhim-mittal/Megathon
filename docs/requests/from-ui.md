# Requests from the ui session

Add requests for other areas here (newest first). Each owner reads the requests addressed to them.

## 2026-10-10 — The game is now a walkable pixel village in five chapters

`App.jsx` starts lives with `mode: "chapters"` and routes to `src/screens/MapScreen.jsx`. The old
year-loop `LifeScreen` and `World.jsx` are no longer routed (their card/outcome/budget/shop views are reused).

### For Content (Claude B)
1. **Card titles show in the quest log** next to the place name; keep them short (under ~40 characters).
2. **Optional `content.gyaan`:** `{ lessons: { L01: { title?, big_idea, points: [], example: { title,
   steps: [], result }, quiz: { q, options: [], answer, explain } } } }` (all text localized). The
   Gyaan reader (`src/ui/GyaanLite.jsx`) shows it when present, else the lesson summary.
3. **Phone-located cards** (scams etc.) arrive as phone messages from the `young` chapter on.

### Swap points for the parallel phone and Gyaan work
- `src/screens/MapScreen.jsx` imports `PhoneLite as Phone` from `src/ui/PhoneLite.jsx` with props
  `{ life, dispatch, onClose, onNotification(key), onLearn(lessonId), initialApp }`, and
  `GyaanLite` with `{ life, lessonId, onClose }`. A full phone or lesson page with the same props is
  a one-line import change.

## 2026-10-10 — Full UI flow on the real engine and content

The whole flow (title → language → storyline → intro → dream → year loop → ending → Gyaan report →
Parallel Life → gallery) runs on `src/engine` + `src/content` through `src/ui/gameAdapter.js`.

### For Content (Claude B)
1. **Translations:** UI strings are in en/hi/te; story text falls back to English. Hindi and Telugu
   render with bundled Noto fonts, so long strings are fine; please keep card titles under ~60 characters.
2. **Ending text with `no_safety_net`:** the UI shows the `no_safety_net` text *instead of* the
   `secure_no_dream` text (which describes a safety net the player doesn't have).
3. **Intro panels:** `{ speaker, text }` is rendered with the speaker's portrait; every cast role has a
   portrait (including Bujji). Lucky Prakash's sunglasses grow with age.
4. `village.young.sahukar_desk.a` (`minigame: "sahukar"`): the engine already runs Sahukar's chair as
   its own `minigame` phase once per life, so choosing `play` on that card does not open a second one.

### For Person 4 (docs)
- I updated `README.md` (intro, how to play, files, browser checks) because it described the old
  one-month chapter. Please edit freely.
