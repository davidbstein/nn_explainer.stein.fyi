
function initialize_board_view() {
  const boardContainer = document.getElementById("board-container");
  boardContainer.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.id = `cell-${i}-${j}`;
      if ((i + j) % 2 === 0) {
        cell.classList.add("light-cell");
      } else {
        cell.classList.add("dark-cell");
      }
      boardContainer.appendChild(cell);
    }
  }
}

function initialize_control_view() {
  const controlsContainer = document.getElementById("controls-container");
  controlsContainer.innerHTML = `
    <button id="randomize-parameters">Randomize Parameters</button>
    <button id="reset-game">Reset Game</button>
  `;

  document.getElementById("randomize-parameters").addEventListener("click", randomizeParameters);
  document.getElementById("reset-game").addEventListener("click", resetGame);
}


function update_board_view() {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const cell = document.getElementById(`cell-${i}-${j}`);
      cell.innerHTML = "";
      const piece = window.GameState.boardState[i][j];
      if (piece !== ".") {
        const pieceDiv = document.createElement("div");
        pieceDiv.className = piece.toLowerCase() === "w" ? "white" : "black";
        if (piece === "W" || piece === "B") pieceDiv.classList.add("king");
        cell.appendChild(pieceDiv);
      }
      cell.onclick = () => {
        if (selectedPiece) {
          pieceMoved(i, j);
        } else {
          pieceSelected(i, j);
        }
      };
    }
  }
}

function initialize_parameters_view() {
  const parameterContainer = document.getElementById("parameter-container");
  parameterContainer.innerHTML = ".";
  parameters.forEach(param => {
    const paramDiv = document.createElement("div");
    paramDiv.className = "parameter";
    paramDiv.innerHTML = `
      <label>${param.description}: 
        <input type="range" min="0" max="1" step="0.01" value="${param.value}" id="${param.name}">
        <span>${param.value}</span>
      </label>
    `;
    parameterContainer.appendChild(paramDiv);
    const slider = paramDiv.querySelector("input");
    slider.addEventListener("input", () => {
      param.value = slider.value;
      paramDiv.querySelector("span").textContent = slider.value;
    });
  });
}


let selectedPiece = null;
let validMoves = [];

function pieceSelected(r, c) {
  if (window.GameState.boardState[r][c].toLowerCase() !== window.GameState.currentPlayer) return;
  selectedPiece = [r, c];
  validMoves = list_valid_moves(window.GameState.boardState, window.GameState.currentPlayer)
    .filter(move => _.isEqual(move.move[0], selectedPiece));
  highlightValidMoves(validMoves);
}

function pieceMoved(r, c) {
  if (selectedPiece && validMoves.some(move => _.isEqual(move.move[1], [r, c]))) {
    const moveSuccessful = make_move(selectedPiece, [r, c]);
  }
  pieceDeselected();
}

function pieceDeselected() {
  selectedPiece = null;
  validMoves = [];
  clearHighlights();
}

function highlightValidMoves(moves) {
  clearHighlights();
  moves.forEach(move => {
    const [r, c] = move.move[1];
    document.getElementById(`cell-${r}-${c}`).classList.add("highlight");
  });
}

function clearHighlights() {
  document.querySelectorAll(".highlight").forEach(cell => cell.classList.remove("highlight"));
}

document.querySelectorAll(".cell").forEach(cell => {
  cell.addEventListener("click", () => {
    const [r, c] = cell.id.split("-").slice(1).map(Number);
    if (selectedPiece) {
      pieceMoved(r, c);
    } else {
      pieceSelected(r, c);
    }
  });
});