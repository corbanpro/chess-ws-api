use axum::{
    extract::{
        ws::{Message, WebSocket},
        Path, WebSocketUpgrade,
    },
    response::{Html, IntoResponse},
    routing::get,
    Extension, Router,
};
use futures::{stream::SplitSink, SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use shuttle_axum::ShuttleAxum;
use std::{collections::HashMap, fs, sync::Arc, time::Duration};
use tokio::{
    sync::{watch, Mutex},
    time::sleep,
};
use tower_http::services::ServeDir;
use watch::Receiver;
use watch::Sender;

#[derive(Debug, Clone)]
struct Room {
    rule_set: String,
    players: Vec<String>,
    room_tx: Sender<Message>,
    room_rx: Receiver<Message>,
}

#[derive(Debug, Clone)]
struct State {
    clients_count: usize,
    global_rx: Receiver<Message>,
    rooms: HashMap<String, Room>,
}

#[derive(Deserialize, Serialize)]
#[allow(dead_code)]
struct WsMessage {
    sender_id: String,
    data: String,
}

#[derive(Deserialize, Serialize)]
struct SysMessage {
    message_type: String,
    text: String,
}

const PAUSE_SECS: u64 = 15;

#[shuttle_runtime::main]
async fn main() -> ShuttleAxum {
    let (global_tx, global_rx) = watch::channel(Message::Text("{}".to_string()));

    let state = Arc::new(Mutex::new(State {
        clients_count: 0,
        global_rx,
        rooms: HashMap::new(),
    }));

    let state_send = state.clone();
    tokio::spawn(async move {
        let duration = Duration::from_secs(PAUSE_SECS);

        loop {
            let msg = json!(WsMessage {
                sender_id: "server".to_string(),
                data: json!(SysMessage {
                    message_type: "ping".to_string(),
                    text: "is_up".to_string()
                })
                .to_string(),
            })
            .to_string();
            println!("clients count: {}", state_send.lock().await.clients_count);

            if global_tx.send(Message::Text(msg)).is_err() {
                break;
            }

            sleep(duration).await;
        }
    });

    let router = Router::new()
        .route("/websocket/:room/:id/:rule_set", get(websocket_handler))
        .route("/game/:room", get(enter_room))
        .nest_service("/", ServeDir::new("static"))
        .layer(Extension(state));

    Ok(router.into())
}

#[derive(Deserialize)]
struct EnterRoomRequest {
    room: String,
}

async fn enter_room(
    Path(EnterRoomRequest { room }): Path<EnterRoomRequest>,
    Extension(state): Extension<Arc<Mutex<State>>>,
) -> impl IntoResponse {
    let state = state.lock().await;
    let ws_room = state.rooms.get(&room);
    if ws_room.is_none() {
        return Err("Room does not exist".to_string());
    }
    let rule_set = ws_room.unwrap().rule_set.clone();
    Ok(Html(
        fs::read_to_string("static/game.html")
            .unwrap()
            .replace("{{room}}", &room)
            .replace("{{ruleset}}", &rule_set),
    ))
}

#[derive(Deserialize)]
struct WsRequest {
    id: String,
    room: String,
    rule_set: String,
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    Path(WsRequest { room, id, rule_set }): Path<WsRequest>,
    Extension(state): Extension<Arc<Mutex<State>>>,
) -> impl IntoResponse {
    println!("websocket_handler");
    ws.on_upgrade(move |socket| websocket(socket, state, room, id, rule_set))
}

async fn websocket(stream: WebSocket, state: Arc<Mutex<State>>, room: String, id: String, rule_set: String) {
    println!("websocket");

    let (sender, mut receiver) = stream.split();

    let (mut global_rx, mut room_rx, room_tx, mut sender) =
        match join_room(state.clone(), sender, room.clone(), id.clone(), rule_set).await {
            Ok(x) => x,
            Err(()) => {
                return;
            }
        };

    let send_id = id.clone();
    let mut send_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = global_rx.changed() => {
                    let msg = global_rx.borrow().clone();
                    if sender.send(msg).await.is_err() {
                        return;
                    }
                },
                _ = room_rx.changed() => {
                    let msg = room_rx.borrow().clone();

                    if serde_json::from_str::<WsMessage>(msg.to_text().unwrap()).unwrap().sender_id == send_id {
                        continue;
                    }

                    if sender.send(msg).await.is_err() {
                        return;
                    }
                }
            }
        }
    });

    let send_room_tx = room_tx.clone();
    let send_room = room.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            //if serde_json::from_str::<UserMessage>(&text).is_err() {
            //println!("invalid message: {}", text);
            //continue;
            //};

            println!("sending message to room {}: {}", send_room, text);

            if send_room_tx.send(Message::Text(text)).is_err() {
                break;
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    leave_room(state, id, room, room_tx).await;
}

