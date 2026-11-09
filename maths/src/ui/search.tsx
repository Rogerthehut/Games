import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useApp } from "./context";
import { Icon } from "./icons";
import { quarterSearch } from "./search-catalog";

export function SearchDialog({ dialog }: { dialog: { current: HTMLDialogElement | null } }) {
  const { profile, go } = useApp();
  const [query, setQuery] = useState("");
  const find = useMemo(() => quarterSearch(profile), [profile]);
  const results = useMemo(() => find(query), [find, query]);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.scrollTo(0, 0);
    list.current?.scrollTo(0, 0);
  }, [query]);
  const openResult = (result: (typeof results)[number]) => {
    dialog.current?.close();
    const { destination } = result;
    if ("href" in destination) window.location.assign(destination.href);
    else go(destination.route, destination.back);
  };
  return (
    <dialog class="quarter-search" ref={dialog} aria-labelledby="quarter-search-title"
      onClose={() => setQuery("")}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div class="search-panel" ref={panel}>
        <header>
          <h2 id="quarter-search-title">Search Quarter</h2>
          <button type="button" class="btn small" aria-label="Close search" onClick={() => dialog.current?.close()}><Icon name="x" size={20} /></button>
        </header>
        <form role="search" onSubmit={(event) => { event.preventDefault(); if (results[0]) openResult(results[0]); }}>
          <label for="quarter-search-input">Find a skill, lesson or page</label>
          <input id="quarter-search-input" type="search" autoFocus autoComplete="off" maxLength={120}
            placeholder="Try fractions, angles or Year 6" value={query}
            onInput={(event) => setQuery(event.currentTarget.value)} />
        </form>
        <div class="search-results" ref={list}>
          <p class="small muted" role="status">
            {!query.trim() ? <>Use <code>*</code> for any number of letters or <code>?</code> for one. Try <code>frac*</code>.</>
              : results.length ? `${results.length} ${results.length === 1 ? "result" : "results"}`
              : "No results. Try a shorter word or a different spelling."}
          </p>
          {results.length > 0 && (
            <ul class="rows">
              {results.map((result) => (
                <li key={result.title + result.detail}>
                  <button class="row" type="button" onClick={() => openResult(result)}>
                    <span>{result.title}<small>{result.detail}</small></span>
                    <Icon name="chevron" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}
