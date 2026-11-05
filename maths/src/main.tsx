import { render } from "preact";
import "katex/dist/katex.min.css";
import "./fonts.css";
import "./styles.css";
import { App } from "./ui/app";

render(<App />, document.getElementById("app")!);
