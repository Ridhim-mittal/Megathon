import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-devanagari";
import "@fontsource-variable/noto-sans-telugu";
import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/600.css";
import "./styles.css";
import "./game-scene.css";
import "./life.css";
import "./pixel.css";
import "./dialog.css";
import "./storybook.css";
import "./budget.css";
import "./title.css";
import "./dream.css";
import "./games.css";
import "./story.css";
import "./arcade.css";
import "./calm.css";
import "./minigames.css";
import "./savefirst.css";
import "./dev.css";
import { App } from "./screens/App.jsx";
import { loadLanguage } from "./i18n/packs.js";
import { loadSettings } from "./ui/persist.js";

// The saved language's pack comes first, so the first screen is already in that language.
const start = () =>
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
loadLanguage(loadSettings().lang).catch(() => {}).finally(start);

// Offline after the first visit (public/sw.js). Production only, so development always runs fresh.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}
