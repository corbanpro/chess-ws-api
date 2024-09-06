import { ExecuteMove } from "./game.js";

let dragged;

export function highlightPotentialSquares(game, start_coords, team) {
  game.get_legal_moves(start_coords, team).forEach((square) => {
    return document.getElementById(square).classList.add("highlight");
  });
}

export function MakeDragElement(game, elmnt) {
  let pos1 = 0;
  let pos2 = 0;
  let pos3 = 0;
  let pos4 = 0;

  elmnt.onmousedown = (event) => dragMouseDown(event, game);

  function dragMouseDown(e, game) {
    dragged = e.target;
    e.preventDefault();
    highlightPotentialSquares(game, e.target.id, game.myTeam);
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = (event) => onDragDrop(event, game);
    document.onmousemove = elementDrag;
                }
  
  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
  }
}

function GetDragTarget(x, y) {
  let squares = document.querySelectorAll(".square");
  for (let square of squares) {
    let { left, right, top, bottom } = square.getBoundingClientRect();
    if (x > left && x < right && y < bottom && y > top) {
      return square;
    }
  }
}

async function onDragDrop(e, game) {
  let targetSq = GetDragTarget(e.clientX, e.clientY);
  let startSq = dragged;

  await ExecuteMove(game, startSq.id, targetSq.id);
  document.onmouseup = null;
  document.onmousemove = null;
  dragged = null;
}
