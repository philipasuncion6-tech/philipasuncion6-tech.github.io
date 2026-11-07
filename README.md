# ASUNCION CHESS 3D

A Vite + chess.js + Capacitor Android chess game.

## GitHub Pages (user site)
This project is configured for the repository `philipasuncion6-tech.github.io`.
After uploading these files to that repository's `main` branch and enabling GitHub Actions as the Pages source, the site should publish at:

https://philipasuncion6-tech.github.io/

## Game controls
- Computer plays White and makes the first move.
- Player plays Black.
- Tap a black piece, then tap a highlighted destination.
- Pawn promotion offers Queen, Rook, Bishop, and Knight.
- Undo reverses the player's last move and the computer's preceding move when both exist.
- Flip Board changes the board view.

## Run locally
```bash
npm install
npm run dev
```

## Build web assets
```bash
npm run build
```

## Build Android APK
```bash
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

APK output:
`android/app/build/outputs/apk/debug/app-debug.apk`

## GitHub Actions
Push to `main`, or manually run **Build ASUNCION CHESS APK** from the Actions tab.
Download the `ASUNCION-CHESS-APK` artifact after the workflow completes.

The `Deploy ASUNCION CHESS 3D to Pages` workflow builds the website with the root path required by the `philipasuncion6-tech.github.io` user-site repository.

## Notes
- The app bundles chess.js with Vite, so chess rules work without a CDN connection.
- Google Fonts are optional decoration; the game itself does not depend on a CDN for chess logic.
- The computer opponent uses a small alpha-beta material/position search. It is a casual opponent, not a tournament-strength engine.


## Pi Network Sandbox
The web app loads the official Pi Network JavaScript SDK and initializes it with `Pi.init({ version: "2.0", sandbox: true })`. This enables Sandbox testing only; this build does not request Pioneer authentication or initiate Pi payments.

To run it in Pi Sandbox:
1. Open Pi Browser and visit the Pi Developer Portal at `develop.pinet.com`.
2. Register a **Testnet** app and configure its Development URL according to the current Pi Developer Portal checklist.
3. Open the generated Sandbox URL (typically `https://sandbox.minepi.com`) in a desktop browser.
4. In the Pi app, open **Pi Utilities** → **Authorize Sandbox**, then enter the authorization code shown by Sandbox.
5. Test the chess game. The game remains playable if the Pi SDK is unavailable, but Pi SDK features require the authorized Sandbox environment.

Official documentation: https://developers.minepi.com/docs/build-first-app/Sandbox
