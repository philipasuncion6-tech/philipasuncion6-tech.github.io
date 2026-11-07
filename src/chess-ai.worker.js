import chessPackage from "chess.js";

const Chess =
  chessPackage.Chess ||
  chessPackage.default?.Chess ||
  chessPackage.default ||
  chessPackage;

const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const MATE_SCORE = 100000;

function evaluatePosition(position, ply = 0) {
  if (position.in_checkmate()) {
    return position.turn() === "w" ? -MATE_SCORE + ply : MATE_SCORE - ply;
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
      const centerDistance = Math.abs(3.5 - f) + Math.abs(3.5 - r);
      value += Math.round((7 - centerDistance) * 3);

      if (piece.type === "p") {
        const advance = piece.color === "w" ? 6 - r : r - 1;
        value += Math.max(0, advance) * 7;
      }
      if (piece.type === "b") {
        if (piece.color === "w") whiteBishops++;
        else blackBishops++;
      }
      score += sign * value;
    }
  }
  if (whiteBishops >= 2) score += 30;
  if (blackBishops >= 2) score -= 30;
  return score;
}

function moveOrderScore(move) {
  let score = 0;
  if (move.captured) score += 10 * pieceValues[move.captured] - pieceValues[move.piece] / 10;
  if (move.promotion) score += pieceValues[move.promotion] + 800;
  if (move.san?.includes("+")) score += 50;
  if (move.san?.includes("#")) score += 100000;
  return score;
}

function orderedMoves(position) {
  return position.moves({ verbose: true }).sort((a, b) => moveOrderScore(b) - moveOrderScore(a));
}

function minimax(position, depth, alpha, beta, maximizing, ply = 0) {
  if (position.in_checkmate() || position.game_over() || depth <= 0) {
    return evaluatePosition(position, ply);
  }
  const moves = orderedMoves(position);
  if (!moves.length) return evaluatePosition(position, ply);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      position.move(move.san);
      let score;
      try {
        score = minimax(position, depth - 1, alpha, beta, false, ply + 1);
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
      score = minimax(position, depth - 1, alpha, beta, true, ply + 1);
    } finally {
      position.undo();
    }
    best = Math.min(best, score);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

self.onmessage = (event) => {
  const { fen, depth, token } = event.data || {};
  try {
    const position = new Chess();
    if (!position.load(fen)) throw new Error("Invalid chess position.");
    const moves = orderedMoves(position);
    if (!moves.length) {
      self.postMessage({ token, move: null });
      return;
    }

    let bestScore = -Infinity;
    let bestMoves = [];
    for (const move of moves) {
      position.move(move.san);
      let score;
      try {
        score = minimax(position, Math.max(0, depth - 1), -Infinity, Infinity, false, 1);
      } finally {
        position.undo();
      }
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)] || moves[0];
    self.postMessage({
      token,
      move: { from: chosen.from, to: chosen.to, promotion: chosen.promotion || "q" }
    });
  } catch (error) {
    self.postMessage({ token, error: error?.message || "AI calculation failed." });
  }
};
