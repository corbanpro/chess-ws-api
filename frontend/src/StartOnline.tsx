import { Link } from "react-router-dom";
export default function StartOnline() {
  const room_id = Math.random().toString(16).substring(2, 8);
  return (
    <div className="w-100">
      <h3 className="text-center mt-4 display-1">Game Mode</h3>
      <div className="d-flex justify-content-center">
        <Link to={`/onlinegame/standard/${room_id}`}>
          <button className="btn btn-primary mx-5">Standard</button>
        </Link>
        {
          //<Link to={`/onlinegame/shuffled/${room_id}`}>
          //  <button className="btn btn-primary mx-5">Shuffled</button>
          //</Link>
        }
      </div>
    </div>
  );
}
