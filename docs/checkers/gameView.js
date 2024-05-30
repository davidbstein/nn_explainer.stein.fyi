GameViewHelpers = {
  createCellDiv: (i, j) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.id = `cell-${i}-${j}`;
    if ((i + j) % 2 === 0) {
      cell.classList.add("light-cell");
    } else {
      cell.classList.add("dark-cell");
    }
    return cell;
  },

  createControlButton: (name, callback) => {
    const button = document.createElement("button");
    button.id = name.toLowerCase().replaceAll(" ", "-");
    button.innerText = name;
    button.addEventListener("click", callback);
    return button;
  },

  createPieceDiv: (piece) => {
    const pieceDiv = document.createElement("div");
    pieceDiv.classList.add('piece');
    pieceDiv.classList.add(piece.toLowerCase() === "w" ? "white" : "black");
    if (piece === "W" || piece === "B") {
      pieceDiv.classList.add("king");
    }
    return pieceDiv;
  },
  
  createParameterDiv: (param) => {
    const paramDiv = document.createElement("div");
    paramDiv.className = "param-item-container";
    paramDiv.id = `param-${param.tag}`;

    const nameAndSliderDiv = document.createElement("div");
    nameAndSliderDiv.className = "param-name-and-slider";

    const paramName = document.createElement("div");
    paramName.className = "param-name";
    paramName.textContent = `(${param.name})`;

    const paramTag = document.createElement("div");
    paramTag.className = "param-tag";
    paramTag.textContent = `${param.tag} = `;

    const paramScore = document.createElement("span");
    paramScore.className = "param-score";
    let score = "?"
    try {
      score = param.fn(GameState);
    } catch (e) { }
    paramScore.textContent = score;
    paramTag.appendChild(paramScore);

    const paramDescription = document.createElement("div");
    paramDescription.textContent = param.description;

    const sliderDiv = document.createElement("div");
    sliderDiv.className = "slider-container";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = -10;
    slider.max = 10;
    slider.step = 0.1;
    slider.value = param.value;
    slider.id = param.name;

    const sliderValue = document.createElement("span");
    sliderValue.className = "slider-value";
    // slider.value to two sig figs
    sliderValue.textContent = `${Math.round(param.value * 100) / 100}`;
    sliderDiv.appendChild(sliderValue);
    sliderDiv.appendChild(slider);
    slider.addEventListener("input", () => {
      param.value = slider.value;
      sliderDiv.querySelector(".slider-value").textContent = slider.value;
    });

    nameAndSliderDiv.appendChild(paramTag);
    nameAndSliderDiv.appendChild(paramName);
    nameAndSliderDiv.appendChild(sliderDiv);
    paramDiv.appendChild(nameAndSliderDiv);
    paramDiv.appendChild(paramDescription);

    return paramDiv;
  },

  update_parameter_scores: () => {
    AIParameters.forEach(param => {
      let score = "?"
      try {
        score = param.fn(GameState);
      } catch (e) { 
        console.log(`Error in score function for ${param.tag}: ${e}`);
        console.log(e);
      }
      const paramDiv = document.getElementById(`param-${param.tag}`);
      paramDiv.querySelector(".param-score").textContent = score;
    });
  },

  add_cell_ids: () => {
    const boardContainer = document.getElementById("board");
    for (let square_id = 1; square_id <= 32; square_id++){
      const [r,c] = squareIdToCoordinates(square_id);
      boardContainer.querySelector(`#cell-${r}-${c}`).innerHTML += `<div id='square-id'>${square_id}</div>`;
    }
  },

  reorder_parameter_divs_by_value: _.throttle(() => {
    //adjust the order of the parameter divs by changing their adjusting the order parameter of their style attribute
    const parameterContainer = document.getElementById("parameter-container");
    const paramDivs = parameterContainer.querySelectorAll(".param-item-container");
    const sortedParamDivs = Array.from(paramDivs).sort((a, b) => {
      const aScore = parseFloat(a.querySelector("input").value);
      const bScore = parseFloat(b.querySelector("input").value);
      return bScore - aScore;
    });
    sortedParamDivs.forEach((div, i) => {
      div.style.order = i;
    });
  }, 500),

  showAIScores: (gameState) => {
    const scores = [
      AIManager.computeScore({boardState: gameState.boardState, currentPlayer: 'w'}),
      AIManager.computeScore({boardState: gameState.boardState, currentPlayer: 'b'})
    ]
    document.querySelector("#status-message").textContent = 
    `AI score for white: ${scores[0].toFixed(1)}`+
    "\n" +
    `AI score for black: ${scores[1].toFixed(1)}`;
  }
}

