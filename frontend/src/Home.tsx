import { Link } from "react-router-dom";
export default function Home() {
  return (
    <div className="w-100">
      <h1 className="text-center mt-4 display-1">Welcome to Pro Chess</h1>
      <div className="d-flex justify-content-center">
        <Link to="/startlocal">
          <button className="btn btn-primary mx-5">Play Local Game</button>
        </Link>
        <Link to="/startonline">
          <button className="btn btn-primary mx-5">Start Game</button>
        </Link>
        <Link to="/join">
          <button className="btn btn-primary mx-5">Join Game</button>
        </Link>
      </div>
    </div>
  );
}
