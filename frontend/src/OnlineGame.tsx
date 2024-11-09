import Board from "./Board.js";
import { useContext, useEffect, useState } from "react";
import { GameContext, TRuleSet } from "./GameWrapper.js";
import { backendHost } from "../constants.ts";
import { useParams } from "react-router-dom";

type TErrorMessage = {
  message_type: "error";
  text: string;
};
type TDrawMessage = {
  message_type: "draw";
  type: "extend" | "accept" | "reject";
};
type TLeaveMessage = {
  message_type: "leave";
  text: string;
};
type TResignMessage = {
  message_type: "resign";
  text: string;
};
type TJoinMessage = {
  message_type: "join";
  num: number;
};
type TPingMessage = {
  message_type: "ping";
  is_up: string;
};

type TInitMessage = {
  message_type: "init";
  rule_set: TRuleSet;
  num: number;
};

type TResetMessage = {
  message_type: "reset";
  game_data: any;
};

type TMoveMessage = {
  message_type: "move";
  start_sq_coords: string;
  end_sq_coords: string;
  myTime: number;
  lastPawnAction: string;
};

type TMessageData =
  | TResignMessage
  | TDrawMessage
  | TInitMessage
  | TMoveMessage
  | TPingMessage
  | TJoinMessage
  | TErrorMessage
  | TResetMessage
  | TLeaveMessage;

type TMessage = {
  sender_id: string;
  data: string;
};

let lastPing = Date.now();

export default function WebSocketWrapper() {
  const [SendMessage, SetSendMessage] = useState<(message: TMessageData) => void>(() => () => {});
  const [OnReceiveMessage, SetOnReceiveMessage] = useState<
    (callback: (data: TMoveMessage) => void) => void
  >(() => () => {});
  const { game, StartNewGame, rule_set } = useContext(GameContext);
  const setCount = useState<number>(0)[1];
  const [teamsChosen, setTeamsChosen] = useState(false);
  const { room_id } = useParams();

  useEffect(() => {
    const id = Math.random().toString(32).substring(2);

    const proto = location.protocol.startsWith("https") ? "wss" : "ws";

    const wsUrl = `${proto}://${backendHost}/websocket/${room_id}/${id}/${rule_set}`;
    const webSocket: WebSocket = new WebSocket(wsUrl);

    webSocket.onopen = () => {
      console.log("Connected");
      SendMessage({ message_type: "join", num: game.my_random_number });
    };

    function HandleLostConnection() {
      console.log("Lost Connection");
    }

    webSocket.onclose = () => {
      HandleLostConnection();
    };

    function SendMessage(message: TMessageData) {
      console.log("Sent", message);
      const messageToSend: TMessage = {
        sender_id: id,
        data: JSON.stringify(message),
      };
      webSocket.send(JSON.stringify(messageToSend));
    }

    function SetTeams(num: number, opp_id: string) {
      game.opp_random_number = num;
      if (num > game.my_random_number) {
        game.is_white_view = true;
        game.white_id = id;
        game.black_id = opp_id;
      } else {
        game.is_white_view = false;
        game.white_id = opp_id;
        game.black_id = id;
      }
      setTeamsChosen(true);
      UpdateGame();
    }

    function OnReceiveMessage(callback: (data: TMoveMessage) => void) {
      webSocket.onmessage = (e) => {
        const message: TMessage = JSON.parse(e.data);
        const data: TMessageData = JSON.parse(message.data);
        console.log("Received", data);

        if (data.message_type === "ping") {
          lastPing = Date.now();
        } else if (data.message_type === "move") {
          callback(data);
        } else if (data.message_type === "draw") {
          if (data.type === "extend") {
            if (confirm("Accept Draw?")) {
              SendMessage({ message_type: "draw", type: "accept" });
              StartNewGame();
            } else {
              SendMessage({ message_type: "draw", type: "reject" });
            }
          } else if (data.type === "accept") {
            alert("Draw Accepted");
            StartNewGame();
          } else {
            alert("Draw Declined");
          }
        } else if (data.message_type === "error") {
          //alert(data.text);
        } else if (data.message_type === "leave") {
          alert("Opponent left");
        } else if (data.message_type === "resign") {
          alert("The opponent resigned!");
          StartNewGame();
        } else if (data.message_type === "join") {
          if (game.move_num() > 0) {
            const game_data = {
              game_dump: game.dump(),
              ...game,
            };
            SendMessage({ message_type: "reset", game_data });
            alert("Opponent rejoined");
          } else {
            SendMessage({
              message_type: "init",
              rule_set,
              num: game.my_random_number,
            });
            SetTeams(data.num, message.sender_id);
          }
        } else if (data.message_type === "reset") {
          game.from_dump(data.game_data.game_dump);
          game.black_id = data.game_data.black_id;
          game.white_id = data.game_data.white_id;
          game.is_white_view = !data.game_data.is_white_view;
          game.my_random_number = data.game_data.opp_random_number;
          game.opp_random_number = data.game_data.my_random_number;
          game.lastMoved = data.game_data.lastMoved;
          game.movedFrom = data.game_data.movedFrom;
          game.movedTo = data.game_data.movedTo;
          setTeamsChosen(true);
          UpdateGame();
        } else if (data.message_type === "init") {
          if (rule_set !== data.rule_set) {
            throw new Error("Rule set mismatch");
          }
          SetTeams(data.num, message.sender_id);
        }
      };
    }
    OnReceiveMessage(() => {});

    function UpdateGame() {
      setCount((prev) => prev + 1);
    }

    const pingInterval = setInterval(() => {
      if (Date.now() - lastPing > 15_000) {
        HandleLostConnection();
      }
    }, 10_000);

    SetSendMessage(() => SendMessage);
    SetOnReceiveMessage(() => OnReceiveMessage);
    return () => {
      clearInterval(pingInterval);
      webSocket.close();
    };
    // eslint-disable-next-line
  }, []);

  if (!teamsChosen) {
    return <div>Give your friend the room code: {room_id}</div>;
  }

  return (
    <div>
      <OnlineGame SendMessage={SendMessage} OnReceiveMessage={OnReceiveMessage} />
    </div>
  );
}

