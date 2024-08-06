use axum::{
    extract::{
        ws::{Message, WebSocket},
        Path, WebSocketUpgrade,
    },
    response::IntoResponse,
    routing::get,
    Extension, Router,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use shuttle_axum::ShuttleAxum;
use std::{collections::HashMap, sync::Arc, time::Duration};
use tokio::{
    sync::{watch, Mutex},
    time::sleep,
};
use tower_http::services::ServeDir;
use watch::Receiver;
use watch::Sender;

#[derive(Debug, Clone)]
struct Room {
    players: Vec<i32>,
    room_tx: Sender<Message>,
    room_rx: Receiver<Message>,
}

#[derive(Debug, Clone)]
struct State {
    clients_count: usize,
    global_rx: Receiver<Message>,
    rooms: HashMap<i32, Room>,
}

#[derive(Deserialize, Serialize)]
#[allow(dead_code)]
struct UserMessage {
    message_type: String,
    sender_id: i32,
    text: String,
}

#[derive(Serialize)]
struct PingResponse {
    is_up: bool,
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
            let response = PingResponse { is_up: true };
            let msg = serde_json::to_string(&response).unwrap();
            println!("clients count: {}", state_send.lock().await.clients_count);

            if global_tx.send(Message::Text(msg)).is_err() {
                break;
            }

            sleep(duration).await;
        }
    });

    let router = Router::new()
        .route("/websocket/:room/:id", get(websocket_handler))
        .nest_service("/", ServeDir::new("static"))
        .layer(Extension(state));

    Ok(router.into())
}

#[derive(Deserialize)]
struct WsRequest {
    id: i32,
    room: i32,
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    Path(WsRequest { room, id }): Path<WsRequest>,
    Extension(state): Extension<Arc<Mutex<State>>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| websocket(socket, state, room, id))
}

async fn websocket(stream: WebSocket, state: Arc<Mutex<State>>, room: i32, id: i32) {
    let (mut sender, mut receiver) = stream.split();

    let (mut global_rx, mut room_rx, room_tx) = match join_room(state.clone(), room, id).await {
        Ok(x) => x,
        Err(()) => {
            return;
        }
    };

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

                    if serde_json::from_str::<UserMessage>(&msg.to_text().unwrap()).unwrap().sender_id == id {
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
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            if serde_json::from_str::<UserMessage>(&text).is_err() {
                println!("invalid message: {}", text);
                continue;
            };

            println!("sending message to room {}: {}", room, text);

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
    room: i32,
    id: i32,
) -> Result<(Receiver<Message>, Receiver<Message>, Sender<Message>), ()> {
    let mut state_mut = state.lock().await;

    state_mut.rooms.entry(room).or_insert_with(|| {
        println!("creating room: {}", room);

        let (room_tx, room_rx) = watch::channel(Message::Text("{}".to_string()));
        Room {
            players: Vec::new(),
            room_tx,
            room_rx,
        }
    });

    if state_mut.rooms.get(&room).unwrap().players.len() < 2 {
        println!("player joined: room: {}, id: {}", room, id);
    } else {
        return Err(());
    };

    state_mut.clients_count += 1;
    let ws_room = state_mut.rooms.get_mut(&room).unwrap();
    ws_room.players.push(id);
    let room_tx = ws_room.room_tx.clone();
    let room_rx = ws_room.room_rx.clone();
    let global_rx = state_mut.global_rx.clone();

    let join_room_msg = json!(UserMessage {
        message_type: "join".to_string(),
        sender_id: id,
        text: "joined the room".to_string(),
    });

    drop(state_mut);

    if room_tx
        .send(Message::Text(join_room_msg.to_string()))
        .is_err()
    {
        println!("failed to send join message");
        leave_room(state, id, room, room_tx).await;
        return Err(());
    };

    Ok((global_rx, room_rx, room_tx))
}

async fn leave_room(state: Arc<Mutex<State>>, id: i32, room: i32, room_tx: Sender<Message>) {
    println!("player left: id: {}, room: {}", id, room);
    let mut cleanup_state = state.lock().await;
    cleanup_state
        .rooms
        .get_mut(&room)
        .unwrap()
        .players
        .retain(|&x| x != id);

    if cleanup_state.rooms.get(&room).unwrap().players.len() == 0 {
        println!("deleting room: {}", room);
        cleanup_state.rooms.remove(&room);
    }

    cleanup_state.clients_count -= 1;

    let leave_room_msg = json!(UserMessage {
        message_type: "leave".to_string(),
        sender_id: id,
        text: "left the room".to_string(),
    });

    if room_tx
        .send(Message::Text(leave_room_msg.to_string()))
        .is_err()
    {
        println!("failed to send leave message");
    }
}
