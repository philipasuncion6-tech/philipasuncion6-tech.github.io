import chessPackage from "chess.js";
import { Capacitor } from "@capacitor/core";
import "./style.css";
import { createChessScene3D } from "./scene3d.js";
import { initializePiSandbox, authenticatePiUser } from "./pi-sandbox.js";

const Chess =
  chessPackage.Chess ||
  chessPackage.default?.Chess ||
  chessPackage.default ||
  chessPackage;

const game = new Chess();

const $ = (id) => document.getElementById(id);

const boardElement = $("board");
const statusTitle = $("status-title");
const statusText = $("status-text");
const statusIcon = $("status-icon");
const thinkingDots = $("thinking-dots");
const computerTurn = $("computer-turn");
const playerTurn = $("player-turn");
const moveList = $("move-list");
const toastElement = $("toast");
const promotionModal = $("promotion-modal");
const promotionOptions = $("promotion-options");

const glyphs = {
  w: {
    k: "♔", q: "♕", r: "♖",
    b: "♗", n: "♘", p: "♙"
  },
  b: {
    k: "♚", q: "♛", r: "♜",
    b: "♝", n: "♞", p: "♟"
  }
};

const pieceValues = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

let selectedSquare = null;
let legalTargets = [];
let lastMove = null;
let flipped = true; // Black (the player) starts at the bottom.
let thinking = false;
let pendingPromotion = null;
let toastTimer = null;
let computerMoveToken = 0;
let soundEnabled = true;
let audioContext = null;

// Keep expensive AI search off the Android UI thread.
let aiWorker = null;
let aiWorkerFailed = false;
try {
  aiWorker = new Worker(new URL("./chess-ai.worker.js", import.meta.url), { type: "module" });
} catch (error) {
  aiWorkerFailed = true;
  console.warn("Chess AI worker is unavailable; using the compatibility fallback.", error);
}


// AI SETTINGS
const MATE_SCORE = 100000;
let AI_SEARCH_DEPTH = 3;
let scene3d;
try {
  scene3d = createChessScene3D(boardElement, (name) => handleSquareClick(name));
} catch (error) {
  // WebGL can be unavailable on some mobile browsers. Keep the game playable.
  console.error("3D renderer unavailable; using the built-in 2D board.", error);
  boardElement.classList.remove("three-board-host");
  boardElement.classList.add("fallback-luxury-board");
  boardElement.style.cssText = "display:grid;position:relative;inset:auto;width:100%;height:auto;aspect-ratio:1;grid-template-columns:repeat(8,minmax(0,1fr));overflow:hidden;";
  const fallbackNotice = document.createElement("div");
  fallbackNotice.textContent = "3D MODE OFF • " + (error?.message || "WebGL initialization failed");
  Object.assign(fallbackNotice.style, {
    position: "absolute", left: "6px", right: "6px", bottom: "6px",
    zIndex: "20", padding: "6px 8px", borderRadius: "6px",
    background: "rgba(35,12,12,.94)", color: "#ffe0d5",
    border: "1px solid rgba(255,150,120,.55)", font: "600 10px/1.35 sans-serif",
    textAlign: "center", pointerEvents: "none", overflowWrap: "anywhere"
  });
  scene3d = {
    render(position, selected, targets, previousMove, checkedKing, isFlipped) {
      const rows = position.board();
      boardElement.replaceChildren();
      for (let screenRow = 0; screenRow < 8; screenRow++) {
        for (let screenCol = 0; screenCol < 8; screenCol++) {
          const row = isFlipped ? 7 - screenRow : screenRow;
          const col = isFlipped ? 7 - screenCol : screenCol;
          const square = "abcdefgh"[col] + (8 - row);
          const piece = rows[row][col];
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = "square " + ((row + col) % 2 ? "sq-dark" : "sq-light");
          if (square === selected) cell.classList.add("selected");
          if (targets.includes(square)) cell.classList.add("move-target");
          if (previousMove && (square === previousMove.from || square === previousMove.to)) cell.classList.add("last-move");
          if (checkedKing === square) cell.classList.add("in-check");
          cell.setAttribute("aria-label", square);
          if (piece) {
            const glyph = document.createElement("span");
            glyph.className = "piece " + (piece.color === "w" ? "white-piece" : "black-piece");
            glyph.textContent = glyphs[piece.color][piece.type];
            cell.appendChild(glyph);
          }
          cell.addEventListener("click", () => handleSquareClick(square));
          boardElement.appendChild(cell);
        }
      }
      boardElement.appendChild(fallbackNotice);
    }
  };
}

