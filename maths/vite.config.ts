import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { parentPages } from "./scripts/parent-pages";
import { conceptStudyPages } from "./scripts/concept-pages";
import { siteContent } from "./scripts/site-pages";

export default defineConfig({
  plugins: [preact(), parentPages(), conceptStudyPages(), siteContent()],
  base: "./",
  build: { assetsInlineLimit: 0 },
  // for development: send API calls to the local server (npm run server)
  server: { proxy: { "/api": process.env.VITE_API_PROXY ?? "http://localhost:8787" } },
});
