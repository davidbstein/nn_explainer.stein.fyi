
window.GameState = {}

GameManagerHelper = {
  hashBoardState: (boardState) => {
    return boardState.map(row => row.join("")).join("");
  },

  get_directions: (piece) => {
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
  },

  promote: (piece, r) => {
    if (piece === "w" && r === 0) return "W";
    if (piece === "b" && r === 7) return "B";
    return piece;
  },

  valid_moves_for_piece: ({boardState, currentPlayer, history, directions, r, c}) => {
    const moves = [];
    const cell = boardState[r][c];
    directions.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && boardState[nr][nc] === " ") {
        const nextBoardState = _.cloneDeep(boardState);
        nextBoardState[r][c] = " ";
        nextBoardState[nr][nc] = GameManagerHelper.promote(cell, nr);
        const nextBoardStateHash = GameManagerHelper.hashBoardState(nextBoardState);
        if (history.indexOf(nextBoardStateHash) > -1) return;
        moves.push({ 
          move: [[r, c], [nr, nc]], 
          nextGameState: {
            boardState: nextBoardState,
            currentPlayer: currentPlayer === "w" ? "b" : "w",
            mandatoryJump: false,
            history: [...history, nextBoardStateHash]
          }
        });
      }
    });
    return moves;
  },

  valid_jump_moves_for_piece: ({boardState, currentPlayer, history, jumpDirections, r, c}) => {
    const moves = [];
    const cell = boardState[r][c];
    jumpDirections.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      const mr = r + dr / 2;
      const mc = c + dc / 2;
      if (
        nr >= 0 && nr < 8 && nc >= 0 && nc < 8 &&
        boardState[nr][nc] === " " &&
        boardState[mr][mc] !== " " &&
        boardState[mr][mc].toLowerCase() !== currentPlayer
      ) {
        const nextBoardState = _.cloneDeep(boardState);
        nextBoardState[r][c] = " ";
        nextBoardState[mr][mc] = " ";
        nextBoardState[nr][nc] = GameManagerHelper.promote(cell, nr);
        // if there is another jump move, we need to keep the current player
        const nextValidMoves = GameManager.list_valid_moves(
          {boardState:nextBoardState, currentPlayer}
        );
        const movesWithSamePiece = nextValidMoves.filter(m => m.move[0][0] === nr && m.move[0][1] === nc);
        const jumpsWithSamePiece = movesWithSamePiece.filter(m => Math.abs(m.move[0][0] - m.move[1][0]) === 2);
        const mandatoryJump = jumpsWithSamePiece.length > 0
        const nextActivePlayer = mandatoryJump ? currentPlayer : currentPlayer === "w" ? "b" : "w";  
        const nextBoardStateHash = GameManagerHelper.hashBoardState(nextBoardState);
        if (history.indexOf(nextBoardStateHash) > -1) return;
        moves.push({ 
          move: [[r, c], [nr, nc]], 
          nextGameState: {
            boardState: nextBoardState,
            currentPlayer: nextActivePlayer,
            mandatoryJump: mandatoryJump ? [nr, nc] : false,
            history: [...history, nextBoardStateHash]
          },
        });
      }
    });
    return moves;
  }
}

GameManager = {  
  reset_game_state: () => {
    GameState.boardState = [
      [" ", "b", " ", "b", " ", "b", " ", "b"],
      ["b", " ", "b", " ", "b", " ", "b", " "],
      [" ", "b", " ", "b", " ", "b", " ", "b"],
      [" ", " ", " ", " ", " ", " ", " ", " "],
      [" ", " ", " ", " ", " ", " ", " ", " "],
      ["w", " ", "w", " ", "w", " ", "w", " "],
      [" ", "w", " ", "w", " ", "w", " ", "w"],
      ["w", " ", "w", " ", "w", " ", "w", " "]
    ];
    GameState.currentPlayer = "w";
    GameState.history = [];
  },

  get_initial_game_state: () => {
    return {
      boardState: [
        [" ", "b", " ", "b", " ", "b", " ", "b"],
        ["b", " ", "b", " ", "b", " ", "b", " "],
        [" ", "b", " ", "b", " ", "b", " ", "b"],
        [" ", " ", " ", " ", " ", " ", " ", " "],
        [" ", " ", " ", " ", " ", " ", " ", " "],
        ["w", " ", "w", " ", "w", " ", "w", " "],
        [" ", "w", " ", "w", " ", "w", " ", "w"],
        ["w", " ", "w", " ", "w", " ", "w", " "]
      ],
      currentPlayer: "w",
      mandatoryJump: false,
      history: [],
    };
  }, 

  list_valid_moves: ({boardState, currentPlayer, history=[], mandatoryJump=false}) => {
    const moves = [];
    const jumpMoves = [];
    boardState.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell.toLowerCase() !== currentPlayer) return;
        if (mandatoryJump && (r !== mandatoryJump[0] || c !== mandatoryJump[1]))
          return;
        
        const {directions, jumpDirections} = GameManagerHelper.get_directions(cell);
        
        const newJumpMoves = GameManagerHelper.valid_jump_moves_for_piece(
          {boardState, currentPlayer, history, jumpDirections, r, c}
        );
        newJumpMoves.forEach(move => jumpMoves.push(move));

        if (mandatoryJump) return;
        const newMoves = GameManagerHelper.valid_moves_for_piece(
          {boardState, currentPlayer, history, directions, r, c}
        );
        newMoves.forEach(move => moves.push(move));
      });
    });
    if (jumpMoves.length > 0) return jumpMoves;
    return moves;
  },

  check_win_condition: (gameState) => {
    const {boardState, currentPlayer} = gameState;
    const opponent = currentPlayer === "w" ? "b" : "w";
    const validMoves = GameManager.list_valid_moves(gameState);
    if (validMoves.length === 0) {
      return opponent;
    }
    return false;
  },

  make_move: (from, to) => {
    const [fr, fc] = from;
    const [tr, tc] = to;
    if (GameState.boardState[fr][fc].toLowerCase() !== GameState.currentPlayer) return false;

    const validMoves = GameManager.list_valid_moves(GameState);
    const move = validMoves.find(m => _.isEqual(m.move, [from, to]));

    if (move) {
      const playerChanged = GameState.currentPlayer !== move.nextGameState.currentPlayer;
      GameState = {...move.nextGameState};
      return true;
    }
    return false;
  },

  make_move_and_respond_with_AI: async (from, to) => {
    const moveSuccessful = GameManager.make_move(from, to);
    if (moveSuccessful) {
      GameView.update_board_view();
    }

    // Ensure the AI responds if the current player matches the active AI player
    while (GameState.currentPlayer === GameView._AIPlayer) {
      await new Promise(r => setTimeout(r, 200));
      const AIMove = AIManager.findBestMove(GameState, 3);
      if (AIMove && AIMove.move) {
        const [f, t] = AIMove.move;
        GameManager.make_move(f, t);
        GameView.update_board_view();
      } else {
        break; // Exit if no valid move found
      }
    }
  }
}
