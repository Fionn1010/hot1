/*
 * Fionn Heritage — Tara navigation hotfix
 * Loaded after the existing modules.
 *
 * The current tour attaches many controls in one minified statement. If an
 * earlier control is missing or throws during initialisation, the Next button
 * listener is never reached. This isolated binding keeps navigation available.
 */
(function () {
  "use strict";

  const BOUND_FLAG = "fionnNextHotfixBound";
  let advancing = false;

  function safeAdvance(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (advancing) return;
    advancing = true;

    try {
      if (typeof window.beginWalkingToNext === "function") {
        window.beginWalkingToNext();
        return;
      }

      // Defensive fallback for the existing Tara globals.
      if (
        typeof window.current === "number" &&
        Array.isArray(window.STOPS) &&
        typeof window.renderStop === "function"
      ) {
        if (window.current >= window.STOPS.length - 1) {
          if (typeof window.showEnd === "function") window.showEnd();
          return;
        }
        window.current += 1;
        window.renderStop(false, "WALKING");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      console.error("Tara navigation could not find beginWalkingToNext().");
      alert("The next stop could not be opened. Please reload the page.");
    } finally {
      window.setTimeout(function () {
        advancing = false;
      }, 500);
    }
  }

  function bind() {
    const button = document.getElementById("nextBtn");
    if (!button || button.dataset[BOUND_FLAG] === "1") return false;

    button.dataset[BOUND_FLAG] = "1";
    // Capture phase deliberately bypasses a broken or duplicated older listener.
    button.addEventListener("click", safeAdvance, true);
    return true;
  }

  if (!bind()) {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  }

  // The button survives normal renders, but this also covers future DOM swaps.
  const observer = new MutationObserver(bind);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
