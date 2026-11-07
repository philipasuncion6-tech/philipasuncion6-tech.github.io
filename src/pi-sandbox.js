// Pi Network SDK bootstrap for ASUNCION CHESS.
// This build is configured for Pi Sandbox testing only. It does not request
// authentication scopes, create payments, or handle any wallet credentials.

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

export async function initializePiSandbox() {
  setPiBadge("PI SANDBOX • CONNECTING");
  const pi = await loadPiSdk();

  if (typeof pi.init !== "function") {
    throw new Error("Pi.init is not available in this SDK.");
  }

  await pi.init({ version: "2.0", sandbox: true });
  setPiBadge("PI SANDBOX • READY");
  return true;
}