function playSound(kind = "move") {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const settings = kind === "capture"
      ? { frequency: 245, duration: 0.13, type: "triangle" }
      : kind === "check"
        ? { frequency: 620, duration: 0.2, type: "sine" }
        : { frequency: 390, duration: 0.085, type: "sine" };
    oscillator.type = settings.type;
    oscillator.frequency.setValueAtTime(settings.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(settings.frequency * 0.72, now + settings.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.duration + 0.02);
  } catch (error) {
    console.debug("Audio is unavailable in this browser.", error);
  }
}

function showToast(message) {
  toastElement.textContent = message;
  toastElement.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastElement.classList.remove("show");
  }, 2200);
}

function squareName(file, rank) {
  return "abcdefgh"[file] + rank;
}

function findKing(color) {
  const rows = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = rows[row][col];
      if (piece && piece.type === "k" && piece.color === color) {
        return "abcdefgh"[col] + (8 - row);
      }
    }
  }

  return null;
}

function renderBoard() {
  const checkedKing = game.in_check() ? findKing(game.turn()) : null;
  const history = game.history({ verbose: true });
  lastMove = history.length ? history[history.length - 1] : null;
  scene3d.render(game, selectedSquare, legalTargets, lastMove, checkedKing, flipped);
}

function clearSelection() {
  selectedSquare = null;
  legalTargets = [];
}

function handleSquareClick(name) {
  if (thinking || game.game_over() || pendingPromotion) {
    return;
  }

  // Player controls Black only.
  if (game.turn() !== "b") {
    showToast("Wait for the computer to move.");
    return;
  }

  const piece = game.get(name);

  if (selectedSquare) {
    const moves = game.moves({
      square: selectedSquare,
      verbose: true
    });

    const matchingMoves = moves.filter(
      move => move.to === name
    );

    if (matchingMoves.length > 0) {
      if (matchingMoves.some(move => move.promotion)) {
        openPromotion(matchingMoves);
      } else {
        makePlayerMove(selectedSquare, name);
      }
      return;
    }
  }

  if (piece && piece.color === "b") {
    selectedSquare = name;

    legalTargets = game.moves({
      square: name,
      verbose: true
    }).map(move => move.to);

    renderBoard();
    return;
  }

  clearSelection();
  renderBoard();
}

function makePlayerMove(from, to, promotion = "q") {
  let move;

  try {
    move = game.move({
      from,
      to,
      promotion
    });
  } catch (error) {
    move = null;
  }

  closePromotion();
  clearSelection();

  if (!move) {
    showToast("Invalid move.");
    render();
    return;
  }

  playSound(move.captured ? "capture" : game.in_check() ? "check" : "move");
  render();

  if (!game.game_over()) {
    startComputerMove();

  }
}

function openPromotion(moves) {
  pendingPromotion = moves;
  promotionOptions.innerHTML = "";

  const choices = ["q", "r", "b", "n"];

  choices.forEach(type => {
    const button = document.createElement("button");

    button.className = "promotion-choice";
    button.textContent = glyphs.b[type];
    button.setAttribute("aria-label", type);

    button.addEventListener("click", () => {
      const move = pendingPromotion.find(
        item => item.promotion === type
      );

      if (move) {
        makePlayerMove(move.from, move.to, type);
      }
    });

    promotionOptions.appendChild(button);
  });

  promotionModal.classList.remove("hidden");
  promotionModal.classList.add("show");
}

function closePromotion() {
  pendingPromotion = null;
  promotionModal.classList.add("hidden");
  promotionModal.classList.remove("show");
}

// ======================================
// CHESS AI - POSITION EVALUATION
// ======================================

function evaluatePosition(position, ply = 0) {
  if (position.in_checkmate()) {
    return position.turn() === "w"
      ? -MATE_SCORE + ply
      : MATE_SCORE - ply;
  }

  if (position.game_over()) return 0;

  let score = 0;
  const rows = position.board();

  let whiteBishops = 0;
  let blackBishops = 0;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = rows[r][f];

      if (!piece) continue;

      const sign = piece.color === "w" ? 1 : -1;

      let value = pieceValues[piece.type];

      const centerDistance =
        Math.abs(3.5 - f) + Math.abs(3.5 - r);

      const centerBonus =
        Math.round((7 - centerDistance) * 3);

      value += centerBonus;

      // Encourage pawn advancement.
      if (piece.type === "p") {
        const advance = piece.color === "w"
          ? 6 - r
          : r - 1;

        value += Math.max(0, advance) * 7;
      }

      if (piece.type === "b") {
        if (piece.color === "w") {
          whiteBishops++;
        } else {
          blackBishops++;
        }
      }

      score += sign * value;
    }
  }

  // Bishop pair bonus.
  if (whiteBishops >= 2) score += 30;
  if (blackBishops >= 2) score -= 30;

  return score;
}

