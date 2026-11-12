/** Writes src/landing/try-bank.json, the questions for the marketing page's "Try one" card.  npx tsx scripts/build-try-bank.ts  (or: npm run try-bank) */
import { writeFileSync } from "node:fs";
import { buildTryBank } from "../src/landing/try-bank-build";

const bank = buildTryBank();
writeFileSync(new URL("../src/landing/try-bank.json", import.meta.url), JSON.stringify(bank));
console.log(`${bank.length} questions from ${new Set(bank.map((b) => b.skill)).size} topics`);
