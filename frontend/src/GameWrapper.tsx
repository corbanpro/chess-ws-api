import { createContext, useEffect, useState } from "react";
import WasmInit, { Game as WasmGame } from "../wasm/pkg/chess.js";
import { useParams } from "react-router-dom";

type TGameAddons = {
  is_white_view: boolean;
  white_id: string;
  black_id: string;
  my_random_number: number;
  opp_random_number: number;
  lastMoved: [string, string][];
  movedFrom: string[];
  movedTo: string[];
};

export type TRuleSet = "standard" | "shuffled";
const rule_sets: string[] = ["standard", "shuffled"];
export type TGame = WasmGame & TGameAddons;
type TGameContext = {
  game: TGame;
  rule_set: TRuleSet;
  StartNewGame: () => void;
  UpdateGame: () => void;
};
export let GameContext: React.Context<TGameContext>;

export default function GameWrapper({ children }: { children: React.ReactNode }) {
  const [game, setGame] = useState<TGame>();
  const [gameNum, setGameNum] = useState<number>(0);
  const setCount = useState<number>(0)[1];
  const { rule_set: rule_set_param } = useParams();
  console.log(rule_set_param);
  let rule_set: TRuleSet;
  if (rule_sets.includes(rule_set_param ?? "")) {
    rule_set = rule_set_param as TRuleSet;
  } else {
    throw new Error("Invalid rule set");
  }

  function StartNewGame() {
    setGameNum((prev) => prev + 1);
  }

  async function GetDefaultGame(rule_set: TRuleSet) {
    await WasmInit({});
    const wasm_game = WasmGame.init(rule_set);
    const default_addons: TGameAddons = {
      is_white_view: true,
      white_id: "",
      black_id: "",
      my_random_number: Number(Math.random().toString().substring(2)),
      opp_random_number: NaN,
      lastMoved: [],
      movedFrom: [],
      movedTo: [],
    };
    const game: TGame = Object.assign(wasm_game, default_addons);
    return game;
  }

  useEffect(() => {
    GetDefaultGame(rule_set).then((game) => {
      setGame(game);
    });
  }, [gameNum, rule_set]);

  if (!game) return <div></div>;

  function UpdateGame() {
    setCount((prev) => prev + 1);
  }

  const context = {
    game,
    rule_set,
    StartNewGame,
    UpdateGame,
  };

  GameContext = createContext<TGameContext>(context);

  return <GameContext.Provider value={context}>{children}</GameContext.Provider>;
}
