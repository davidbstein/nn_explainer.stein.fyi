/**
 * the board has white at the bottom, black at the top, with the following numbering:
 * .. 32 .. 31 .. 30 .. 29
 * 28 .. 27 .. 26 .. 25 ..
 * .. 24 .. 23 .. 22 .. 21 
 * 20 .. 19 .. 18 .. 17 ..
 * .. 16 .. 15 .. 14 .. 13
 * 12 .. 11 .. 10 ..  9 ..
 * ..  8 ..  7 ..  6 ..  5
 * 4 ..  3 ..  2 ..  1 ..
 * 
 * so (7,0) is square 4, (0,7) is square 29
 */

function squareIdToCoordinates(id) {
  const row = 7 - Math.floor((id - 1) / 4);
  const col = ((id - 1) % 4) * 2 + ((row % 2 === 0) ? 0 : 1);
  return [row, 7 - col];
}

function coordinatesToSquareId([r, c]) {
  const row = 7 - r;
  const col = 7 - c;
  return 1 + row * 4 + Math.floor(col / 2);
}

AIParameters = [
  {
    tag: "ADV", 
    name: "Advancement", 
    description: "The parameter is credited with 1 for each passive man in the 5th and 6th rows (counting in passive's direction) and debited with 1 for each passive man in the 3rd and 4th rows.", 
    value: 1, 
    fn: ({boardState, currentPlayer}) => {
      let ADV = 0;
      boardState.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell.toLowerCase() === currentPlayer) {
            if (currentPlayer === "w") {
              if (r === 4 || r === 5) ADV -= 1;
              if (r === 2 || r === 3) ADV += 1;
            } else {
              if (r === 2 || r === 3) ADV -= 1;
              if (r === 4 || r === 5) ADV += 1;
            }
          }
        });
      });
      return ADV;
    }
  },
  {
    tag: "APEX",
    name: "Apex",
    description: "The parameter is debited with 1 if there are no kings on the board, if either square 7 or 26 is occupied by an active man, and if neither of these squares is occupied by a passive man.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const activeKings = boardState.flat().filter(cell => cell === 'B' || cell === 'W').length > 0;
      const apexSquares = [7, 26].map(squareIdToCoordinates);
      const occupiedByActive = apexSquares.some(([r, c]) => boardState[r][c].toLowerCase() === currentPlayer);
      const occupiedByPassive = apexSquares.some(([r, c]) => boardState[r][c].toLowerCase() === (currentPlayer === "w" ? "b" : "w"));

      return !activeKings && occupiedByActive && !occupiedByPassive ? -1 : 0;
    }
  },
  {
    tag: "BACK",
    name: "Back Row Bridge",
    description: "The parameter is credited with 1 if there are no active kings on the board and if the two bridge squares (1 and 3, or 30 and 32) in the back row are occupied by passive pieces.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const activeKings = boardState.flat().filter(cell => cell === 'B' || cell === 'W').length > 0;
      const bridgeSquaresWhite = [1, 3].map(squareIdToCoordinates);
      const bridgeSquaresBlack = [30, 32].map(squareIdToCoordinates);

      const passivePiecesWhite = bridgeSquaresWhite.every(([r, c]) => boardState[r][c].toLowerCase() === "w");
      const passivePiecesBlack = bridgeSquaresBlack.every(([r, c]) => boardState[r][c].toLowerCase() === "b");

      return !activeKings && ((currentPlayer === "w" && passivePiecesWhite) || (currentPlayer === "b" && passivePiecesBlack)) ? 1 : 0;
    }
  },
  {
    tag: "CENT",
    name: "Center Control I",
    description: "The parameter is credited with 1 for each of the following squares: 11, 12, 15, 16, 20, 21, 24, and 25 which is occupied by a passive man.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const centerControlSquares = [11, 12, 15, 16, 20, 21, 24, 25].map(squareIdToCoordinates);
      return centerControlSquares.reduce((acc, [r, c]) => acc + (boardState[r][c].toLowerCase() === currentPlayer ? 1 : 0), 0);
    }
  },
  {
    tag: "CNTR",
    name: "Center Control II",
    description: "The parameter is credited with 1 for each of the following squares: 11, 12, 15, 16, 20, 21, 24, and 25 that is either currently occupied by an active piece or to which an active piece can move.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const centerControlSquares = [11, 12, 15, 16, 20, 21, 24, 25].map(squareIdToCoordinates);
      const opponent = currentPlayer === "w" ? "b" : "w";
      let control = 0;

      centerControlSquares.forEach(([r, c]) => {
        if (boardState[r][c].toLowerCase() === opponent) control += 1;

        const possibleMoves = GameManager.list_valid_moves({boardState, currentPlayer: opponent});
        possibleMoves.forEach(move => {
          const [nr, nc] = move.move[1];
          if (centerControlSquares.some(([cr, cc]) => cr === nr && cc === nc)) control += 1;
        });
      });

      return control;
    }
  },
  { 
    tag: "CORN", 
    name: "Double-Corner Credit", 
    description: "The parameter is credited with 1 if the material credit value for the active side is 6 or less, if the passive side is ahead in material credit, and if the active side can move into one of the double-corner squares.", 
    value: 1, 
    fn: ({boardState, currentPlayer}) => {
      const doubleCornerSquares = currentPlayer === "w" ? [1, 3] : [30, 32];
      const activeSideValue = boardState.flat().filter(cell => cell.toLowerCase() === currentPlayer).length;
      const passiveSideValue = boardState.flat().filter(cell => cell.toLowerCase() === (currentPlayer === "w" ? "b" : "w")).length;

      if (activeSideValue > 6 || passiveSideValue <= activeSideValue) return 0;

      const possibleMoves = GameManager.list_valid_moves({boardState, currentPlayer});
      return possibleMoves.some(move => doubleCornerSquares.includes(move.move[1][0] * 8 + move.move[1][1])) ? 1 : 0;
    }
  },
  { 
    tag: "CRAMP", 
    name: "Cramp", 
    description: "The parameter is credited with 2 if the passive side occupies the cramping square (13 for Black, and 20 for White) and at least one other nearby square (9 or 14 for Black, and 19 or 24 for White), while certain squares (17, 21, 22 and 25 for Black, and 8, 11, 12 and 16 for White) are all occupied by the active side.", 
    value: 2, 
    fn: ({boardState, currentPlayer}) => {
      const crampingSquare = currentPlayer === "w" ? 20 : 13;
      const nearbySquares = currentPlayer === "w" ? [19, 24] : [9, 14];
      const activeControlSquares = currentPlayer === "w" ? [8, 11, 12, 16] : [17, 21, 22, 25];
      const opponent = currentPlayer === "w" ? "b" : "w";

      const cramp = nearbySquares.some(pos => {
        const r = Math.floor(pos / 8);
        const c = pos % 8;
        return boardState[r][c].toLowerCase() === currentPlayer;
      }) && activeControlSquares.every(pos => {
        const r = Math.floor(pos / 8);
        const c = pos % 8;
        return boardState[r][c].toLowerCase() === opponent;
      });

      return cramp ? 2 : 0;
    }
  },
  {
    tag: "DENY",
    name: "Denial of Occupancy",
    description: "The parameter is credited with 1 for each square defined in MOB if on the next move a piece occupying this square could be captured without an exchange.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const opponent = currentPlayer === "w" ? "b" : "w";
      let denyCount = 0;

      // Check mobility for the opponent
      boardState.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell.toLowerCase() === opponent) {
            const possibleMoves = GameManager.list_valid_moves({boardState, currentPlayer: opponent});
            possibleMoves.forEach(move => {
              const [nr, nc] = move.move[1];
              if (boardState[nr][nc] === "") {
                const potentialCaptures = GameManager.list_valid_moves({boardState, currentPlayer}).some(nextMove => {
                  return nextMove.move[1][0] === nr && nextMove.move[1][1] === nc;
                });
                if (potentialCaptures) denyCount++;
              }
            });
          }
        });
      });

      return denyCount;
    }
  },
  {
    tag: "DIA",
    name: "Double Diagonal File",
    description: 
      "The parameter is credited with 1 for each passive piece located "+
      "in the diagonal files terminating in the double-corner squares.",
    fn: ({boardState, currentPlayer}) => {
      const doubleDiagonalSquares = [4, 8, 11, 15, 18, 22, 25, 29];
      return doubleDiagonalSquares.reduce((acc, pos) => {
        const r = Math.floor(pos / 8);
        const c = pos % 8;
        return acc + (boardState[r][c].toLowerCase() === currentPlayer ? 1 : 0);
      }, 0);
    },
    value: 1
  },
  {
    tag: "DIAV",
    name: "Diagonal Moment Value",
    description: "The parameter is credited with 1/2 for each passive piece located on squares 2 removed from the double-corner diagonal files, with 1 for each passive piece located on squares 1 removed from the double-corner files and with 3/2 for each passive piece in the double-corner files.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const twoRemoved = currentPlayer === "w" ? [9, 18, 27, 36] : [9, 18, 27, 36];
      const oneRemoved = currentPlayer === "w" ? [10, 19, 28, 37] : [10, 19, 28, 37];
      const doubleCorner = currentPlayer === "w" ? [11, 20, 29, 38] : [11, 20, 29, 38];
  
      const diavScore = (positions, multiplier) => {
        return positions.reduce((acc, pos) => {
          const r = Math.floor(pos / 8);
          const c = pos % 8;
          return acc + (boardState[r][c].toLowerCase() === currentPlayer ? multiplier : 0);
        }, 0);
      };
  
      return diavScore(twoRemoved, 0.5) + diavScore(oneRemoved, 1) + diavScore(doubleCorner, 1.5);
    }
  },  
  {
    tag: "LEVEE",
    name: "Levee",
    description: "The parameter is credited with 1 for each string of passive pieces that occupy three adjacent diagonal squares.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      let dykeCount = 0;
      const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (boardState[r][c].toLowerCase() === currentPlayer) {
            directions.forEach(([dr, dc]) => {
              if (
                r + 2 * dr >= 0 && r + 2 * dr < 8 &&
                c + 2 * dc >= 0 && c + 2 * dc < 8 &&
                boardState[r + dr][c + dc].toLowerCase() === currentPlayer &&
                boardState[r + 2 * dr][c + 2 * dc].toLowerCase() === currentPlayer
              ) {
                dykeCount++;
              }
            });
          }
        }
      }
      return dykeCount;
    }
  },
  {
    tag: "EXCH",
    name: "Exchange",
    description: "The parameter is credited with 1 for each square to which the active side may advance a piece and, in so doing, force an exchange.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const opponent = currentPlayer === "w" ? "b" : "w";
      let exchangeCount = 0;

      // Check potential exchanges for the active player
      boardState.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell.toLowerCase() === currentPlayer) {
            const possibleMoves = GameManager.list_valid_moves({boardState, currentPlayer});
            possibleMoves.forEach(move => {
              const [nr, nc] = move.move[1];
              if (boardState[nr][nc] === "") {
                const potentialExchanges = GameManager.list_valid_moves({boardState, currentPlayer: opponent}).some(opMove => {
                  return opMove.move[1][0] === nr && opMove.move[1][1] === nc;
                });
                if (potentialExchanges) exchangeCount++;
              }
            });
          }
        });
      });

      return exchangeCount;
    }
  },
  {
    tag: "EXPOS",
    name: "Exposure",
    description: "The parameter is credited with 1 for each passive piece that is flanked along one or the other diagonal by two empty squares.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      let exposureCount = 0;
      const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (boardState[r][c].toLowerCase() === currentPlayer) {
            directions.forEach(([dr, dc]) => {
              if (
                r + 2 * dr >= 0 && r + 2 * dr < 8 &&
                c + 2 * dc >= 0 && c + 2 * dc < 8 &&
                boardState[r + dr][c + dc] === "" &&
                boardState[r + 2 * dr][c + 2 * dc] === ""
              ) {
                exposureCount++;
              }
            });
          }
        }
      }
      return exposureCount;
    }
  },
  {
    tag: "FORK",
    name: "Threat of Fork",
    description: "The parameter is credited with 1 for each situation in which passive pieces occupy two adjacent squares in one row and in which there are three empty squares so disposed that the active side could, by occupying one of them, threaten a sure capture of one or the other of the two pieces.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const opponent = currentPlayer === "w" ? "b" : "w";
      let forkCount = 0;
  
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (boardState[r][c].toLowerCase() === currentPlayer) {
            const adjSquares = [
              [r, c + 1], [r, c - 1],
              [r + 1, c], [r - 1, c]
            ];
  
            adjSquares.forEach(([r1, c1], i) => {
              if (r1 >= 0 && r1 < 8 && c1 >= 0 && c1 < 8 && boardState[r1][c1].toLowerCase() === currentPlayer) {
                const emptySquares = adjSquares.filter((_, j) => j !== i && j !== (i ^ 1)).map(([r2, c2]) => [r2, c2]);
                emptySquares.forEach(([r3, c3]) => {
                  if (r3 >= 0 && r3 < 8 && c3 >= 0 && c3 < 8 && boardState[r3][c3] === "") {
                    const possibleMoves = GameManagerHelper.valid_moves_for_piece({r: r3, c: c3}, boardState, opponent);
                    if (possibleMoves.some(([_, [nr, nc]]) => nr === r1 && nc === c1)) {
                      forkCount++;
                    }
                  }
                });
              }
            });
          }
        }
      }
      return forkCount;
    }
  },
  {
    tag: "GAP",
    name: "Gap",
    description: "The parameter is credited with 1 for each single empty square that separates two passive pieces along a diagonal, or that separates a passive piece from the edge of the board.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      let gapCount = 0;
      const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (boardState[r][c].toLowerCase() === currentPlayer) {
            directions.forEach(([dr, dc]) => {
              const nr = r + dr;
              const nc = c + dc;
              const nnr = r + 2 * dr;
              const nnc = c + 2 * dc;
  
              if (
                nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && boardState[nr][nc] === "" &&
                nnr >= 0 && nnr < 8 && nnc >= 0 && nnc < 8 && boardState[nnr][nnc].toLowerCase() === currentPlayer
              ) {
                gapCount++;
              }
  
              if (
                nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && boardState[nr][nc] === "" &&
                (nr + dr < 0 || nr + dr >= 8 || nc + dc < 0 || nc + dc >= 8)
              ) {
                gapCount++;
              }
            });
          }
        }
      }
      return gapCount;
    }
  },
  {
    tag: "GUARD",
    name: "Back Row Control",
    description: "The parameter is credited with 1 if there are no active kings and if either the Bridge or the Triangle of Oreo is occupied by passive pieces.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const activeKings = boardState.flat().filter(cell => cell === 'B' || cell === 'W').length > 0;
      if (activeKings) return 0;
  
      const bridgeSquaresWhite = [1, 2, 3];
      const bridgeSquaresBlack = [29, 30, 31];
      const triangleOfOreoWhite = [0, 1, 2];
      const triangleOfOreoBlack = [30, 31, 32];
  
      const passiveControlWhite = bridgeSquaresWhite.every(pos => {
        const r = Math.floor(pos / 8);
        const c = pos % 8;
        return boardState[r][c].toLowerCase() === "w";
      }) || triangleOfOreoWhite.every(pos => {
        const r = Math.floor(pos / 8);
        const c = pos % 8;
        return boardState[r][c].toLowerCase() === "w";
      });
  
      const passiveControlBlack = bridgeSquaresBlack.every(pos => {
        const r = Math.floor(pos / 8);
        const c = pos % 8;
        return boardState[r][c].toLowerCase() === "b";
      }) || triangleOfOreoBlack.every(pos => {
        const r = Math.floor(pos / 8);
        const c = pos % 8;
        return boardState[r][c].toLowerCase() === "b";
      });
  
      return (currentPlayer === "w" && passiveControlWhite) || (currentPlayer === "b" && passiveControlBlack) ? 1 : 0;
    }
  },
  {
    tag: "HOLE",
    name: "Hole",
    description: "The parameter is credited with 1 for each empty square that is surrounded by three or more passive pieces.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      let holeCount = 0;
      const directions = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
  
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (boardState[r][c] === "") {
            const surroundingPieces = directions.reduce((acc, [dr, dc]) => {
              const nr = r + dr;
              const nc = c + dc;
              return acc + (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && boardState[nr][nc].toLowerCase() === currentPlayer ? 1 : 0);
            }, 0);
            if (surroundingPieces >= 3) holeCount++;
          }
        }
      }
      return holeCount;
    }
  },
  {
    tag: "KCENT",
    name: "King Center Control",
    description: "The parameter is credited with 1 for each of the following squares: 11, 12, 15, 16, 20, 21, 24, and 25 which is occupied by a passive king.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const centerSquares = [11, 12, 15, 16, 20, 21, 24, 25].map(squareIdToCoordinates);
      return centerSquares.reduce((acc, [r, c]) => acc + (boardState[r][c] === currentPlayer.toUpperCase() ? 1 : 0), 0);
    }
  },{
    tag: "MOB",
    name: "Total Mobility",
    description: "The parameter is credited with 1 for each square to which the active side could move one or more pieces in the normal fashion, disregarding the fact that jump moves may or may not be available.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const moveList = GameManager.list_valid_moves({boardState, currentPlayer});
      return moveList.length;
    }
  },{
    tag: "MOBIL",
    name: "Undenied Mobility",
    description: "The parameter is credited with the difference between MOB and DENY.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const mob = AIParameters.find(p => p.tag === "MOB").fn({boardState, currentPlayer});
      const deny = AIParameters.find(p => p.tag === "DENY").fn({boardState, currentPlayer});
      return mob - deny;
    }
  },{
    tag: "MOVE",
    name: "Move",
    description: "The parameter is credited with 1 if pieces are even with a total piece count (2 for men, and 3 for kings) of less than 24, and if an odd number of pieces are in the move system, defined as those vertical files starting with squares 1, 2, 3, and 4.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const pieceCount = boardState.flat().reduce((acc, cell) => {
        if (cell.toLowerCase() === currentPlayer) {
          return acc + (cell === cell.toLowerCase() ? 2 : 3);
        }
        return acc;
      }, 0);
  
      const totalPieces = boardState.flat().filter(cell => cell.toLowerCase() === currentPlayer).length;
      const moveSystemSquares = [0, 1, 2, 3, 8, 9, 10, 11, 16, 17, 18, 19, 24, 25, 26, 27];
      const oddMoveSystemPieces = moveSystemSquares.reduce((acc, pos) => {
        const r = Math.floor(pos / 8);
        const c = pos % 8;
        return acc + (boardState[r][c].toLowerCase() === currentPlayer ? 1 : 0);
      }, 0) % 2 !== 0;
  
      return totalPieces < 24 && pieceCount % 2 === 0 && oddMoveSystemPieces ? 1 : 0;
    },
  },{
    tag: "NODE",
    name: "Node",
    description: "The parameter is credited with 1 for each passive piece that is surrounded by at least three empty squares.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      let nodeCount = 0;
      const directions = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
  
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (boardState[r][c].toLowerCase() === currentPlayer) {
            const surroundingEmpty = directions.reduce((acc, [dr, dc]) => {
              const nr = r + dr;
              const nc = c + dc;
              return acc + (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && boardState[nr][nc] === "" ? 1 : 0);
            }, 0);
            if (surroundingEmpty >= 3) nodeCount++;
          }
        }
      }
      return nodeCount;
    }
  }, {
    tag: "OREO",
    name: "Triangle of Oreo",
    description: "The parameter is credited with 1 if there are no passive kings and if the Triangle of Oreo (squares 2, 3 and 7 for Black, and squares 26, 30 and 31 for White) is occupied by passive pieces.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const passiveKing = currentPlayer === "w" ? "B" : "W";
      const passive = currentPlayer === "w" ? "b" : "w";
      const oreoSquares = currentPlayer === "w" ? [26, 30, 31] : [2, 3, 7];
      
      const hasPassiveKing = boardState.flat().includes(passiveKing);
      if (hasPassiveKing) return 0;
  
      const allOccupied = oreoSquares.every(id => {
        const [r, c] = squareIdToCoordinates(id);
        return boardState[r][c] === passive;
      });
  
      return allOccupied ? 1 : 0;
    }
  }, 
  {
    tag: "POLE",
    name: "Pole",
    description: "The parameter is credited with 1 for each passive man that is completely surrounded by empty squares.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const passive = currentPlayer === "w" ? "b" : "w";
      let poleCount = 0;
  
      const directions = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
  
      boardState.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell === passive) {
            const surroundedByEmpty = directions.every(([dr, dc]) => {
              const nr = r + dr;
              const nc = c + dc;
              return nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && boardState[nr][nc] === " ";
            });
            if (surroundedByEmpty) poleCount++;
          }
        });
      });
  
      return poleCount;
    }
  },
  {
    tag: "THRET",
    name: "Threat",
    description: "The parameter is credited with 1 for each square to which an active piece may be moved and in so doing threaten the capture of a passive piece on a subsequent move.",
    value: 1,
    fn: ({boardState, currentPlayer}) => {
      const opponent = currentPlayer === "w" ? "b" : "w";
  
      const validMoves = GameManager.list_valid_moves({boardState, currentPlayer});
      const threatSquares = [];
  
      validMoves.forEach(move => {
        const nextBoardState = move.nextGameState.boardState;
        // Check if any of the opponent's pieces can be captured in the new board state
        const nextValidMoves = GameManager.list_valid_moves({boardState: nextBoardState, currentPlayer});
        nextValidMoves.forEach(m => {
          const [nextR, nextC] = m.move[0];
          const [secondR, secondC] = m.move[1];
          if (Math.abs(nextR - secondR) === 2){
            threatSquares.push([nextR, nextC]);
          }
        });
      });
      const uniqueThreatSquares = [...new Set(threatSquares.map(JSON.stringify))].map(JSON.parse);
      return uniqueThreatSquares.length;
    }
  }  
];  