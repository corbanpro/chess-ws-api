import { useContext } from "react";
import { GameContext } from "./GameWrapper";

export default function OnlineGame() {
  const { game } = useContext(GameContext);
  console.log(game);
  return <div>Online Game</div>;
}
