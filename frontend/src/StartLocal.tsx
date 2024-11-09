import { Link } from "react-router-dom";
export default function StartLocal() {
  return (
    <div className="w-100">
      <h3 className="text-center mt-4 display-1">Game Mode</h3>
      <div className="d-flex justify-content-center">
        <Link to={`/localgame/standard`}>
          <button className="btn btn-primary mx-5">Standard</button>
        </Link>
        {/*
        <Link to={`/localgame/shuffled`}>
          <button className="btn btn-primary mx-5">Shuffled</button>
        </Link>
        */}
      </div>
    </div>
  );
}