// ======================================
// MOVE ORDERING
// ======================================

function moveOrderScore(move) {
  let score = 0;

  if (move.captured) {
    score +=
      10 * pieceValues[move.captured] -
      pieceValues[move.piece] / 10;
  }

  if (move.promotion) {
    score += pieceValues[move.promotion] + 800;
  }

  if (move.san && move.san.includes("+")) {
    score += 50;
  }

  if (move.san && move.san.includes("#")) {
    score += 100000;
  }

  return score;
}

function orderedMoves(position) {
  return position.moves({ verbose: true })
    .sort((a, b) => moveOrderScore(b) - moveOrderScore(a));
}

// ======================================
// MINIMAX + ALPHA BETA PRUNING
// ======================================

function minimax(
  position,
  depth,
  alpha,
  beta,
  maximizing,
  ply = 0
) {
  if (
    position.in_checkmate() ||
    position.game_over() ||
    depth <= 0
  ) {
    return evaluatePosition(position, ply);
  }

  const moves = orderedMoves(position);

  if (!moves.length) {
    return evaluatePosition(position, ply);
  }

  if (maximizing) {
    let best = -Infinity;

    for (const move of moves) {
      position.move(move.san);

      let score;

      try {
        score = minimax(
          position,
          depth - 1,
          alpha,
          beta,
          false,
          ply + 1
        );
      } finally {
        position.undo();
      }

      best = Math.max(best, score);
      alpha = Math.max(alpha, best);

      if (beta <= alpha) break;
    }

    return best;
  }

  let best = Infinity;

  for (const move of moves) {
    position.move(move.san);

    let score;

    try {
      score = minimax(
        position,
        depth - 1,
        alpha,
        beta,
        true,
        ply + 1
      );
    } finally {
      position.undo();
    }

    best = Math.min(best, score);
    beta = Math.min(beta, best);

    if (beta <= alpha) break;
  }

  return best;
}

// ======================================
// COMPUTER MOVE SELECTION
// Computer is WHITE.
// Player is BLACK.
// ======================================

function chooseComputerMove() {
  const moves = orderedMoves(game);

  if (!moves.length) return null;

  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of moves) {
    game.move(move.san);

    let score;

    try {
      score = minimax(
        game,
        AI_SEARCH_DEPTH - 1,
        -Infinity,
        Infinity,
        false,
        1
      );
    } finally {
      game.undo();
    }

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  // Random only among equally strong moves.
  return bestMoves[
    Math.floor(Math.random() * bestMoves.length)
  ] || moves[0];
}

// If the module worker fails, keep the game playable with the built-in AI.
function runCompatibilityFallback(token, notify = false) {
  let errorMessage = "";
  try {
    const move = chooseComputerMove();
    if (!move) throw new Error("No legal computer move found.");
    const played = game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });
    if (!played) throw new Error("Computer backup move was rejected.");
    playSound(played.captured ? "capture" : game.in_check() ? "check" : "move");
  } catch (error) {
    console.error("Computer backup AI error:", error);
    errorMessage = error.message || "Backup AI calculation failed.";
  } finally {
    if (token === computerMoveToken) {
      thinking = false;
      clearSelection();
      render();
      if (errorMessage) showToast("Computer error: " + errorMessage);
      else if (notify) showToast("Computer switched to backup AI mode.");
    }
  }
}

// Receive the AI result without blocking board animation or touch input.
if (aiWorker) {
  aiWorker.onmessage = (event) => {
    const { token, move, error } = event.data || {};
    if (token !== computerMoveToken) return;

    if (error || (!move && !game.game_over())) {
      aiWorkerFailed = true;
      console.warn("Chess AI worker returned no usable move; switching to backup AI.", error);
      runCompatibilityFallback(token, true);
      return;
    }

    try {
      if (move && !game.game_over() && game.turn() === "w") {
        const played = game.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || "q"
        });
        if (!played) throw new Error("Computer move was rejected.");
        playSound(played.captured ? "capture" : game.in_check() ? "check" : "move");
      }
    } catch (caught) {
      aiWorkerFailed = true;
      console.error("Computer AI result could not be applied; switching to backup AI.", caught);
      runCompatibilityFallback(token, true);
      return;
    }

    thinking = false;
    clearSelection();
    render();
  };

  aiWorker.onerror = (event) => {
    console.error("Chess AI worker failed; switching to backup AI.", event);
    aiWorkerFailed = true;
    runCompatibilityFallback(computerMoveToken, true);
  };
}

