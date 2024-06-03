AIManager = {
  maxMoves: 100,
  learningRate: 0.005,
  initializeAIManager: () => {},
  parameterClamp: [-.5, 10],

  computeScore: ({ boardState, currentPlayer }) => {
    let score = 0;
    AIParameters.forEach(param => {
      score += param.value * param.fn({ boardState, currentPlayer });
    });
    return score;
  },

  list_possible_next_states: (state) => {
    const validMoves = GameManager.list_valid_moves(state);
    const possibleStates = [];

    const exploreMultiJumps = (state, moveSequence) => {
      const nextStates = GameManager.list_valid_moves(state).filter((newState) => newState.currentPlayer === state.currentPlayer);
      if (nextStates.length === 0) {
        possibleStates.push({ gameState: state, moveSequence });
      } else {
        nextStates.forEach(move => {
          exploreMultiJumps(move.nextGameState, [...moveSequence, move]);
        });
      }
    };

    validMoves.forEach(move => {
      exploreMultiJumps(move.nextGameState, [move]);
    });

    return possibleStates;
  },

  findBestMove: (gameState, depth = 3) => {
    const alphaBeta = (state, depth, alpha, beta, maximizingPlayer, initialDepth) => {
      const currentPlayer = state.currentPlayer;
      const possibleStates = AIManager.list_possible_next_states(state);

      if (depth === 0 || GameManager.check_win_condition(state)) {
        return { eval: AIManager.computeScore(state), move: null };
      }

      if (maximizingPlayer) {
        let maxEval = -Infinity;
        let bestMove = null;
        for (const { gameState: nextState, moveSequence } of possibleStates) {
          const result = alphaBeta(nextState, depth - 1, alpha, beta, false, initialDepth);
          if (result.eval > maxEval) {
            maxEval = result.eval;
            bestMove = moveSequence[0];
          }
          alpha = Math.max(alpha, result.eval);
          if (beta <= alpha) break;
        }
        return depth === initialDepth ? bestMove : { eval: maxEval, move: bestMove };
      } else {
        let minEval = Infinity;
        let bestMove = null;
        for (const { gameState: nextState, moveSequence } of possibleStates) {
          const result = alphaBeta(nextState, depth - 1, alpha, beta, true, initialDepth);
          if (result.eval < minEval) {
            minEval = result.eval;
            bestMove = moveSequence[0];
          }
          beta = Math.min(beta, result.eval);
          if (beta <= alpha) break;
        }
        return depth === initialDepth ? bestMove : { eval: minEval, move: bestMove };
      }
    };

    return alphaBeta(gameState, depth, -Infinity, Infinity, gameState.currentPlayer === 'w', depth);
  },

  learnBetterParameters: async (numIterations, callback = null, preview = true) => {
    const initialGameState = GameManager.get_initial_game_state();

    for (let i = 0; i < numIterations; i++) {
      if (preview) {
        GameView.set_game_state_message(`Training AI: Self-play round ${i + 1} of ${numIterations}`);
      }
      const { finalGameState, winner, history } = await AIManager.playGame(initialGameState, preview);
      AIManager.updateParameters(history, winner);

      if (callback) callback(finalGameState, i);
    }
  },

  randomizeParameters: () => {
    const [minValue, maxValue] = AIManager.parameterClamp;
    AIParameters.forEach(param => {
      param.value = Math.random() * (maxValue - minValue) + minValue;      
    });
  },

  resetParameterCoefficients: () => {
    AIParameters.forEach(param => {
      param.value = 1; // Reset to initial values or predefined defaults
    });
  },

  playGame: async (initialGameState, preview) => {
    let gameState = { ...initialGameState };
    let moves = 0;
    const history = [];

    while (GameManager.check_win_condition(gameState) === false && moves < AIManager.maxMoves) {
      history.push(JSON.parse(JSON.stringify(gameState))); // Store a deep copy of the game state
      const bestMove = AIManager.findBestMove(gameState);
      gameState = bestMove.nextGameState;
      if (preview) {
        GameView.render_game_state(gameState);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      moves++;
    }

    const winner = GameManager.check_win_condition(gameState);
    return { finalGameState: gameState, winner, history };
  },

  updateParameters: (history, winner) => {
    const learningRate = AIManager.learningRate;
    const outcome = winner === 'w' ? 1 : (winner === 'b' ? -1 : 0);

    history.forEach(state => {
      const predictedScore = AIManager.computeScore(state);
      const error = outcome - predictedScore;
      AIParameters.forEach(param => {
        param.value += learningRate * error * param.fn(state);
        const [minValue, maxValue] = AIManager.parameterClamp;
        param.value = Math.min(maxValue, Math.max(minValue, param.value));
      });
    });
  }
};
