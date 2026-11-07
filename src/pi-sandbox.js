// Pi Network SDK bootstrap and optional username sign-in for ASUNCION CHESS.
// Sandbox only. This module does not create payments or access wallet credentials.

let initializationPromise = null;

function setPiBadge(label) {
  const badge = document.querySelector(".live-pill");
  if (badge) badge.innerHTML = '<i></i> ' + label;
}

function loadPiSdk() {
  if (window.Pi) return Promise.resolve(window.Pi);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-pi-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Pi), { once: true });
      existing.addEventListener("error", () => reject(new Error("Pi SDK failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.minepi.com/pi-sdk.js";
    script.async = true;
    script.dataset.piSdk = "true";
    script.onload = () => window.Pi
      ? resolve(window.Pi)
      : reject(new Error("Pi SDK loaded but window.Pi is unavailable."));
    script.onerror = () => reject(new Error("Could not load the Pi Network SDK."));
    document.head.appendChild(script);
  });
}

export function initializePiSandbox() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      setPiBadge("PI SANDBOX • CONNECTING");
      const pi = await loadPiSdk();

      if (typeof pi.init !== "function") {
        throw new Error("Pi.init is not available in this SDK.");
      }

      await pi.init({ version: "2.0", sandbox: true });
      setPiBadge("PI SANDBOX • READY");
      return pi;
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

// The username is returned for display only. Production identity checks must
// be performed by a trusted backend using the access token and Pi Platform API.
export async function authenticatePiUser() {
  const pi = await initializePiSandbox();

  if (typeof pi.authenticate !== "function") {
    throw new Error("Pi authentication is unavailable in this browser.");
  }

  const authResult = await pi.authenticate(["username"], () => {});
  const username = authResult?.user?.username;

  if (!username) {
    throw new Error("Pi did not return a username. Please try again.");
  }

  return username;
}
