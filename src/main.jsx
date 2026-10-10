import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-devanagari";
import "@fontsource-variable/noto-sans-telugu";
import "./styles.css";
import "./game-scene.css";
import "./life.css";
import { App } from "./screens/App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
