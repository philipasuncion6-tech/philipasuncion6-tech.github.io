# ASUNCION CHESS 3D

A Vite + Three.js + chess.js + Capacitor Android chess game.

## Current project status

- The chess game and computer opponent run independently of Pi sign-in.
- The web app initializes the Pi SDK in **Sandbox mode** for Testnet development.
- Optional Pi authentication currently requests the `username` scope and displays the returned username for presentation only.
- The current client does **not** send the Pi access token to a backend or verify identity through the Pi Platform API. Therefore, the displayed Sandbox username is not a server-verified identity.
- Pi sign-in from the Android APK is not considered complete; keep Guest Mode available. The Pi Browser web flow is the currently tested sign-in path.
- No Pi payments or wallet transactions are implemented.

## GitHub Pages

The project is configured for the repository `philipasuncion6-tech.github.io` and is deployed by the GitHub Actions workflow `Deploy ASUNCION CHESS 3D to GitHub Pages`.

Production web URL:
https://philipasuncion6-tech.github.io/

## Game controls

- Computer plays White and makes the first move.
- Player plays Black.
- Tap a black piece, then tap a legal destination.
- Pawn promotion offers Queen, Rook, Bishop, and Knight.
- Undo reverses the player's last move and the computer's preceding move when both exist.
- Flip Board changes the board view.
- Difficulty options are Easy, Medium, and Hard.

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

Push to `main` or manually run **Build ASUNCION CHESS APK** from the Actions tab. Download the `ASUNCION-CHESS-APK` artifact after the workflow completes.

The **Deploy ASUNCION CHESS 3D to GitHub Pages** workflow builds the website from the Vite project.

## Technical notes

- `src/main.js` contains the game flow, board interaction, and alpha-beta computer opponent.
- `src/scene3d.js` renders the Three.js board and pieces. A 2D fallback is provided when WebGL is unavailable.
- `chess.js` handles legal moves and game rules.
- Google Fonts are optional decoration; chess logic is bundled and does not depend on a CDN.
- The computer opponent is a casual material/position-search engine, not a tournament-strength engine.

## Pi Network Testnet / Sandbox

The app loads the official Pi JavaScript SDK and currently initializes it with:

```js
Pi.init({ version: "2.0", sandbox: true });
```

The optional sign-in calls `Pi.authenticate(["username"], ...)`. The current implementation displays the returned username only. It does not retain or verify the access token and must not be treated as production authentication.

To test the Pi Sandbox:

1. Open the Pi Developer Portal in Pi Browser at `develop.pinet.com`.
2. Open the registered **Testnet** app and configure its Development URL as instructed by the portal.
3. Open the Sandbox URL shown in the app checklist.
4. If the Sandbox asks for authorization, use **Pi Utilities → Authorize Sandbox** in the Pi app and enter the displayed code.
5. Test the game and optional username sign-in in Pi Browser. The game must remain playable in Guest Mode if Pi SDK features are unavailable.

Official guides:
- [Using Pi Sandbox for Development](https://developers.minepi.com/docs/build-first-app/Sandbox)
- [Pi Network Authentication](https://developers.minepi.com/docs/authenticate-user/Authentication)
- [Pi Platform API](https://developers.minepi.com/docs/api-reference/PlatformAPI)

## Mainnet preparation

Do not switch the existing Testnet app in place. Pi's Developer Portal documentation says the app network cannot be changed after registration; create a separate Mainnet app when the project is ready.

Before any Mainnet release:

1. Keep the Testnet app available for ongoing development and regression testing.
2. Implement a trusted backend endpoint that receives the access token returned by `Pi.authenticate()`.
3. Verify the token with the Pi Platform API `GET /v2/me` using `Authorization: Bearer <accessToken>`.
4. Use only the backend-verified Pi UID as the trusted user identity. Treat the frontend username as display data only.
5. Keep any Server API Key on the server in an environment variable; never commit it or expose it in browser code.
6. Configure the production app with `Pi.init({ version: "2.0", sandbox: false })` only when the separate Mainnet app and production URL are ready.
7. Test the production Pi Browser flow, privacy disclosures, error handling, and Guest Mode before requesting ecosystem listing review.

This chess game does not currently accept Pi payments. Do not add payment scopes, payment callbacks, wallet credentials, or an app-wallet transaction flow unless a real payment feature is deliberately planned and reviewed.

See [docs/mainnet-readiness.md](docs/mainnet-readiness.md) for the staged checklist.
