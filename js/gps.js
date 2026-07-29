/*
 * Hill of Tara — GPS navigation
 * Includes "Walk in the Park" compact zigzag developer mode.
 *
 * Normal mode:
 *   Uses the real coordinates stored in STOPS.
 *
 * Walk in the Park mode:
 *   Uses window.walkInParkStops, created by the mode toggle in index.html.
 *   Stops are approximately 10 metres apart in a zigzag.
 */

(() => {
  "use strict";

  const NORMAL_ARRIVAL_RADIUS_METRES = 15;
  const PARK_ARRIVAL_RADIUS_METRES = 5;

  const PARK_DIRECTIONS = [
    "Start point",
    "Walk forward approximately 10 metres",
    "Turn right and walk approximately 10 metres",
    "Walk forward approximately 10 metres",
    "Turn left and walk approximately 10 metres",
    "Walk forward approximately 10 metres",
    "Turn right and walk approximately 10 metres",
    "Walk forward approximately 10 metres"
  ];

  let gpsWatchId = null;
  let parkArrivalTimer = null;

  function element(id) {
    if (typeof window.$ === "function") return window.$(id);
    return document.getElementById(id);
  }

  function translatedUI() {
    if (typeof UI !== "undefined") {
      return UI[currentLanguage] || UI.en || {};
    }
    return {};
  }

  function isWalkInParkMode() {
    return window.walkInParkMode === true ||
      localStorage.getItem("walkInParkMode") === "true";
  }

  function normaliseCoordinates(candidate) {
    if (!candidate) return null;

    const lat = Number(candidate.lat ?? candidate.latitude);
    const lng = Number(candidate.lng ?? candidate.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function getParkStop(index) {
    if (typeof window.getWalkInParkStop === "function") {
      const stop = normaliseCoordinates(window.getWalkInParkStop(index));
      if (stop) return stop;
    }

    if (Array.isArray(window.walkInParkStops)) {
      const stop = normaliseCoordinates(window.walkInParkStops[index]);
      if (stop) return stop;
    }

    try {
      const saved = JSON.parse(localStorage.getItem("walkInParkStops") || "[]");
      if (Array.isArray(saved)) {
        const stop = normaliseCoordinates(saved[index]);
        if (stop) return stop;
      }
    } catch (error) {
      console.warn("Could not restore Walk in the Park stops.", error);
    }

    return null;
  }

  function getActiveTarget() {
    const fallback =
      typeof STOPS !== "undefined" && Array.isArray(STOPS)
        ? normaliseCoordinates(STOPS[current])
        : null;

    if (!isWalkInParkMode()) return fallback;

    if (typeof window.getActiveTourCoordinates === "function") {
      const active = normaliseCoordinates(
        window.getActiveTourCoordinates(current, fallback)
      );
      if (active) return active;
    }

    return getParkStop(current) || fallback;
  }

  function updateParkLabels() {
    if (!isWalkInParkMode()) return;

    const direction =
      PARK_DIRECTIONS[Math.min(current, PARK_DIRECTIONS.length - 1)] ||
      "Continue to the next virtual stop";

    const destination = element("gpsDest");
    const note = element("gpsNote");

    if (destination) {
      destination.textContent = `Virtual Stop ${current + 1}: ${direction}`;
    }

    if (note) {
      note.textContent =
        "Walk in the Park mode is active. Follow the compact zigzag route, or use “I’m at the next stop” as a manual override.";
    }
  }

  async function enableGPS() {
    const t = translatedUI();

    if (!navigator.geolocation) {
      alert(t.gpsUnavailable || "GPS is not available on this device.");
      return;
    }

    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        await DeviceOrientationEvent.requestPermission();
      } catch (error) {
        console.warn("Compass permission was not granted.", error);
      }
    }

    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId);
    }

    gpsWatchId = navigator.geolocation.watchPosition(
      position => {
        userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        updateCompass();
      },
      error => {
        console.warn("GPS watch failed.", error);
        alert(
          t.locationNeeded ||
          "Location access is required. Please enable GPS and try again."
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 15000
      }
    );

    const button = element("gpsBtn");
    if (button) button.textContent = t.gpsActive || "GPS Active";

    updateParkLabels();
    updateCompass();
  }

  function distance(lat1, lon1, lat2, lon2) {
    const radius = 6371000;
    const toRadians = value => value * Math.PI / 180;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function bearing(lat1, lon1, lat2, lon2) {
    const toRadians = value => value * Math.PI / 180;
    const toDegrees = value => value * 180 / Math.PI;

    const y =
      Math.sin(toRadians(lon2 - lon1)) *
      Math.cos(toRadians(lat2));

    const x =
      Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
      Math.sin(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.cos(toRadians(lon2 - lon1));

    return (toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  function triggerArrival() {
    if (
      arrivalAnnounced ||
      tourMode !== "WALKING" ||
      typeof arriveAtCurrentStop !== "function"
    ) {
      return;
    }

    arrivalAnnounced = true;

    const gpsSection = element("gpsSection");
    gpsSection?.classList.add("arrivalPulse");

    window.clearTimeout(parkArrivalTimer);
    parkArrivalTimer = window.setTimeout(() => {
      gpsSection?.classList.remove("arrivalPulse");
      arriveAtCurrentStop();
    }, 900);
  }

  function updateCompass() {
    const t = translatedUI();
    const target = getActiveTarget();
    const distanceDisplay = element("distance");
    const pointer = element("pointer");

    updateParkLabels();

    if (!target) {
      if (distanceDisplay) {
        distanceDisplay.innerHTML =
          `—<small>${t.metres || "metres"}</small>`;
      }
      console.warn("No GPS target is available for stop", current + 1);
      return;
    }

    if (!userPos) {
      if (distanceDisplay) {
        distanceDisplay.innerHTML =
          `—<small>${t.metres || "metres"}</small>`;
      }
      return;
    }

    const metresAway = Math.round(
      distance(userPos.lat, userPos.lng, target.lat, target.lng)
    );

    const targetBearing = bearing(
      userPos.lat,
      userPos.lng,
      target.lat,
      target.lng
    );

    const rotation = (targetBearing - heading + 360) % 360;

    if (distanceDisplay) {
      distanceDisplay.innerHTML =
        `${metresAway}<small>${t.metres || "metres"}</small>`;
    }

    if (pointer) {
      pointer.style.transform = `rotate(${rotation}deg)`;
    }

    const arrivalRadius = isWalkInParkMode()
      ? PARK_ARRIVAL_RADIUS_METRES
      : NORMAL_ARRIVAL_RADIUS_METRES;

    if (
      metresAway <= arrivalRadius &&
      !arrivalAnnounced &&
      tourMode === "WALKING"
    ) {
      triggerArrival();
    }
  }

  const gpsButton = element("gpsBtn");
  gpsButton?.addEventListener("click", enableGPS);

  window.addEventListener("deviceorientationabsolute", event => {
    if (event.alpha != null) {
      heading = event.alpha;
      updateCompass();
    }
  });

  window.addEventListener("deviceorientation", event => {
    if (event.webkitCompassHeading != null) {
      heading = event.webkitCompassHeading;
    } else if (event.alpha != null) {
      heading = 360 - event.alpha;
    }
    updateCompass();
  });

  window.addEventListener("walkinparkready", () => {
    window.walkInParkMode = true;
    arrivalAnnounced = false;
    updateParkLabels();
    updateCompass();
  });

  window.addEventListener("storage", event => {
    if (
      event.key === "walkInParkMode" ||
      event.key === "walkInParkStops"
    ) {
      arrivalAnnounced = false;
      updateCompass();
    }
  });

  // Preserve the global functions used by the rest of the tour.
  window.distance = distance;
  window.bearing = bearing;
  window.updateCompass = updateCompass;
})();
