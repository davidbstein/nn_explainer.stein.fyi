
GameState = {
  boardState: [],
  currentPlayer: "w",
}

const parameters = [
  { name: "param1", description: "Description 1", value: 0.5 },
  { name: "param2", description: "Description 2", value: 0.5 }
];

function randomizeParameters() {
  parameters.forEach(param => {
    param.value = Math.random();
    document.getElementById(param.name).value = param.value;
    document.querySelector(`#${param.name} + span`).textContent = param.value;
  });
}

function reset_game_state() {
  GameState.boardState = [
    ["b", ".", "b", ".", "b", ".", "b", "."],
    [".", "b", ".", "b", ".", "b", ".", "b"],
    ["b", ".", "b", ".", ".", ".", "b", "."],
    [".", "b", ".", "b", ".", ".", ".", "."],
    [".", ".", "w", ".", "w", ".", ".", "."],
    [".", "w", ".", ".", ".", "w", ".", "w"],
    ["w", ".", "w", ".", "w", ".", "w", "."],
    [".", "w", ".", "w", ".", ".", ".", "w"]
  ];
  GameState.currentPlayer = "b";
}

function _get_directions(piece) {
  if (piece === "W" || piece === "B") {
    return {
      directions: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
      jumpDirections: [[-2, -2], [-2, 2], [2, -2], [2, 2]]
    };
  }
  if (piece.toLowerCase() === "w") {
    return {
      directions: [[-1, -1], [-1, 1]],
      jumpDirections: [[-2, -2], [-2, 2]]
    };
  }
  if (piece.toLowerCase() === "b") {
    return {
      directions: [[1, -1], [1, 1]],
      jumpDirections: [[2, -2], [2, 2]]
    };
  }
  return { directions: [], jumpDirections: [] };
}

function list_valid_moves(boardState, currentPlayer) {
  const moves = [];

  boardState.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell.toLowerCase() === currentPlayer) {
        const { directions, jumpDirections } = _get_directions(cell);

        // Normal moves
        directions.forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && boardState[nr][nc] === ".") {
            const nextBoardState = _.cloneDeep(boardState);
            nextBoardState[r][c] = ".";
            nextBoardState[nr][nc] = promote(cell, nr);
            moves.push({ 
              move: [[r, c], [nr, nc]], 
              nextBoardState,
              nextActivePlayer: currentPlayer === "w" ? "b" : "w"
            });
          }
        });

        // Jump moves
        jumpDirections.forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          const mr = r + dr / 2;
          const mc = c + dc / 2;
          if (
            nr >= 0 && nr < 8 && nc >= 0 && nc < 8 &&
            boardState[nr][nc] === "." &&
            boardState[mr][mc] !== "." &&
            boardState[mr][mc].toLowerCase() !== currentPlayer
          ) {
            const nextBoardState = _.cloneDeep(boardState);
            nextBoardState[r][c] = ".";
            nextBoardState[mr][mc] = ".";
            nextBoardState[nr][nc] = promote(cell, nr);
            // if there is another jump move, we need to keep the current player
            const nextValidMoves = list_valid_moves(nextBoardState, currentPlayer)
            const movesWithSamePiece = nextValidMoves.filter(m => m.move[0][0] === nr && m.move[0][1] === nc);
            const jumpsWithSamePiece = movesWithSamePiece.filter(m => Math.abs(m.move[0][0] - m.move[1][0]) === 2);
            const nextActivePlayer = jumpsWithSamePiece.length > 0 ? currentPlayer : currentPlayer === "w" ? "b" : "w";  
            moves.push({ 
              move: [[r, c], [nr, nc]], 
              nextBoardState,
              nextActivePlayer,
            });
          }
        });
      }
    });
  });
  return moves;
}

function promote(piece, row) {
  if (piece === "w" && row === 0) return "W";
  if (piece === "b" && row === 7) return "B";
  return piece;
}

function make_move(from, to) {
  const [fr, fc] = from;
  const [tr, tc] = to;
  if (GameState.boardState[fr][fc].toLowerCase() !== GameState.currentPlayer) return false;

  const validMoves = list_valid_moves(GameState.boardState, GameState.currentPlayer);
  const move = validMoves.find(m => _.isEqual(m.move, [from, to]));

  if (move) {
    const playerChanged = GameState.currentPlayer !== move.nextActivePlayer;
    GameState.boardState = move.nextBoardState;
    GameState.currentPlayer = move.nextActivePlayer;

    // Highlight possible further jumps if the move was a jump
    const piece = window.GameState.boardState[tr][tc];
    const { jumpDirections } = _get_directions(piece);
    const nextJumpMoves = jumpDirections
      .map(([dr, dc]) => [[tr, tc], [tr + dr, tc + dc]])
      .filter(move => list_valid_moves(window.GameState.boardState, window.GameState.currentPlayer).some(m => _.isEqual(m.move, move)));
    if (nextJumpMoves.length > 0 && !playerChanged) {
      validMoves = nextJumpMoves.map(m => ({ move: m, nextState: m.nextBoardState }));
      highlightValidMoves(validMoves);
    }
    update_board_view();
    return true;
  }
  return false;
}
