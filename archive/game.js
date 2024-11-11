import { SendMessage, initNum } from "./websocket.js";
import { Game } from "./chess.js";
import { WebsocketInit } from "./websocket.js";
import { MakeDragElement } from "./userInterface.js";

let myTimer;
let theirTimer;

export function InitGame() {
  let game = Game.init();
  WebsocketInit(game);
  game.ruleset = window.ruleset; // set in game.html by server
  game.myTime = ruleset.timer * 60;
  game.theirTime = ruleset.timer * 60;

  if (game.myTime) {
    document.getElementById("my-timer").innerText = GetTimeStr(game.myTime);
    document.getElementById("their-timer").innerText = GetTimeStr(game.theirTime);
  }

  updateBoardDisplay(game);
}

function updateBoardDisplay(game) {
  let domBoard = document.getElementById("board");
  while (domBoard.firstChild) {
    domBoard.firstChild.remove();
  }
  let board = game.js_board();
  if (game.myTeam === "White") {
    board = board.reverse();
  }
  board.forEach((rank, rankIndex) => {
    let rankStr = game.myTeam === "White" ? 8 - rankIndex : rankIndex + 1;
    rank.forEach((piece, pieceIndex) => {
      let squareClass = (pieceIndex + rankIndex) % 2 ? "bg-light" : "bg-dark";

      let domSquare = document.createElement("div");
      domSquare.id = ["a", "b", "c", "d", "e", "f", "g", "h"][pieceIndex] + rankStr;
      domSquare.classList.add("square", "dropzone", squareClass);

      let domPiece = document.createElement("div");
      domPiece.id = domSquare.id;
      if (piece?.team) {
        domPiece.classList.add(piece.team);
      }
      domPiece.classList.add("piece");
      domPiece.innerText = GetPieceChar(piece);

      domSquare.appendChild(domPiece);
      domBoard.appendChild(domSquare);
    });
  });

  if (game.black_in_check()) {
    if (game.in_checkmate("Black")) {
      if (game.myTeam === "White") {
        window.location.href = "/won.html";
      } else {
        window.location.href = "/lost.html";
      }
    }
    let domBlackKingSquare = document.getElementById(game.find_king("Black"));
    domBlackKingSquare.classList.add("check");
  } else if (game.white_in_check()) {
    if (game.in_checkmate("White")) {
      if (game.myTeam === "White") {
        window.location.href = "/lost.html";
      } else {
        window.location.href = "/won.html";
      }
    }
    let domWhiteKingSquare = document.getElementById(game.find_king("White"));
    domWhiteKingSquare.classList.add("check");
  }
  let pieces = document.querySelectorAll("." + game.myTeam + ".piece");
  pieces.forEach((piece) => {
    MakeDragElement(game, piece);
  });
}

export function ProcessMessage(game, { message_type, text, myTime: oppTime }) {
  console.log({ message_type, text });
  if (oppTime) {
    game.theirTime = oppTime;
  }

  const handlers = {};

  handlers.init = () => {
    if (game.move_num() > 0) {
      console.log(game);

      SendMessage("reset", JSON.stringify(game), game.myTime);
    } else {
      if (Number(initNum) > Number(text)) {
        game.myTeam = "White";
        myTurn(game);
      } else {
        game.myTeam = "Black";
        yourTurn(game);
      }
    }
  };

  handlers.move = () => {
    let { start, target, team } = JSON.parse(text);
    game.move_piece(start, target, team); // todo move_piece accept strings
    myTurn(game);
  };

  handlers.pawnReplace = () => {
    let {
      move: { start, target, team: move_team },
      pawn_replace: { piece_type, team: pawn_replace_team },
    } = JSON.parse(text);
    game.move_piece(start, target, move_team);
    game.replace_last_rank_pawn(piece_type, pawn_replace_team);
    myTurn(game);
  };

  handlers.join = () => {
    SendMessage("init", initNum, game.myTime);
  };

  handlers.reset = () => {
    game = JSON.parse(text);

    [game.mytime, game.theirTime] = [game.theirTime, game.myTime];
    game.myTurn = !game.myTurn;
    game.team = game.team === "White" ? "Black" : "White";
    if (game.myTurn) {
      myTurn(game);
    } else {
      yourTurn(game);
    }
  };

  handlers.leave = () => {};

  handlers[message_type]();

  updateBoardDisplay(game);
}

