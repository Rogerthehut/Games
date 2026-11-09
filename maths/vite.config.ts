import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { parentPages } from "./scripts/parent-pages";

export default defineConfig({
  plugins: [preact(), parentPages()],
  base: "./",
  build: { assetsInlineLimit: 0 },
});
