load_module('/lodash.min.js')
load_module('./gameView.js')
load_module('./gameManager.js')

function initializeGame() {
  initialize_board_view();
  initialize_control_view();
  initialize_parameters_view();
  reset_game_state();
  update_board_view();
}

function resetGame() {
  reset_game_state();
  update_board_view();
}

setTimeout(() => {
  initializeGame();
}, 10);
