import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const contentIndex = resolve(root, "src/content/index.js");
const fixture = resolve(root, "src/engine/__fixtures__/content.js");

// Until src/content/index.js exists, the engine's import of it resolves to the engine's small
// fixture content, so the UI can be wired to the real engine before the story lands.
function contentFallback() {
  let warned = false;
  return {
    name: "lakshyam-content-fallback",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer || !source.endsWith("content/index.js")) return null;
      if (resolve(dirname(importer), source) !== contentIndex || existsSync(contentIndex)) return null;
      if (!warned) {
        warned = true;
        this.warn("src/content/index.js not found: using the engine's fixture content.");
      }
      return fixture;
    },
  };
}

export default defineConfig({
  plugins: [contentFallback()],
});
