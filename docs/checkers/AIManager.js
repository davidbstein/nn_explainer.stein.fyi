/**
 * this program is part of a checkers program. The UI and game logic are implemented elsewhere. 
 * 
 * The following modules are available:
 * 
 * A list `AIParameters` is available. It contains the parameters from the Samuel paper, and is 
 * formatted as follows: 
 *   AIParameters = [
 *     { 
 *       tag: "PARA", 
 *       name: "parameter name", 
 *       description: "longer description of the parameter", 
 *       value: 1,
 *       fn: ({boardState, currentPlayer}) => (numerical score)
 *     }, ...
 *   ]
 * 
 * boardState is an 8x8 array of strings, where each string is either " ", "w", "b", "W", or "B"
 * currentPlayer is either "w" or "b"
 * 
 * GameManager is available. it has the following idempotent functions:
 * GameManager.list_valid_moves({boardState, currentPlayer, mandatoryJump=false}) => [move, ...]
 *  move is an object with the following format:
 *   {
 *    move: [[r1, c1], [r2, c2]],
 *    nextGameState: {boardState, currentPlayer, mandatoryJump}
 *   }
 * GameManager.check_win_condition({boardState, currentPlayer}) => "w", "b", or null
 * GameManager.get_initial_game_state() will return a fresh GameState object corresponding to a new game.
 * 
 * 
 * The AIManager module in this file implements the alpha-beta approach outlined in the seminal 1959 paper by Arthur Samuel.
 * 
 * it MUST contain the following functions:
 * - computeScore({boardState, currentPlayer}) => numerical score
 * - getBestMove(gameState) => move
 * - resetParameterCoefficients() => undefined
 * - learnBetterParameters(numIterations) => undefined
 */
// AIManager = {
//   computeScore: ({boardState, currentPlayer}) => {
//     let score = 0;
//     AIParameters.forEach(param => {
//       score += param.value * param.fn({boardState, currentPlayer});
//     });
//     return score;
//   },

//   alphaBeta: (gameState, depth, alpha, beta, maximizingPlayer) => {
//     if (depth === 0 || GameManager.check_win_condition(gameState) !== null) {
//       return AIManager.computeScore(gameState);
//     }

//     let validMoves = GameManager.list_valid_moves(gameState);
//     if (maximizingPlayer) {
//       let maxEval = -Infinity;
//       validMoves.forEach(move => {
//         let eval = AIManager.alphaBeta(move.nextGameState, depth - 1, alpha, beta, false);
//         maxEval = Math.max(maxEval, eval);
//         alpha = Math.max(alpha, eval);
//         if (beta <= alpha) return maxEval;
//       });
//       return maxEval;
//     } else {
//       let minEval = Infinity;
//       validMoves.forEach(move => {
//         let eval = AIManager.alphaBeta(move.nextGameState, depth - 1, alpha, beta, true);
//         minEval = Math.min(minEval, eval);
//         beta = Math.min(beta, eval);
//         if (beta <= alpha) return minEval;
//       });
//       return minEval;
//     }
//   },

//   findBestMove: (gameState, depth) => {
//     let bestMove = null;
//     let bestValue = -Infinity;
//     let alpha = -Infinity;
//     let beta = Infinity;
//     let validMoves = GameManager.list_valid_moves(gameState);
//     validMoves.forEach(move => {
//       let moveValue = AIManager.alphaBeta(move.nextGameState, depth - 1, alpha, beta, false);
//       if (moveValue > bestValue) {
//         bestValue = moveValue;
//         bestMove = move;
//       }
//       alpha = Math.max(alpha, moveValue);
//     });
//     return bestMove;
//   },

//   updateParameters: (gameResult) => {
//     let adjustmentFactor = gameResult === 'win' ? 1 : -1;
//     AIParameters.forEach(param => {
//       param.value += adjustmentFactor * param.fn({boardState: GameManager.get_initial_game_state().boardState, currentPlayer: 'w'});
//     });
//   },