function OnlineGame({
  SendMessage,
  OnReceiveMessage,
}: {
  SendMessage: (message: TMessageData) => void;
  OnReceiveMessage: (callback: (data: TMoveMessage) => void) => void;
}) {
  const setCount = useState<number>(0)[1];
  function UpdateGame() {
    setCount((prev) => prev + 1);
  }
  const { game, StartNewGame } = useContext(GameContext);

  let teamInCheck = "";
  let winningTeam = "";

  async function onPieceMove(start_sq_coords: string, end_sq_coords: string) {
    try {
      MovePiece(start_sq_coords, end_sq_coords);
      const lastPawnAction = HandleLastPawn();
      SendMove(start_sq_coords, end_sq_coords, lastPawnAction);
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

  function SendMove(start_sq_coords: string, end_sq_coords: string, lastPawnAction: string) {
    SendMessage({
      message_type: "move",
      start_sq_coords,
      end_sq_coords,
      myTime: Date.now(),
      lastPawnAction,
    });
  }

  OnReceiveMessage((data) => {
    const { start_sq_coords, end_sq_coords, lastPawnAction } = data;
    MovePiece(start_sq_coords, end_sq_coords);
    if (lastPawnAction) {
      game.replace_last_rank_pawn(lastPawnAction);
      UpdateGame();
    }
    HandleCheck();
  });

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
        setTimeout(GameFinished, 1);
      }
    }
  }

  function GameFinished() {
    if (winningTeam) alert(`${winningTeam} wins!`);
    StartNewGame();
  }

  function onResign() {
    const resign = confirm("Resign?");
    if (resign) {
      StartNewGame();
      SendMessage({ message_type: "resign", text: "Resigned" });
    }
  }

  function onRequestDraw() {
    const draw = confirm("Request Draw?");
    if (draw) {
      SendMessage({ message_type: "draw", type: "extend" });
    }
  }

  return (
    <div>
      <div className="text-center m-5 display-1">Pro Chess</div>
      <div className="text-center"></div>
      <Board
        game={game}
        onPieceMove={onPieceMove}
        onResign={onResign}
        onRequestDraw={onRequestDraw}
        movedFrom={game.movedFrom}
        movedTo={game.movedTo}
      />
    </div>
  );
}
