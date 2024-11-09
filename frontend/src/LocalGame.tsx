import Board from "./Board.js";
import { useContext, useState } from "react";
import { GameContext } from "./GameWrapper.js";
export default function LocalGame() {
  const { game, UpdateGame } = useContext(GameContext);
  const [switchSides, setSwitchSides] = useState(false);
  let teamInCheck = "";
  let winningTeam = "";

  async function onPieceMove(start_sq_coords: string, end_sq_coords: string) {
    try {
      MovePiece(start_sq_coords, end_sq_coords);
      HandleLastPawn();
      game.is_white_view = game.is_white_turn();
      UpdateGame();
      HandleCheck();
    } catch (e: any) {
      if (!e.includes("Invalid Move")) {
        console.error(e);
      }
      UpdateGame();
    }
  }

  function MovePiece(start_sq_coords: string, end_sq_coords: string) {
    game.lastMoved = game.move_piece(start_sq_coords, end_sq_coords);
    game.movedFrom = game.lastMoved.map((move) => move[0]);
    game.movedTo = game.lastMoved.map((move) => move[1]);
    UpdateGame();
  }

  function HandleLastPawn() {
    if (game.has_last_rank_pawn()) {
      const promotionPiece = prompt("Promotion Piece: ") || "Queen";
      game.replace_last_rank_pawn(promotionPiece);
      UpdateGame();
      return promotionPiece;
    }
    return "";
  }

  function HandleCheck() {
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
      }
    }
  }

  function ResetGame() {
    game.lastMoved = [["", ""]];
    alert(`${winningTeam} wins!`);
    game.is_white_view = true;
    game.reset();
    UpdateGame();
  }

  function ToggleSwitchSides() {
    game.is_white_view = game.is_white_turn();
    setSwitchSides((prev) => !prev);
  }

  return (
    <div>
      <div className="text-center m-5 display-1">Pro Chess</div>
      <div className="m-5 text-center">
        <button onClick={ToggleSwitchSides}>
          {switchSides ? "Disable Side Switch" : "Enable Side Switch"}
        </button>
      </div>
      <Board
        game={game}
        onPieceMove={onPieceMove}
        movedFrom={game.movedFrom}
        movedTo={game.movedTo}
      />
    </div>
  );
}
