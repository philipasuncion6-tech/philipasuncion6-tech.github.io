# ASUNCION CHESS 3D — Testnet and Mainnet Readiness

This checklist records the current integration boundary and the work required before a Mainnet release. It is a planning document, not a claim that any item is already complete.

## Current verified project shape

- The Vite app uses `chess.js` for legal chess moves and Three.js for the 3D board.
- The game has a 2D fallback when WebGL cannot initialize.
- The computer plays White; the player plays Black.
- The web app initializes Pi SDK with `sandbox: true`.
- The optional Pi login requests only the `username` scope.
- The current client displays the SDK-returned username but does not send the access token to a backend or verify the Pioneer through `GET /v2/me`.
- The Pi Browser website flow has been manually observed to complete in Sandbox. The Android APK sign-in flow has shown a pending approval state, so APK Pi sign-in remains unverified.
- Guest Mode must continue to work without Pi authentication.
- No Pi payments, rewards, or wallet transactions are implemented.

## Phase 1 — Stabilize the chess game

- [ ] Confirm legal move handling for all piece types.
- [ ] Test check, checkmate, stalemate, castling, en passant, and all four pawn promotions.
- [ ] Test Undo after a player move and after the computer reply.
- [ ] Test New Game while the computer is thinking; verify an old delayed move cannot affect the new game.
- [ ] Test Easy, Medium, and Hard on a representative Android phone and in Pi Browser.
- [ ] Confirm the game remains usable when WebGL, audio, or network font loading is unavailable.
- [ ] Add automated tests around game logic and AI state restoration before changing the chess engine or dependency versions.

## Phase 2 — Improve the interface without regressions

- [ ] Preserve the Pearl Royale / Diamond Edition identity: pearl ivory, deep obsidian, restrained gold, and sapphire accents.
- [ ] Keep board squares and pieces crisp; avoid haze, overexposure, and excessive reflections.
- [ ] Verify board sizing, tap targets, labels, controls, and move history on narrow Android screens.
- [ ] Verify 2D fallback styling matches the 3D visual language.
- [ ] Respect reduced-motion preferences and ensure sound can be disabled.

## Phase 3 — Testnet / Sandbox validation

- [ ] Keep `Pi.init({ version: "2.0", sandbox: true })` in the Testnet build.
- [ ] Test the registered Testnet app from its Pi Browser / Sandbox URL.
- [ ] Test successful Pi username authentication, cancellation, SDK load failure, and network interruption.
- [ ] Do not label a client-only username as a verified identity.
- [ ] Keep the chess game playable in Guest Mode if Pi login fails or is unavailable.
- [ ] Keep the Android APK Pi login marked as pending until a supported, repeatable Android flow is verified.
- [ ] Do not add payment scopes or wallet permissions for a chess game that has no payment feature.

## Phase 4 — Build secure authentication before Mainnet

- [ ] Add a backend service with HTTPS and server-side environment configuration.
- [ ] Frontend calls `Pi.authenticate(["username"], ...)` and sends only the returned access token to the app backend.
- [ ] Backend calls Pi Platform API `GET https://api.minepi.com/v2/me` with `Authorization: Bearer <accessToken>`.
- [ ] Backend rejects invalid tokens and returns only the verified user fields needed by the app.
- [ ] Use the UID returned by the Platform API as the trusted app identity; never trust a client-supplied username or UID.
- [ ] Apply rate limits, request-size limits, safe error messages, and HTTPS.
- [ ] Do not log access tokens or place them in URLs, analytics, source maps, or client storage.
- [ ] Keep any Server API Key exclusively on the backend. Never commit it to GitHub or include it in frontend bundles.
- [ ] Add backend tests for valid tokens, invalid tokens, missing tokens, upstream errors, and rate limiting.
- [ ] Decide whether the app actually needs persistent app sessions; if so, issue a secure, short-lived session cookie with appropriate HttpOnly, Secure, and SameSite settings.

Authentication reference: https://developers.minepi.com/docs/authenticate-user/Authentication

Platform API reference: https://developers.minepi.com/docs/api-reference/PlatformAPI

## Phase 5 — Separate Mainnet app and release preparation

- [ ] Keep the existing Testnet app for development. Do not assume its network can be changed in place.
- [ ] When ready, register a separate Mainnet app in the Pi Developer Portal.
- [ ] Complete the Mainnet app checklist and verify the production HTTPS domain.
- [ ] Configure the production app to initialize the SDK with `Pi.init({ version: "2.0", sandbox: false })`.
- [ ] Deploy and test the production web app inside Pi Browser.
- [ ] Verify server-side identity validation against the production Platform API.
- [ ] Review Privacy Policy and Terms so they accurately describe authentication, backend processing, retention, and any future features.
- [ ] Verify Guest Mode, mobile layout, accessibility, error recovery, and release rollback.
- [ ] Submit the app for any required listing review only after the production checklist is complete.

Pi registration guide: https://developers.minepi.com/docs/build-first-app/RegisterApp

Production access guide: https://developers.minepi.com/docs/build-first-app/Production

Mainnet launch guide: https://developers.minepi.com/docs/build-first-app/Launch

## Payments are out of scope for now

ASUNCION CHESS 3D currently has no Pi payment feature. Do not generate payment flows, request the `payments` scope, add an app-wallet transaction flow, or promise Pi rewards unless the product owner explicitly decides to introduce a real payment feature. If payments are ever added, implement the complete server-side approval and completion flow and test it in Sandbox first.

## Release rule

A successful APK build or a successful Sandbox username display is not, by itself, proof of Mainnet readiness. Mainnet readiness requires verified backend authentication, a separately registered Mainnet app, production configuration, domain verification, and end-to-end testing.
