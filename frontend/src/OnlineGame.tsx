import Board from "./Board.js";
import { useContext, useState } from "react";
import { GameContext } from "./GameWrapper.js";

type TErrorMessage = {
  message_type: "error";
  text: string;
};
type TLeaveMessage = {
  message_type: "leave";
  text: string;
};
type TJoinMessage = {
  message_type: "join";
  text: string;
};
type TPingMessage = {
  message_type: "ping";
  is_up: string;
};

type TInitMessage = {
  message_type: "init";
  num: string;
};
type TMoveMessage = {
  message_type: "move";
  start_sq_coords: string;
  end_sq_coords: string;
  myTime: number;
};
type TMessageData =
  | TInitMessage
  | TMoveMessage
  | TPingMessage
  | TJoinMessage
  | TErrorMessage
  | TLeaveMessage;

type TMessage = {
  sender_id: string;
  data: string;
};

let lastMoved = [["", ""]];
let movedFrom = [""];
let movedTo = [""];
const id = Math.random().toString().substring(2);
// const id = localStorage.getItem("id") ?? Math.random().toString().substring(10);
// localStorage.setItem("id", id);
const ruleset = "asdf"; // set in game.html by server
let lastPing = Date.now();
const room = 1; // set in game.html by server
const proto = location.protocol.startsWith("https") ? "wss" : "ws";
const host = "127.0.0.1:8000";
const wsUrl = `${proto}://${host}/websocket/${room}/${id}/${ruleset}`;
const initNum = Math.random().toString().substring(5);

let websocket: WebSocket;
websocket = new WebSocket(wsUrl);

function SendMessage(message: TMessageData) {
  console.log(websocket.readyState);
  const messageToSend: TMessage = {
    sender_id: id,
    data: JSON.stringify(message),
  };
  websocket.send(JSON.stringify(messageToSend));
}
websocket.onopen = () => {
  console.log("connected");
  SendMessage({
    message_type: "init",
    num: initNum,
  });
};

export default function Online() {
  const [_, setCount] = useState(0);
  const { game } = useContext(GameContext);
  let teamInCheck = "";
  let winningTeam = "";
  function UpdateGame() {
    setCount((prev) => prev + 1);
  }

  websocket.onmessage = (e) => {
    const message: TMessage = JSON.parse(e.data);
    const data: TMessageData = JSON.parse(message.data);

    console.log(data);
    if (data.message_type === "ping") {
      lastPing = Date.now();
    } else if (data.message_type === "move") {
      ReceiveMove(data);
    }
  };

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
    lastMoved = [["", ""]];
    alert(`${winningTeam} wins!`);
    game.is_white_view = true;
    game.reset();
    UpdateGame();
  }

  function MovePiece(start_sq_coords: string, end_sq_coords: string) {
    lastMoved = game.move_piece(start_sq_coords, end_sq_coords);
    movedFrom = lastMoved.map((move) => move[0]);
    movedTo = lastMoved.map((move) => move[1]);
    UpdateGame();
  }

  function SendMove(start_sq_coords: string, end_sq_coords: string) {
    SendMessage({
      message_type: "move",
      start_sq_coords,
      end_sq_coords,
      myTime: Date.now(),
    });
  }

  function ReceiveMove(data: TMoveMessage) {
    const { start_sq_coords, end_sq_coords } = data;
    MovePiece(start_sq_coords, end_sq_coords);
    HandleCheck();
  }

  function onPieceMove(start_sq_coords: string, end_sq_coords: string) {
    try {
      MovePiece(start_sq_coords, end_sq_coords);
      SendMove(start_sq_coords, end_sq_coords);
      HandleCheck();
    } catch (e: any) {
      if (!e.includes("Invalid Move")) {
        console.error(e);
      }
      UpdateGame();
    }
  }

  return (
    <div>
      <div className="text-center m-5 display-1">Pro Chess</div>
      <Board game={game} onPieceMove={onPieceMove} movedFrom={movedFrom} movedTo={movedTo} />
    </div>
  );
}
