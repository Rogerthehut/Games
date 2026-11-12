// "Copy" on the subscribe page: copies the feed address and says so.
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-copy]");
  if (!b) return;
  var text = b.getAttribute("data-copy"), done = b.getAttribute("data-done") || "Copied", was = b.textContent;
  var finish = function () { b.textContent = done; setTimeout(function () { b.textContent = was; }, 1800); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(finish, function () { var i = document.getElementById("feed-url"); if (i) i.select(); });
  else { var i = document.getElementById("feed-url"); if (i) { i.select(); try { document.execCommand("copy"); finish(); } catch (_) { /* the address is selected for a manual copy */ } } }
});
