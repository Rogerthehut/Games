const finder = document.querySelector("#test-finder");
if (finder) {
  const form = finder.querySelector(".test-finder-search");
  const input = form.querySelector("input");
  const status = form.querySelector("[role=status]");
  const words = (value) => value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").match(/[a-z0-9]+/g) ?? [];
  const entries = [...finder.querySelectorAll("[data-test-area]")].map((element) => ({
    element,
    terms: words(element.dataset.testArea + " " + element.textContent),
  }));

  function filterTests() {
    const query = words(input.value).filter((word) => !["11", "plus", "test", "grammar", "school", "schools"].includes(word));
    let matches = 0;
    for (const { element, terms } of entries) {
      const match = query.every((word) => terms.some((term) => term.startsWith(word)));
      element.hidden = !match;
      if (match) matches++;
    }
    status.textContent = matches ? `${matches} ${matches === 1 ? "area" : "areas"}` : "No matching areas. Try a nearby town or a shorter school name.";
  }

  input.addEventListener("input", filterTests);
  form.hidden = false;
  filterTests();
}
