/*
 * Fionn Engine — AR Model Loading Manager
 * Reusable across all heritage sites.
 *
 * Features:
 * - Disables AR until the active model is fully loaded.
 * - Displays model-viewer progress in a large accessible panel.
 * - Warms the browser cache with the next stop's model only.
 * - Reports current and next-model status in Developer Tools.
 */
(() => {
  "use strict";

  const state = {
    activeSrc: "",
    ready: false,
    progress: 0,
    preloadController: null,
    nextStatus: "Not started",
    initialiseAttempts: 0
  };

  const byId = (id) => document.getElementById(id);

  function modelFileName(url) {
    if (!url) return "—";
    try {
      const parsed = new URL(url, window.location.href);
      return decodeURIComponent(parsed.pathname.split("/").pop() || url);
    } catch {
      return String(url).split("/").pop() || String(url);
    }
  }

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = value;
  }

  function setPanelState(status, message) {
    const panel = byId("modelLoadingPanel");
    if (!panel) return;
    panel.dataset.status = status;
    setText("modelLoadingMessage", message);
  }

  function setProgress(value) {
    const percent = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    state.progress = percent;

    const bar = byId("modelLoadingBar");
    const track = byId("modelLoadingTrack");
    if (bar) bar.style.width = `${percent}%`;
    if (track) track.setAttribute("aria-valuenow", String(percent));

    setText("modelLoadingPercent", `${percent}%`);
    setText("devModelProgress", `${percent}%`);
  }

  function setLaunchEnabled(enabled, text) {
    const button = byId("launchAR");
    if (!button) return;

    const hasModel = Boolean(window.STOPS?.[window.current]?.model);
    button.disabled = !enabled || !hasModel;
    button.setAttribute("aria-disabled", String(button.disabled));

    if (text) button.textContent = text;
    button.classList.toggle("model-ready", enabled && hasModel);
  }

  function updateDeveloperStatus(status) {
    const badge = byId("devModelBadge");
    if (badge) {
      badge.textContent = status;
      badge.dataset.status = status.toLowerCase().replace(/\s+/g, "-");
    }
    setText("devModelReady", state.ready ? "Ready to launch" : "Not ready");
    setText("devNextModelStatus", state.nextStatus);
  }

  function resetForSource(src) {
    state.activeSrc = src || "";
    state.ready = false;
    setProgress(0);

    const filename = modelFileName(src);
    setText("modelLoadingFile", filename);
    setText("devModelName", filename);

    if (!src) {
      setText("modelLoadingTitle", "No AR scene at this stop");
      setPanelState("unavailable", "This stop does not currently have an AR model.");
      setLaunchEnabled(false, "AR COMING SOON");
      updateDeveloperStatus("Unavailable");
      return;
    }

    setText("modelLoadingTitle", "Preparing AR scene");
    setPanelState(
      "loading",
      "Please wait. The AR button will become available when the scene is ready."
    );
    setLaunchEnabled(false, "LOADING AR SCENE…");
    updateDeveloperStatus("Loading");
  }

  function markReady() {
    if (!state.activeSrc) return;
    state.ready = true;
    setProgress(100);
    setText("modelLoadingTitle", "Scene ready");
    setPanelState("ready", "The model is fully loaded. You can now enter AR.");
    setLaunchEnabled(true, "STEP INTO HISTORY");
    updateDeveloperStatus("Ready");
    preloadNextModel();
  }

  function markError() {
    state.ready = false;
    setText("modelLoadingTitle", "Scene could not be loaded");
    setPanelState(
      "error",
      "The model failed to load. Check your connection or try the Lite quality setting."
    );
    setLaunchEnabled(false, "AR UNAVAILABLE");
    updateDeveloperStatus("Error");
  }

  function onProgress(event) {
    const total = Number(event?.detail?.totalProgress);
    if (Number.isFinite(total)) {
      setProgress(total * 100);
    }
  }

  function currentModelUrl() {
    const model = byId("modelViewer");
    return model?.getAttribute("src") || "";
  }

  function syncCurrentSource() {
    const src = currentModelUrl();
    if (src === state.activeSrc) {
      const model = byId("modelViewer");
      if (src && model?.loaded && !state.ready) markReady();
      return;
    }

    resetForSource(src);

    const model = byId("modelViewer");
    if (src && model?.loaded) {
      markReady();
    }
  }

  async function preloadNextModel() {
    if (!Array.isArray(window.STOPS) || !Number.isFinite(window.current)) return;

    const nextIndex = window.current + 1;
    const next = window.STOPS[nextIndex];

    if (!next?.model) {
      state.nextStatus = nextIndex >= window.STOPS.length ? "End of tour" : "No model";
      updateDeveloperStatus(state.ready ? "Ready" : "Loading");
      return;
    }

    if (state.preloadController) state.preloadController.abort();
    state.preloadController = new AbortController();

    const path = typeof window.modelPath === "function"
      ? window.modelPath(next.model)
      : `models/${next.model}`;

    let url = path;
    try {
      const tier = window.FionnEngine?.quality?.selected || "standard";
      if (window.FionnEngine?.resolveTieredAsset) {
        url = await window.FionnEngine.resolveTieredAsset(path, tier);
      }
    } catch (error) {
      console.warn("Fionn next-model tier resolution failed:", error);
    }

    state.nextStatus = `Caching ${modelFileName(url)}…`;
    updateDeveloperStatus(state.ready ? "Ready" : "Loading");

    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "force-cache",
        signal: state.preloadController.signal
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

      // Read the body so the response is actually transferred into browser cache.
      await response.arrayBuffer();
      state.nextStatus = `Ready: ${modelFileName(url)}`;
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.warn("Fionn next-model preload failed:", error);
      state.nextStatus = `Could not cache ${modelFileName(url)}`;
    }

    updateDeveloperStatus(state.ready ? "Ready" : "Loading");
  }

  function blockEarlyLaunch(event) {
    if (state.ready) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const panel = byId("modelLoadingPanel");
    panel?.scrollIntoView({ behavior: "smooth", block: "center" });
    setPanelState("loading", "Please wait until the scene reaches 100% and shows “Scene ready”.");
  }

  function initialise() {
    const model = byId("modelViewer");
    const launch = byId("launchAR");

    if (!model || !launch) {
      state.initialiseAttempts += 1;
      if (state.initialiseAttempts < 30) setTimeout(initialise, 200);
      return;
    }

    launch.addEventListener("click", blockEarlyLaunch, true);
    model.addEventListener("progress", onProgress);
    model.addEventListener("load", markReady);
    model.addEventListener("error", markError);

    const observer = new MutationObserver(syncCurrentSource);
    observer.observe(model, {
      attributes: true,
      attributeFilter: ["src"]
    });

    // Tour rendering may change the current stop without replacing the element.
    const originalRenderStop = window.renderStop;
    if (typeof originalRenderStop === "function" && !originalRenderStop.__fionnLoadingWrapped) {
      const wrapped = function (...args) {
        const result = originalRenderStop.apply(this, args);
        queueMicrotask(syncCurrentSource);
        return result;
      };
      wrapped.__fionnLoadingWrapped = true;
      window.renderStop = wrapped;
    }

    syncCurrentSource();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }

  window.FionnModelLoading = {
    get ready() { return state.ready; },
    get progress() { return state.progress; },
    sync: syncCurrentSource,
    preloadNext: preloadNextModel
  };
})();