// ======================================
// COMPUTER TURN
// ======================================

function startComputerMove() {
  if (
    game.game_over() ||
    game.turn() !== "w" ||
    thinking
  ) {
    render();
    return;
  }

  const token = ++computerMoveToken;

  thinking = true;
  render();

  setTimeout(() => {
    // Ignore an old delayed move after New Game or Undo.
    if (token !== computerMoveToken) return;

    if (aiWorker && !aiWorkerFailed) {
      try {
        aiWorker.postMessage({ fen: game.fen(), depth: AI_SEARCH_DEPTH, token });
        return;
      } catch (error) {
        console.warn("Could not send position to chess AI worker; switching to backup AI.", error);
        aiWorkerFailed = true;
      }
    }

    // Compatibility fallback for unsupported or failed module workers.
    runCompatibilityFallback(token, aiWorkerFailed);
  }, 250);
}

// ======================================
// MOVE HISTORY
// ======================================

function updateHistory() {
  const history = game.history({ verbose: true });

  if (!history.length) {
    moveList.innerHTML =
      '<div class="empty-history">Moves will appear here.</div>';
    return;
  }

  moveList.innerHTML = "";

  for (let i = 0; i < history.length; i += 2) {
    const whiteMove = history[i];
    const blackMove = history[i + 1];

    const row = document.createElement("div");
    row.className = "move-row";

    const number = document.createElement("span");
    number.className = "move-num";
    number.textContent = `${Math.floor(i / 2) + 1}.`;

    const white = document.createElement("span");
    white.className = "white-notation";
    white.textContent = whiteMove.san;

    const black = document.createElement("span");
    black.className = "black-notation";
    black.textContent = blackMove ? blackMove.san : "…";

    row.append(number, white, black);
    moveList.appendChild(row);
  }
}

// ======================================
// GAME STATUS AND PANELS
// ======================================

function updatePanels() {
  const whiteToMove = game.turn() === "w";
  const over = game.game_over();

  $("side-to-move").textContent =
    whiteToMove ? "White" : "Black";

  $("move-number").textContent =
  Math.floor(game.history().length / 2) + 1;

  let result = "In progress";
  let title = "Your turn";
  let message = "Choose one of your Black pieces.";
  let icon = "♟";

  if (game.in_checkmate()) {
    result = whiteToMove ? "Black wins" : "White wins";

    title = whiteToMove
      ? "Checkmate! You win!"
      : "Computer wins!";

    message = "The game has ended by checkmate.";
    icon = "♛";
  } else if (game.in_stalemate()) {
    result = "Draw";
    title = "Stalemate!";
    message = "Neither side can make a legal move.";
    icon = "½";
  } else if (game.in_draw()) {
    result = "Draw";
    title = "Game drawn";
    message = "The game ended in a draw.";
    icon = "½";
  } else if (thinking) {
    title = "Computer is thinking...";
    message = "The computer is calculating its next move.";
    icon = "♚";
  } else if (whiteToMove) {
    title = "Computer's turn";
    message = "The computer is preparing its move.";
    icon = "♚";
  } else if (game.in_check()) {
    title = "You are in check!";
    message = "Protect your king immediately.";
    icon = "⚠";
  }

  $("game-result").textContent = result;
  statusTitle.textContent = title;
  statusText.textContent = message;
  statusIcon.textContent = icon;

  computerTurn.textContent = thinking
    ? "THINKING"
    : whiteToMove && !over
      ? "COMPUTER TURN"
      : "COMPUTER";

  playerTurn.textContent =
    !whiteToMove && !over ? "YOUR TURN" : "WAIT";

  computerTurn.classList.toggle(
    "active",
    whiteToMove && !over
  );

  playerTurn.classList.toggle(
    "active",
    !whiteToMove && !over
  );

  thinkingDots.classList.toggle("visible", thinking);
}

function render() {
  renderBoard();
  updatePanels();
  updateHistory();
}

// ======================================
// NEW GAME
// ======================================