async fn join_room(
    state: Arc<Mutex<State>>,
    mut sender: SplitSink<WebSocket, Message>,
    room: String,
    id: String,
    rule_set: String,
) -> Result<
    (
        Receiver<Message>,
        Receiver<Message>,
        Sender<Message>,
        SplitSink<WebSocket, Message>,
    ),
    (),
> {
    let mut state_mut = state.lock().await;
    let send_room = room.clone();

    state_mut.rooms.entry(room.clone()).or_insert_with(|| {
        println!("creating room: {}", send_room);

        let (room_tx, room_rx) = watch::channel(Message::Text("{}".to_string()));
        Room {
            rule_set,
            players: Vec::new(),
            room_tx,
            room_rx,
        }
    });

    if state_mut.rooms.get(&room).unwrap().players.len() < 2 {
        println!("player joined: room: {}, id: {}", room, id);
    } else {
        let cancel_connection_msg = json!(WsMessage {
            sender_id: id,
            data: json!(SysMessage {
                message_type: "error".to_string(),
                text: "Game is full".to_string()
            })
            .to_string()
        })
        .to_string();

        if sender.send(Message::Text(cancel_connection_msg)).await.is_err() {
            println!("Error Sending Message")
        }
        return Err(());
    };

    state_mut.clients_count += 1;
    let ws_room = state_mut.rooms.get_mut(&room).unwrap();
    ws_room.players.push(id.clone());
    let room_tx = ws_room.room_tx.clone();
    let room_rx = ws_room.room_rx.clone();
    let global_rx = state_mut.global_rx.clone();

    let join_room_msg = json!(WsMessage {
        sender_id: id.clone(),
        data: json!(SysMessage {
            message_type: "join".to_string(),
            text: "joined the room".to_string()
        })
        .to_string()
    })
    .to_string();

    drop(state_mut);

    if room_tx.send(Message::Text(join_room_msg)).is_err() {
        println!("failed to send join message");
        leave_room(state, id, room, room_tx).await;
        return Err(());
    };

    Ok((global_rx, room_rx, room_tx, sender))
}

async fn leave_room(state: Arc<Mutex<State>>, id: String, room: String, room_tx: Sender<Message>) {
    println!("player left: id: {}, room: {}", id, room);
    let mut cleanup_state = state.lock().await;
    cleanup_state.rooms.get_mut(&room).unwrap().players.retain(|x| x != &id);

    if cleanup_state.rooms.get(&room).unwrap().players.is_empty() {
        println!("deleting room: {}", room);
        cleanup_state.rooms.remove(&room);
    }

    cleanup_state.clients_count -= 1;

    let leave_room_msg = json!(WsMessage {
        sender_id: id,
        data: json!(SysMessage {
            message_type: "leave".to_string(),
            text: "left the room".to_string()
        })
        .to_string()
    });

    if room_tx.send(Message::Text(leave_room_msg.to_string())).is_err() {
        println!("failed to send leave message");
    }
}