GameView = {
  _selectedPiece: null,
  _validMoves: [],
  _AIPlayer: false,

  set_game_state_message: (message) => {
    const gameStateContainer = document.getElementById("game-state-container");
    gameStateContainer.innerHTML = `<div>${message}</div>`;
  },

  initialize_board_view: () => {
    const boardContainer = document.getElementById("board");
    boardContainer.innerHTML = "";
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const cellDiv = GameViewHelpers.createCellDiv(i, j);
        boardContainer.appendChild(cellDiv);
      }
    }
    const gameStateContainer = document.getElementById("game-state-container");
    gameStateContainer.innerHTML = ``;
    GameViewHelpers.add_cell_ids();
  },

  initialize_control_view: () => {
    const controlsContainer = document.getElementById("controls-container");
    [
      ["Reset Game", resetGame],
      ["Enable AI Opponent", GameView.toggleAIPlayer],
      ["Let AI Pick Next Move", letAIPlay],
      ["Randomize Parameters", randomizeParameters],
      ["Self-play 5x", () => letAIPlayAndLearn(5)],
      ["Self-play 100x", () => letAIPlayAndLearn(100)],
    ].map(([name, callback]) => controlsContainer.append(
      GameViewHelpers.createControlButton(name, callback))
    );
  },

  toggleAIPlayer: () => {
    switch (GameView._AIPlayer) {
      case 'Inactive':
        GameView._AIPlayer = 'Black';
        break;
      case 'Black':
        GameView._AIPlayer = 'White';
        break;
      case 'White':
        GameView._AIPlayer = 'Inactive';
        break;
    }
    document.getElementById("enable-ai-opponent").innerText = `Toggle AI Opponent (${GameView._AIPlayer})`
  },

  initialize_parameters_view: () => {
    const parameterContainer = document.getElementById("parameter-container");
    parameterContainer.innerHTML = "";
    AIParameters.forEach(param => {
      const paramDiv = GameViewHelpers.createParameterDiv(param);
      parameterContainer.appendChild(paramDiv);
    });
  },

  update_parameters_view: () => {
    AIParameters.forEach(param => {
      const sliderContainer = document.getElementById(`param-${param.tag}`)
      const slider = sliderContainer.querySelector("input");
      slider.value = param.value;
      sliderContainer.querySelector(".slider-value").innerText = `${Math.round(param.value * 100) / 100}`;
    });
  },

  render_game_state: (gameState) => {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const cell = document.getElementById(`cell-${i}-${j}`);
        cell.innerHTML = "";
        const piece = gameState.boardState[i][j];
        if (piece !== " ") {
          const pieceDiv = GameViewHelpers.createPieceDiv(piece);
          cell.appendChild(pieceDiv);
        }
      }
    }
    AIParameters.forEach(param => {
      const paramDiv = document.getElementById(`param-${param.tag}`);
      const score = param.fn(gameState);
      paramDiv.querySelector(".param-score").textContent = score;
    });
    GameViewHelpers.reorder_parameter_divs_by_value();
    GameViewHelpers.showAIScores(gameState);
  },

  update_game_state_view: () => {
    const gameStateContainer = document.getElementById("game-state-container");
    const winner = GameManager.check_win_condition(GameState);
    if (winner) {
      const winnerName = winner === "w" ? "White" : "Black";
      gameStateContainer.innerHTML = `<div>${winnerName} wins!</div>`;
    } else {
      const currentPlayer = GameState.currentPlayer === "w" ? "White" : "Black";
      if (GameState.mandatoryJump) {
        gameStateContainer.innerHTML = `<div>${currentPlayer} has more jumps.</div>`;
      } else {
        gameStateContainer.innerHTML = `<div>${currentPlayer}'s turn</div>`;
      }
    }
    GameViewHelpers.showAIScores(GameState);
    GameViewHelpers.update_parameter_scores();
    GameViewHelpers.add_cell_ids();
  },

  update_board_view: () => {
    const validMoves = GameManager.list_valid_moves(GameState);
    if (GameManager.check_win_condition(GameState)) {
      
    }
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const cell = document.getElementById(`cell-${i}-${j}`);
        cell.innerHTML = "";
        const piece = GameState.boardState[i][j];
        if (piece !== " ") {
          const pieceDiv = GameViewHelpers.createPieceDiv(piece);
          if (validMoves.some(move => _.isEqual(move.move[0], [i, j]))) {
            pieceDiv.classList.add("can-move");
          }
          cell.appendChild(pieceDiv);
        }
        cell.onclick = () => {
          if (GameView._selectedPiece) {
            GameView.pieceMoved(i, j);
          } else {
            GameView.pieceSelected(i, j);
          }
        };
      }
    }
    GameView.update_game_state_view();
  },

  pieceSelected: (r, c) => {
    console.log(`GameView.pieceSelected: ${r},${c}`);
    if (GameState.boardState[r][c].toLowerCase() !== GameState.currentPlayer) 
      return;
    GameView._selectedPiece = [r, c];
    validMoves = GameManager.list_valid_moves(GameState)
      .filter(move => _.isEqual(move.move[0], GameView._selectedPiece));
    GameView.highlightValidMoves(validMoves);
  },

  pieceMoved: (r, c) => {
    console.log(`GameView.pieceMoved: ${r},${c}`);
    if (GameView._selectedPiece && validMoves.some(move => _.isEqual(move.move[1], [r, c]))) {
      const move_fn = (GameView._AIPlayer !== 'Inactive' && GameManager.currentPlayer === GameView._AIPlayer) 
        ? GameManager.make_move_and_respond_with_AI 
        : GameManager.make_move;
      const moveSuccessful = move_fn(GameView._selectedPiece, [r, c]);
      if (moveSuccessful){
        GameView.update_board_view();
      }
    }
    GameView.pieceDeselected();
  },

  pieceDeselected: () => {
    console.log(`GameView.pieceDeselected`);
    GameView._selectedPiece = null;
    validMoves = [];
    GameView.clearHighlights();
  },

  highlightValidMoves: (moves) => {
    console.log(`GameView.highlightValidMoves: (${moves.length} moves)`);
    GameView.clearHighlights();
    moves.forEach(move => {
      const [r, c] = move.move[1];
      document.getElementById(`cell-${r}-${c}`).classList.add("highlight");
    });
  },

  clearHighlights: () => {
    console.log(`GameView.clearHighlights`);
    document.querySelectorAll(".highlight").forEach(cell => cell.classList.remove("highlight"));
  }
}
