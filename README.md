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
