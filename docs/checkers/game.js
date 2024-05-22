load_module('./gameView.js')
load_module('./gameManager.js')
load_module('./AIParameters.js')
load_module('./AIManager.js')

async function initializeGame() {
  if (!window.GameView) return setTimeout(initializeGame, 100);
  if (!window.GameManager) return setTimeout(initializeGame, 100);
  if (!window.AIParameters) return setTimeout(initializeGame, 100);
  if (!window.AIManager) return setTimeout(initializeGame, 100);
  GameView.initialize_board_view();
  GameView.initialize_control_view();
  GameView.initialize_parameters_view();
  GameManager.reset_game_state();
  GameView.update_board_view();
  AIManager.initializeAIManager(); 
  GameView.update_parameters_view();
}

function resetGame() {
  GameManager.reset_game_state();
  GameView.update_board_view();
}

function randomizeParameters() {
  AIManager.randomizeParameters();
  GameView.update_parameters_view();
}

function letAIPlay() {
  let bestMove = AIManager.findBestMove(GameState, 3);
  const [from, to] = bestMove.move;
  GameManager.make_move(from, to);
  GameView.update_board_view();
  GameView.update_parameters_view();
}

function letAIPlayAndLearn(n) {
  AIManager.learnBetterParameters(n, GameView.update_parameters_view);
}

initializeGame();
