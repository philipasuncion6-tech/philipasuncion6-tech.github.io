import chessPackage from "chess.js";

const Chess =
  chessPackage.Chess ||
  chessPackage.default?.Chess ||
  chessPackage.default ||
  chessPackage;

const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const MATE_SCORE = 100000;
const MAX_TABLE_ENTRIES = 30000;
const HARD_TIME_LIMIT_MS = 2200;

let deadline = 0;
let nodes = 0;
let transpositionTable = new Map();
let stopped = false;

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

function moveKey(move) {
  return move.from + move.to + (move.promotion || "");
}

function moveOrderScore(move, preferredMove) {
  let score = 0;
  if (preferredMove && moveKey(move) === preferredMove) score += 1000000;
  if (move.captured) {
    score += 10000 + 10 * pieceValues[move.captured] - pieceValues[move.piece];
  }
  if (move.promotion) score += 8000 + pieceValues[move.promotion];
  if (move.san?.includes("#")) score += 500000;
  else if (move.san?.includes("+")) score += 500;
  return score;
}

function orderedMoves(position, preferredMove = null) {
  return position.moves({ verbose: true })
    .sort((a, b) => moveOrderScore(b, preferredMove) - moveOrderScore(a, preferredMove));
}

function checkTime() {
  nodes++;
  // Avoid calling the clock at every node; check often enough to respect the budget.
  if ((nodes & 127) === 0 && Date.now() >= deadline) {
    stopped = true;
    throw new Error("SEARCH_TIME_LIMIT");
  }
}

function minimax(position, depth, alpha, beta, ply = 0) {
  checkTime();

  if (position.in_checkmate() || position.game_over()) {
    return evaluatePosition(position, ply);
  }
  if (depth <= 0) return evaluatePosition(position, ply);

  const alphaOriginal = alpha;
  const betaOriginal = beta;
  const key = position.fen();
  const cached = transpositionTable.get(key);
  let preferredMove = null;

  if (cached) {
    preferredMove = cached.bestMove;
    if (cached.depth >= depth) {
      if (cached.flag === "exact") return cached.score;
      if (cached.flag === "lower") alpha = Math.max(alpha, cached.score);
      else if (cached.flag === "upper") beta = Math.min(beta, cached.score);
      if (alpha >= beta) return cached.score;
    }
  }

  const moves = orderedMoves(position, preferredMove);
  if (!moves.length) return evaluatePosition(position, ply);

  const maximizing = position.turn() === "w";
  let best = maximizing ? -Infinity : Infinity;
  let bestMove = null;

  for (const move of moves) {
    position.move(move);
    let score;
    try {
      score = minimax(position, depth - 1, alpha, beta, ply + 1);
    } finally {
      position.undo();
    }

    if ((maximizing && score > best) || (!maximizing && score < best)) {
      best = score;
      bestMove = moveKey(move);
    }

    if (maximizing) alpha = Math.max(alpha, best);
    else beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }

  let flag = "exact";
  if (best <= alphaOriginal) flag = "upper";
  else if (best >= betaOriginal) flag = "lower";

  if (transpositionTable.size >= MAX_TABLE_ENTRIES) transpositionTable.clear();
  transpositionTable.set(key, { depth, score: best, flag, bestMove });
  return best;
}

function searchRoot(position, depth) {
  const moves = orderedMoves(position, transpositionTable.get(position.fen())?.bestMove);
  let alpha = -Infinity;
  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of moves) {
    checkTime();
    position.move(move);
    let score;
    try {
      score = minimax(position, depth - 1, alpha, Infinity, 1);
    } finally {
      position.undo();
    }

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
    alpha = Math.max(alpha, bestScore);
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)] || moves[0];
}

self.onmessage = (event) => {
  const { fen, depth, token } = event.data || {};
  try {
    const position = new Chess();
    // chess.js 0.10.3 throws for an invalid FEN and returns undefined on success.
    // Do not treat the successful load result as a boolean.
    position.load(fen);

    const legalMoves = position.moves({ verbose: true });
    if (!legalMoves.length) {
      self.postMessage({ token, move: null });
      return;
    }

    // Iterative deepening always preserves the best move from the last completed depth.
    const maxDepth = Math.max(1, Math.min(6, Number(depth) || 3));
    deadline = Date.now() + HARD_TIME_LIMIT_MS;
    nodes = 0;
    stopped = false;
    transpositionTable = new Map();

    let bestMove = legalMoves[0];
    let completedDepth = 0;

    for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
      try {
        const candidate = searchRoot(position, currentDepth);
        if (candidate) bestMove = candidate;
        completedDepth = currentDepth;
      } catch (error) {
        if (error?.message !== "SEARCH_TIME_LIMIT") throw error;
        stopped = true;
        break;
      }
      if (Date.now() >= deadline) break;
    }

    self.postMessage({
      token,
      move: { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion || "q" },
      search: { depth: completedDepth, nodes, timeLimited: stopped }
    });
  } catch (error) {
    self.postMessage({ token, error: error?.message || "AI calculation failed." });
  }
};
