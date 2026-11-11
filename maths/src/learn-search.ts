import { makeSearchIndex } from "./engine/search";

/** The search box on the public study guides page. It uses the same matching as the search inside the app: wildcards (* and ?) and spelling tolerance. */
const form = document.querySelector<HTMLFormElement>("#learn-search");
const list = document.querySelector<HTMLUListElement>("#learn-list");
if (form && list) {
  const input = form.querySelector<HTMLInputElement>("input")!;
  const status = form.querySelector<HTMLElement>("[role=status]")!;
  const items = Array.from(list.querySelectorAll<HTMLLIElement>("li"));
  const find = makeSearchIndex(items.map((el) => ({ el, title: el.dataset.title ?? "", keywords: el.dataset.keywords ?? "" })));
  const original = items.slice();
  const hint = status.textContent ?? "";
  const run = () => {
    const q = input.value.trim();
    if (!q) {
      items.forEach((el) => { el.hidden = false; list.append(...original); });
      status.textContent = hint;
      return;
    }
    const hits = find(q).map((h) => h.el);
    const shown = new Set(hits);
    items.forEach((el) => { el.hidden = !shown.has(el); });
    list.append(...hits);
    status.textContent = hits.length ? `${hits.length} ${hits.length === 1 ? "guide" : "guides"}` : "No guides found. Try a shorter word or a different spelling.";
  };
  form.removeAttribute("hidden");
  form.addEventListener("submit", (e) => e.preventDefault());
  input.addEventListener("input", run);
}