function myTurn(game) {
  game.myTurn = true;
  document.getElementById("glass").classList.remove("glass");
  if (ruleset.timer) {
    clearInterval(theirTimer);
    clearInterval(myTimer);
    myTimer = setInterval(() => {
      game.myTime -= 1;
      if (game.myTime < 0) {
        window.location.href = "/lost.html";
      }
      document.getElementById("my-timer").innerText = GetTimeStr(game.myTime);
    }, 1000);
  }
}
function yourTurn(game) {
  game.myTurn = false;
  document.getElementById("glass").classList.add("glass");
  if (ruleset.timer) {
    clearInterval(theirTimer);
    clearInterval(myTimer);
    theirTimer = setInterval(() => {
      game.theirTime -= 1;
      if (game.theirTime < 0) {
        window.location.href = "/won.html";
      }
      document.getElementById("their-timer").innerText = GetTimeStr(game.theirTime);
    }, 1000);
  }
}

export async function ExecuteMove(game, startSq, targetSq) {
  console.log({ startSq, targetSq, team: game.myTeam });
  try {
    game.move_piece(startSq, targetSq, game.myTeam);
    if (game.has_last_rank_pawn(game.myTeam)) {
      let domLastRankPawnModal = document.createElement("div");
      let domModalHeader = document.createElement("div");
      domModalHeader.classList.add("pawn-modal-header");
      domModalHeader.innerText = "Pick a Piece";
      domLastRankPawnModal.appendChild(domModalHeader);
      domLastRankPawnModal.classList.add("last-rank-pawn-modal");
      let PawnReplacePieces = [
        ["♕", "Queen"],
        ["♖", "Rook"],
        ["♗", "Bishop"],
        ["♘", "Knight"],
      ];
      for (let piece of PawnReplacePieces) {
        let domPieceBtn = document.createElement("div");
        domPieceBtn.id = piece[1];
        domPieceBtn.classList.add("piece-btn");
        domPieceBtn.innerText = piece[0] + " " + piece[1];
        domPieceBtn.onclick = (e) => ReplacePawn(e, domPieceBtn.id);
        domLastRankPawnModal.appendChild(domPieceBtn);
      }
      updateBoardDisplay(game);
      let glass = document.createElement("div");
      let domBoard = document.getElementById("board");
      glass.classList.add("glass");
      domBoard.appendChild(glass);
      function ReplacePawn(e, piece_type) {
        e.stopPropagation();
        game.replace_last_rank_pawn(piece_type, game.myTeam);
        window.postMessage("change pawn");
        SendMessage(
          "pawnReplace",
          JSON.stringify({
            move: { start: startSq, target: targetSq, team: game.myTeam },
            pawn_replace: {
              piece_type,
              team: game.myTeam,
            },
          }),
          game.myTime,
        );
      }
      document.onmouseup = null;
      document.onmousemove = null;
      domBoard.appendChild(domLastRankPawnModal);
      await new Promise((resolve) => {
        addEventListener("message", (e) => {
          if (e.data === "change pawn") {
            resolve();
          }
        });
      });
    } else {
      SendMessage(
        "move",
        JSON.stringify({ start: startSq, target: targetSq, team: game.myTeam }),
        game.myTime,
      );
    }
    yourTurn(game);
  } catch (e) {
    if (e !== "Error: Invalid Move") console.error(e);
  }
  updateBoardDisplay(game);
}

export function GetTimeStr(time) {
  let minutes = Math.floor(time / 60).toString();
  let seconds = Math.floor(time % 60).toString();
  seconds = seconds.length === 1 ? "0" + seconds : seconds;

  return minutes + ":" + seconds;
}

export function GetPieceChar(piece) {
  const chars = {
    White: {
      King: "♔",
      Queen: "♕",
      Rook: "♖",
      Bishop: "♗",
      Knight: "♘",
      Pawn: "♙",
    },
    Black: {
      King: "♚",
      Queen: "♛",
      Rook: "♜",
      Bishop: "♝",
      Knight: "♞",
      Pawn: "♟",
    },
  };
  return chars[piece?.team]?.[piece?.piece_type] ?? "";
}
