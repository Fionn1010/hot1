/*
 * Hill of Tara — Continue/Next navigation repair v2
 *
 * Repairs all three controls that may be labelled Continue:
 *   #arContinue
 *   #postArContinue
 *   #nextBtn
 *
 * This file must be loaded after the existing Tara scripts.
 */
(function () {
  "use strict";

  let locked = false;

  function advance(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    if (locked) return;
    locked = true;

    try {
      // Tara's existing navigation function.
      if (typeof beginWalkingToNext === "function") {
        beginWalkingToNext();
        return;
      }

      console.error("Tara navigation function beginWalkingToNext() was not available.");
      alert("The next stop could not open. Please reload the tour.");
    } catch (error) {
      console.error("Tara Continue navigation failed:", error);
      alert("The next stop could not open. Please reload the tour.");
    } finally {
      window.setTimeout(function () {
        locked = false;
      }, 600);
    }
  }

  function bindButton(id) {
    const button = document.getElementById(id);
    if (!button || button.dataset.fionnContinueFix === "1") return;

    button.dataset.fionnContinueFix = "1";

    // Capture mode lets this repair run even when an older handler fails.
    button.addEventListener("click", advance, true);
    button.addEventListener("touchend", function (event) {
      // Click normally follows touchend. Only intervene where click is suppressed.
      if (event.defaultPrevented) advance(event);
    }, true);
  }

  function bindAll() {
    bindButton("arContinue");
    bindButton("postArContinue");
    bindButton("nextBtn");
  }

  bindAll();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAll, { once: true });
  }

  new MutationObserver(bindAll).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
