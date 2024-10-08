import Board from "./Board.js";
import { useContext } from "react";
import { GameContext } from "./GameWrapper.js";

let lastMoved = [["", ""]];

export default function Local() {
  let teamInCheck = "";
  let winningTeam = "";

  function ResetGame() {
    lastMoved = [["", ""]];
    alert(`${winningTeam} wins!`);
    game.is_white_view = true;
    game.reset();
    UpdateGame();
  }

  const { game, UpdateGame } = useContext(GameContext);

  function onPieceMove(start_sq_coords: string, end_sq_coords: string) {
    try {
      lastMoved = game.move_piece(start_sq_coords, end_sq_coords);
      UpdateGame();

      teamInCheck = "";
      winningTeam = "";

      if (game.is_white_turn() && game.in_check("White")) {
        teamInCheck = "White";
        winningTeam = "Black";
      } else if (game.is_black_turn() && game.in_check("Black")) {
        teamInCheck = "Black";
        winningTeam = "White";
      }

      if (teamInCheck) {
        console.log(teamInCheck, "in check");
        if (
          (teamInCheck === "White" && game.in_checkmate("White")) ||
          (teamInCheck === "Black" && game.in_checkmate("Black"))
        ) {
          setTimeout(ResetGame, 1);
        } else {
          game.is_white_view = !game.is_white_view;
        }
      } else {
        game.is_white_view = !game.is_white_view;
      }
    } catch (e) {
      console.log("invalid move");
      UpdateGame();
    }
  }

  return Board({ game, onPieceMove, lastMoved });
}
