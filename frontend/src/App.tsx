import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./Home";
import LocalGame from "./LocalGame";
import StartOnline from "./StartOnline";
import Join from "./Join";
import GameWrapper from "./GameWrapper";
import OnlineGame from "./OnlineGame";
import StartLocal from "./StartLocal";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/startlocal",
    element: <StartLocal />,
  },
  {
    path: "/localgame/:rule_set",
    element: (
      <GameWrapper>
        <LocalGame />
      </GameWrapper>
    ),
  },
  {
    path: "/startonline",
    element: <StartOnline />,
  },
  {
    path: "/join",
    element: <Join />,
  },
  {
    path: "/onlinegame/:rule_set/:room_id",
    element: (
      <GameWrapper>
        <OnlineGame />
      </GameWrapper>
    ),
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
