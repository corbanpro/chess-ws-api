import { ProcessMessage } from "./game.js";

export const initNum = Math.random().toString().substring(5);

const id = Math.random().toString().substring(2);
// const id = localStorage.getItem("id") ?? Math.random().toString().substring(10);
// localStorage.setItem("id", id);
const ruleset = window.ruleset; // set in game.html by server
const room = window.room; // set in game.html by server
let websocket;

export function WebsocketInit(game) {
  let lastPing = Date.now();
  const proto = location.protocol.startsWith("https") ? "wss" : "ws";
  const host = window.location.host;
  const wsUrl = `${proto}://${host}/websocket/${room}/${id}/${ruleset}`;

  websocket = new WebSocket(wsUrl);

  websocket.onopen = () => {
    console.log("connected");
    SendMessage("init", initNum);
  };

  websocket.onmessage = (e) => {
    const message = JSON.parse(e.data);
    console.log(message);
    if (message.is_up) {
      lastPing = Date.now();
    } else {
      ProcessMessage(game, message);
    }
  };
}

export function SendMessage(message_type, text, myTime) {
  websocket.send(
    JSON.stringify({
      message_type,
      sender_id: id,
      text,
      myTime,
    }),
  );
}
