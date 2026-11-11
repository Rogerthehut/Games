/** Kept so the old habit still works: the same as `npm run ops -- feedback`. */
process.argv.splice(2, 0, "feedback");
await import("./ops");
