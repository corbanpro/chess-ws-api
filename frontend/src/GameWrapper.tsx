import { createContext, useEffect, useState } from "react";
import WasmInit, { Game as WasmGame } from "../wasm/pkg/chess.js";

type TGameAddons = {
  is_white_view: boolean;
};

export type TGame = WasmGame & TGameAddons;

type TGameContext = {
  game: TGame;
  UpdateGame: () => void;
};

export let GameContext: React.Context<TGameContext>;

async function GetDefaultGame() {
  await WasmInit({});
  let wasm_game = WasmGame.init();
  const default_addons: TGameAddons = { is_white_view: true };
  let game: TGame = Object.assign(wasm_game, default_addons);
  return game;
}

export default function GameWrapper({ children }: { children: React.ReactNode }) {
  const [game, setGame] = useState<TGame>();
  const [_, setCount] = useState<number>(0);

  useEffect(() => {
    GetDefaultGame().then((game) => {
      setGame(game);
    });
  }, []);

  if (!game) return <div></div>;

  function UpdateGame() {
    setCount((prev) => prev + 1);
  }

  const context = {
    game,
    UpdateGame,
  };

  GameContext = createContext<TGameContext>(context);

  return <GameContext.Provider value={context}>{children}</GameContext.Provider>;
}
