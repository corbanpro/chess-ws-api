import WasmInit from "./chess.js";
import { InitGame } from "./game.js";

WasmInit({}).then(() => {
  InitGame();
});
