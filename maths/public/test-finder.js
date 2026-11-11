const finder = document.querySelector("#test-finder");
if (finder) {
  const form = finder.querySelector(".test-finder-search");
  const input = form.querySelector("input");
  const status = form.querySelector("[role=status]");
  const words = (value) => value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").match(/[a-z0-9]+/g) ?? [];
  const entries = [...finder.querySelectorAll("[data-test-area]")].map((element) => ({
    element,
    terms: words(element.dataset.testArea + " " + element.textContent),
    councils: (element.dataset.councils ?? "").split("|").filter(Boolean).map((name) => name.toLowerCase()),
  }));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const show = (visible) => { for (const { element } of entries) element.hidden = !visible(element); };

  // A UK postcode, or just its first half ("BR1 3AB", "br13ab" and "BR1" all work). Only the first half is ever sent anywhere.
  const POSTCODE = /^([A-Z]{1,2}[0-9][A-Z0-9]?)\s*([0-9][A-Z]{2})?$/i;
  const asOutward = (text) => {
    const m = POSTCODE.exec(text.trim().replace(/\s+/g, " "));
    return m ? m[1].toUpperCase() : null;
  };

  function filterWords() {
    const query = words(input.value).filter((word) => !["11", "plus", "test", "grammar", "school", "schools"].includes(word));
    let matches = 0;
    for (const { element, terms } of entries) {
      const match = query.every((word) => terms.some((term) => term.startsWith(word)));
      element.hidden = !match;
      if (match) matches++;
    }
    status.textContent = matches ? plural(matches, "area", "areas") : "No matching areas. Try a nearby town, your council, or a shorter school name.";
  }

  let sequence = 0, timer = 0;
  async function lookUp(code) {
    const mine = ++sequence;
    status.textContent = `Looking up ${code}…`;
    let areas = null;
    try {
      const response = await fetch(`/api/outcode?code=${encodeURIComponent(code)}`, { headers: { Accept: "application/json" } });
      if (response.ok) areas = (await response.json()).areas;
    } catch { /* handled below */ }
    if (mine !== sequence) return; // they have typed something else since
    if (!Array.isArray(areas)) {
      show(() => true);
      status.textContent = `We couldn't look up ${code} just now. Search by your council, town or school name instead.`;
      return;
    }
    const names = areas.map((name) => name.toLowerCase());
    let matches = 0;
    for (const { element, councils } of entries) {
      const match = councils.some((name) => names.includes(name));
      element.hidden = !match;
      if (match) matches++;
    }
    const where = areas.filter((name) => name !== "England" && name !== "Scotland" && name !== "Wales");
    status.textContent = matches
      ? `${plural(matches, "area uses", "areas use")} a selective test near ${code}${where.length ? ` (${where.join(", ")})` : ""}. Check the entry year with each school.`
      : `We don't list a selective test for ${code}${where.length ? ` (${where.join(", ")})` : ""}. Most councils don't have one. Try a nearby town, or ask your council's admissions team.`;
  }

  function onInput() {
    clearTimeout(timer);
    const code = asOutward(input.value);
    if (!code) { sequence++; filterWords(); return; }
    // wait a moment so a half-typed postcode doesn't trigger a lookup for every key
    timer = setTimeout(() => lookUp(code), /\d[A-Za-z]{2}\s*$/.test(input.value.trim()) ? 80 : 450);
  }

  input.addEventListener("input", onInput);
  form.hidden = false;
  onInput();
}