//   playAndLearn: (iterations) => {
//     for (let i = 0; i < iterations; i++) {
//       let gameState = GameManager.get_initial_game_state();
//       let currentPlayer = gameState.currentPlayer;
//       while (GameManager.check_win_condition(gameState) === null) {
//         let bestMove = AIManager.findBestMove(gameState, 3);
//         gameState = bestMove.nextGameState;
//         currentPlayer = gameState.currentPlayer;
//       }
//       let result = GameManager.check_win_condition(gameState);
//       AIManager.updateParameters(result);
//     }
//   }
// };
AIManager = {
  activeTerms: [],
  reserveTerms: [],
  correlationCoefficients: [],
  timesUsed: [],
  lowTallyCount: [],
  tallyLimit: 8,
  swapInterval: 8,
  moveCount: 0,
  learningRate: 0.1,
  maxCoefficient: 10, // maximum value for the coefficients
  maxMoves: 100,

  initializeAIManager() {
    AIManager.activeTerms = AIParameters.slice(0, 16);
    AIManager.reserveTerms = AIParameters.slice(16);
    
    // Initialize coefficients with small random values
    AIManager.correlationCoefficients = Array(38).fill().map(() => Math.random() * 0.1 - 0.05);
    AIManager.timesUsed = Array(38).fill(0);
    AIManager.lowTallyCount = Array(16).fill(0);
    AIManager.moveCount = 0;

    // Initialize term values with the corresponding coefficients
    AIManager.activeTerms.forEach(term => {
      const termIndex = AIParameters.indexOf(term);
      term.value = AIManager.correlationCoefficients[termIndex];
    });
    AIManager.reserveTerms.forEach(term => {
      const termIndex = AIParameters.indexOf(term);
      term.value = AIManager.correlationCoefficients[termIndex];
    });
  },

  computeScore({ boardState, currentPlayer }) {
    let score = 0;
    for (let i = 0; i < AIManager.activeTerms.length; i++) {
      const term = AIManager.activeTerms[i];
      score += term.fn({ boardState, currentPlayer }) * term.value;
    }
    return score;
  },

  getBestMove(gameState) {
    let bestMove = null;
    let bestScore = -Infinity;
    const validMoves = GameManager.list_valid_moves(gameState);

    for (let move of validMoves) {
      const score = AIManager.computeScore(move.nextGameState);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    AIManager.updateTerms(gameState, bestMove.nextGameState);
    AIManager.moveCount++;

    if (AIManager.moveCount % AIManager.swapInterval === 0) {
      AIManager.reportTermUsage();
      AIManager.removeIneffectiveTerms();
    }

    return bestMove;
  },

  updateTerms(currentState, nextState) {
    for (let i = 0; i < AIManager.activeTerms.length; i++) {
      const term = AIManager.activeTerms[i];
      const termIndex = AIParameters.indexOf(term);
      AIManager.correlationCoefficients[termIndex] = AIManager.updateCorrelationCoefficient(termIndex, currentState, nextState);
      term.value = AIManager.correlationCoefficients[termIndex];  // Update the term's value
      AIManager.timesUsed[termIndex] += 1;
    }

    const leastEffectiveTermIndex = AIManager.findLeastEffectiveTerm();
    AIManager.lowTallyCount[leastEffectiveTermIndex] += 1;

    if (AIManager.lowTallyCount[leastEffectiveTermIndex] >= AIManager.tallyLimit) {
      const leastEffectiveTerm = AIManager.activeTerms.splice(leastEffectiveTermIndex, 1)[0];
      AIManager.reserveTerms.push(leastEffectiveTerm);
      const newTerm = AIManager.reserveTerms.shift();
      AIManager.activeTerms.push(newTerm);
      const newTermIndex = AIParameters.indexOf(newTerm);
      AIManager.correlationCoefficients[newTermIndex] = 0;
      newTerm.value = 0;  // Ensure the new term's value is set to 0
      AIManager.timesUsed[newTermIndex] = 0;
      AIManager.lowTallyCount[leastEffectiveTermIndex] = 0;
    }
  },

  updateCorrelationCoefficient(termIndex, currentState, nextState) {
    const currentScore = AIManager.computeScore(currentState);
    const nextScore = AIManager.computeScore(nextState);
    const delta = nextScore - currentScore;

    // Normalize the delta
    const normalizedDelta = Math.max(-1, Math.min(1, delta));

    // Update the coefficient with a bounded value
    let newCoefficient = AIManager.correlationCoefficients[termIndex] + AIManager.learningRate * normalizedDelta;

    // Clamp the coefficient to prevent it from growing too large or too small
    newCoefficient = Math.max(-AIManager.maxCoefficient, Math.min(AIManager.maxCoefficient, newCoefficient));

    return newCoefficient;
  },

  findLeastEffectiveTerm() {
    let minIndex = 0;
    let minCoefficient = AIManager.correlationCoefficients[AIParameters.indexOf(AIManager.activeTerms[0])];
    for (let i = 1; i < AIManager.activeTerms.length; i++) {
      const termIndex = AIParameters.indexOf(AIManager.activeTerms[i]);
      if (AIManager.correlationCoefficients[termIndex] < minCoefficient) {
        minIndex = i;
        minCoefficient = AIManager.correlationCoefficients[termIndex];
      }
    }
    return minIndex;
  },

  reportTermUsage() {
    console.log("Reporting term usage:");
    for (let term of AIManager.reserveTerms) {
      const termIndex = AIParameters.indexOf(term);
      console.log(`Term ${termIndex} used ${AIManager.timesUsed[termIndex]} times`);
    }
  },

  removeIneffectiveTerms() {
    AIManager.reserveTerms = AIManager.reserveTerms.filter(term => {
      const termIndex = AIParameters.indexOf(term);
      return AIManager.timesUsed[termIndex] >= 10;  // Adjust threshold as needed
    });
  },

  resetParameterCoefficients() {
    AIManager.correlationCoefficients.fill(0);
    AIManager.timesUsed.fill(0);
    AIManager.lowTallyCount.fill(0);
    AIManager.moveCount = 0;
  },

  learnBetterParameters: async (numIterations, callback=null) => {
    for (let i = 0; i < numIterations; i++) {
      console.log(AIManager.correlationCoefficients)
      const initialState = GameManager.get_initial_game_state();
      let gameState = initialState;
      let moveCounter = 0;

      while (!GameManager.check_win_condition(gameState) && moveCounter < AIManager.maxMoves) {
        GameView.render_game_state(gameState);
        callback && callback();
        // force DOM refresh
        await new Promise(resolve => setTimeout(resolve, 0));
        const bestMove = AIManager.getBestMove(gameState);
        gameState = bestMove.nextGameState;
        moveCounter++;
      }

      if (moveCounter >= AIManager.maxMoves) {
        console.log(`Game truncated at ${AIManager.maxMoves} moves.`);
      }
    }
  },


  findBestMove(gameState, depth) {
    return AIManager.minimax(gameState, depth, -Infinity, Infinity, true).move;
  },

  minimax(gameState, depth, alpha, beta, maximizingPlayer) {
    if (depth === 0 || GameManager.check_win_condition(gameState)) {
      return { score: AIManager.computeScore(gameState) };
    }

    const validMoves = GameManager.list_valid_moves(gameState);

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      let bestMove = null;

      for (let move of validMoves) {
        const eval = AIManager.minimax(move.nextGameState, depth - 1, alpha, beta, false).score;
        if (eval > maxEval) {
          maxEval = eval;
          bestMove = move;
        }
        alpha = Math.max(alpha, eval);
        if (beta <= alpha) break;
      }
      return { move: bestMove, score: maxEval };
    } else {
      let minEval = Infinity;
      let bestMove = null;

      for (let move of validMoves) {
        const eval = AIManager.minimax(move.nextGameState, depth - 1, alpha, beta, true).score;
        if (eval < minEval) {
          minEval = eval;
          bestMove = move;
        }
        beta = Math.min(beta, eval);
        if (beta <= alpha) break;
      }
      return { move: bestMove, score: minEval };
    }
  }
};

