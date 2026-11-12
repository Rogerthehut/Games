// Entry for build-paper-sample.ts: shows one printable paper on its own page, with a stand-in for the app's navigation.
import { render } from "preact";
import { Ctx, type AppCtx } from "../src/ui/context";
import { PrintPaper } from "../src/ui/print-paper";

const none = () => {};
const ctx = { go: none, leave: none } as unknown as AppCtx;
const params = new URLSearchParams(location.search);
render(<Ctx.Provider value={ctx}><PrintPaper kind="maths" number={Number(params.get("n") ?? 1)} /></Ctx.Provider>, document.body);
