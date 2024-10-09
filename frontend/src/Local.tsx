import Board from "./Board.js";
import { useContext, useState } from "react";
import { GameContext } from "./GameWrapper.js";

let lastMoved = [["", ""]];
let movedFrom = [""];
let movedTo = [""];

export default function Local() {
  const [switchSides, setSwitchSides] = useState(false);
  const [_, setCount] = useState(0);
  function UpdateGame() {
    setCount((prev) => prev + 1);
  }
  let teamInCheck = "";
  let winningTeam = "";

  function ResetGame() {
    lastMoved = [["", ""]];
    alert(`${winningTeam} wins!`);
    game.is_white_view = true;
    game.reset();
    UpdateGame();
  }

  const { game } = useContext(GameContext);

  function onPieceMove(start_sq_coords: string, end_sq_coords: string) {
    try {
      lastMoved = game.move_piece(start_sq_coords, end_sq_coords);
      movedFrom = lastMoved.map((move) => move[0]);
      movedTo = lastMoved.map((move) => move[1]);

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
          if (switchSides) game.is_white_view = !game.is_white_view;
        }
      } else {
        if (switchSides) game.is_white_view = !game.is_white_view;
      }
    } catch (e) {
      console.log("invalid move");
      UpdateGame();
    }
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
      <Board game={game} onPieceMove={onPieceMove} movedFrom={movedFrom} movedTo={movedTo} />
    </div>
  );
}