function newGame() {
  computerMoveToken++;

  game.reset();

  clearSelection();
  closePromotion();

  thinking = false;

  render();

  showToast("New game started!");

  // Computer plays White first.
  startComputerMove();
}

// ======================================
// UNDO
// ======================================

function undoMove() {
  if (thinking || pendingPromotion) return;

  const history = game.history({ verbose: true });

  // The computer's opening move is not a player turn to undo.
  if (!history.some(move => move.color === "b")) {
    showToast("Make a move first before using Undo.");
    return;
  }

  computerMoveToken++;

  // Undo the most recent move. If White (the computer) just replied,
  // also undo the Black move immediately before it.
  game.undo();

  if (game.turn() === "w" && game.history().length > 0) {
    game.undo();
  }

  clearSelection();
  closePromotion();
  thinking = false;
  render();

  showToast("Your previous turn was undone.");
}

// ======================================
// FLIP BOARD
// ======================================

function flipBoard() {
  flipped = !flipped;
  renderBoard();
}

// ======================================
// BUTTON EVENTS
// ======================================

$("new-game").addEventListener("click", newGame);

$("undo").addEventListener("click", undoMove);

$("flip").addEventListener("click", flipBoard);

$("difficulty-select").addEventListener("change", (event) => {
  const selectedDepth = Number(event.target.value);
  AI_SEARCH_DEPTH = [2, 3, 4].includes(selectedDepth) ? selectedDepth : 3;
  const levelName = AI_SEARCH_DEPTH === 2 ? "Easy" : AI_SEARCH_DEPTH === 4 ? "Hard" : "Medium";
  $("difficulty-select").setAttribute("aria-label", `Computer difficulty: ${levelName}`);
  showToast(`Computer difficulty: ${levelName}`);
});

$("sound-toggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  const button = $("sound-toggle");
  button.setAttribute("aria-pressed", String(soundEnabled));
  button.innerHTML = soundEnabled
    ? "<span>♫</span> Sound ON"
    : "<span>♪</span> Sound OFF";
  if (soundEnabled) playSound("move");
});

$("cancel-promotion").addEventListener("click", () => {
  closePromotion();
  clearSelection();
  renderBoard();
});

// ======================================
// START GAME
// ======================================

// Keep the promotion chooser closed until a pawn reaches its final rank.
closePromotion();

// Computer plays White first.
// Player controls Black.

render();
startComputerMove();


// Pi Sandbox sign-in is currently supported in Pi Browser, not in the
// embedded Android WebView used by this Capacitor APK. Keep Android usable
// without leaving users stuck on an approval screen.
const piConnectButton = $("pi-connect");
const piAccountStatus = $("pi-account-status");
const isNativeAndroid =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

if (isNativeAndroid) {
  const badge = document.querySelector(".live-pill");
  if (badge) badge.innerHTML = "<i></i> ANDROID • GUEST MODE";
  if (piAccountStatus) {
    piAccountStatus.textContent =
      "Pi sign-in is not enabled in this Android build yet. You can play in Guest Mode.";
  }
  if (piConnectButton) {
    piConnectButton.disabled = true;
    piConnectButton.textContent = "PI LOGIN COMING LATER";
    piConnectButton.setAttribute(
      "aria-label",
      "Pi login is not available in this Android build. Guest Mode is ready."
    );
  }
} else {
  piConnectButton?.addEventListener("click", async () => {
    if (piConnectButton.disabled) return;

    piConnectButton.disabled = true;
    piConnectButton.textContent = "CONNECTING…";
    piAccountStatus.textContent = "Waiting for Pi Browser approval…";

    try {
      const username = await authenticatePiUser();
      piAccountStatus.textContent = "Pi username: @" + username + " • Sandbox display";
      piConnectButton.textContent = "PI ACCOUNT CONNECTED";
      showToast("Welcome, @" + username + "!");
    } catch (error) {
      console.warn("Optional Pi sign-in was not completed.", error);
      piAccountStatus.textContent = "Guest mode is still available. You can try Pi login again.";
      piConnectButton.textContent = "CONNECT PI ACCOUNT";
      showToast("Pi login cancelled or unavailable. Chess is still playable.");
    } finally {
      piConnectButton.disabled = false;
    }
  });

  initializePiSandbox().catch((error) => {
    console.warn("Pi Sandbox is not active; chess remains playable.", error);
    const badge = document.querySelector(".live-pill");
    if (badge) badge.innerHTML = "<i></i> CHESS OFFLINE READY";
  });
}
