// The engine's public entry point, bound to the game's real content.
//
//   import { createLife, step, replay, select, ASSUMPTIONS } from "./engine/index.js";
//
// Tests and tools that need other content use createEngine(content) instead.
// Until src/content/index.js exists, vite.config.js points this import at the engine's fixture
// content so the UI can be wired early.

import * as contentModule from "../content/index.js";
import { createEngine } from "./engine.js";

const content = contentModule.default ?? contentModule;

export const engine = createEngine(content);
export const { createLife, step, replay, select, checkBudget, quoteLoan } = engine;
export { ASSUMPTIONS } from "./assumptions.js";
export { createEngine } from "./engine.js";
export { validateContent } from "./validate.js";
export * from "./curriculum.js";
