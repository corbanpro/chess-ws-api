import { createContext, useContext, useRef } from "react";
import Draggable from "react-draggable";
import { TGame } from "./GameWrapper.js";

import {
  FaChessPawn,
  FaChessRook,
  FaChessKnight,
  FaChessBishop,
  FaChessKing,
  FaChessQueen,
} from "react-icons/fa";

type TSquare = {
  piece_type: string;
  team: string;
};

const whiteColor = "teal";
const blackColor = "purple";

const piece_icons: { [key: string]: React.ReactNode } = {
  WhiteRook: <FaChessRook color={whiteColor} />,
  WhiteKnight: <FaChessKnight color={whiteColor} />,
  WhiteBishop: <FaChessBishop color={whiteColor} />,
  WhiteQueen: <FaChessQueen color={whiteColor} />,
  WhiteKing: <FaChessKing color={whiteColor} />,
  WhitePawn: <FaChessPawn color={whiteColor} />,
  BlackRook: <FaChessRook color={blackColor} />,
  BlackKnight: <FaChessKnight color={blackColor} />,
  BlackBishop: <FaChessBishop color={blackColor} />,
  BlackQueen: <FaChessQueen color={blackColor} />,
  BlackKing: <FaChessKing color={blackColor} />,
  BlackPawn: <FaChessPawn color={blackColor} />,
};

type TDropHandler = (start_sq_coords: string, end_sq_coords: string) => void;

type TBoardContext = {
  onPieceMove: TDropHandler;
  game: TGame;
  king_coords: string[];
  movedTo: string[];
  movedFrom: string[];
};

let BoardContext: React.Context<TBoardContext>;

export default function Board({
  game,
  onPieceMove,
  onResign,
  onRequestDraw,
  movedTo,
  movedFrom,
}: {
  game: TGame;
  onPieceMove: TDropHandler;
  onResign?: () => void;
  onRequestDraw?: () => void;
  movedTo: string[];
  movedFrom: string[];
}) {
  BoardContext = createContext<TBoardContext>({
    onPieceMove: () => {},
    game,
    king_coords: [],
    movedTo,
    movedFrom,
  });

  if (!game) {
    return <div>Loading...</div>;
  }
  const board: TSquare[][] = game.js_board();

  if (game.is_white_view) {
    board.reverse();
  }
  let king_coords = [];

  if (game.in_check("White") || game.in_check("Black")) {
    king_coords = game.get_check_coords();
  }

  return (
    <BoardContext.Provider value={{ onPieceMove, game, king_coords, movedTo, movedFrom }}>
      <div id="board-container" className="board-container">
        <div id="board" className="board position-relative">
          {board.map((rank, i) => (
            <Rank key={i} rank={rank} rank_index={i} />
          ))}
        </div>
      </div>
      {onResign && onRequestDraw && (
        <div className="d-flex justify-content-center">
          <div className="d-flex justify-content-between mt-4 w-100" style={{ maxWidth: "800px" }}>
            <button className="btn btn-primary" onClick={onResign}>
              Resign
            </button>
            <button className="btn btn-primary" onClick={onRequestDraw}>
              Request Draw
            </button>
          </div>
        </div>
      )}
    </BoardContext.Provider>
  );
}

function Rank({ rank, rank_index }: { rank: TSquare[]; rank_index: number }) {
  const game = useContext(BoardContext).game;

  if (!game.is_white_view) {
    rank = rank.reverse();
  }
  return (
    <div className="rank">
      {rank.map((square, j) => (
        <Square key={j} square={square} file_index={j} rank_index={rank_index} />
      ))}
    </div>
  );
}

function Square({
  square,
  file_index,
  rank_index,
}: {
  square: TSquare;
  file_index: number;
  rank_index: number;
}) {
  const { king_coords, game, movedFrom, movedTo } = useContext(BoardContext);
  let piece_icon;
  let piece_name;

  if (square) {
    piece_name = square.team + square.piece_type;
    piece_icon = piece_icons[piece_name];
  }

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = [1, 2, 3, 4, 5, 6, 7, 8];

  if (game.is_white_view) {
    ranks.reverse();
  } else {
    files.reverse();
  }

  const squareId = `${files[file_index]}${ranks[rank_index]}`;

  const draggableRef = useRef(null);
  const { onPieceMove } = useContext(BoardContext);

  const squareWidth = 100;

  function onStop(event: any) {
    document.querySelectorAll(".potential-move").forEach((el) => {
      el.classList.remove("potential-move");
    });

    if (
      (!game.is_white_view && square.team === "White") ||
      (game.is_white_view && square.team === "Black")
    ) {
      return;
    }
    event = event as MouseEvent;
    const { x: boardX, y: boardY } = document.getElementById("board")?.getBoundingClientRect() ?? {
      x: 0,
      y: 0,
    };
    const { x: pieceX, y: pieceY } = event.toElement.getBoundingClientRect();

    const file_index = Math.floor((pieceX + squareWidth / 2 - boardX) / squareWidth);
    const rank_index = Math.floor((pieceY + squareWidth / 2 - boardY) / squareWidth);

    const end_sq_coords = `${files[file_index]}${ranks[rank_index]}`;

    onPieceMove(squareId, end_sq_coords);
  }

  function onStart() {
    if (isYourPiece) {
      const potential_moves = game.get_legal_moves(squareId);
      potential_moves.forEach((move) => {
        document.getElementById(move)?.classList.add("potential-move");
      });
    }
  }

  const isYourTurn = game.is_white_turn() ? square?.team === "White" : square?.team === "Black";
  const isYourPiece = square?.team === (game.is_white_view ? "White" : "Black");
  const squareStyle = (rank_index + file_index) % 2 ? "sq-dark" : "sq-light";
  const movedToStyle = movedTo.includes(squareId) ? "last-moved-to" : "";
  const movedFromStyle = movedFrom.includes(squareId) ? "last-moved-from" : "";
  const inCheckStyle = king_coords[0] === squareId ? "in-check" : "";
  const isAttackingStyle = king_coords.slice(1).includes(squareId) ? "attacking" : "";

  return (
    <div
      id={squareId}
      className={`square ${squareStyle} ${inCheckStyle} ${movedFromStyle} ${movedToStyle} ${isAttackingStyle}`}
    >
      <Draggable
        nodeRef={draggableRef}
        onStop={onStop}
        onStart={onStart}
        axis={isYourTurn && isYourPiece ? "both" : "none"}
      >
        <div id={squareId} ref={draggableRef}>
          <div>{piece_icon}</div>
        </div>
      </Draggable>
    </div>
  );
}
