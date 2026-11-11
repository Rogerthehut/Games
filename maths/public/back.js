// "Back" on the public pages: goes to the page the visitor came from on this site, or to the home page when there isn't one.
document.addEventListener("click", function (e) {
  var a = e.target.closest && e.target.closest("[data-back]");
  if (!a) return;
  var from = document.referrer;
  if (history.length > 1 && from && new URL(from).origin === location.origin) { e.preventDefault(); history.back(); }
});
