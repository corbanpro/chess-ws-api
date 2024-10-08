import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./Home";
import Local from "./Local";
import Start from "./Start";
import Join from "./Join";
import GameWrapper from "./GameWrapper";
import OnlineGame from "./OnlineGame";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/local",
    element: (
      <GameWrapper>
        <Local />
      </GameWrapper>
    ),
  },
  {
    path: "/start",
    element: <Start />,
  },
  {
    path: "/join",
    element: <Join />,
  },
  {
    path: "/game",
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
