import { backendHost } from "../constants";

export default function Join() {
  function JoinRoom(e: any) {
    e.preventDefault();
    const roomId = e.target[0].value;
    fetch(`http://${backendHost}/getroomrules/${roomId}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.rule_set) {
          window.location.href = `/onlinegame/${res.rule_set}/${roomId}`;
        } else {
          alert("Room not found");
        }
      });
  }

  return (
    <div>
      <h1 className="text-center mt-4 display-1">Join Game</h1>
      <div className="d-flex justify-content-center">
        <form onSubmit={JoinRoom}>
          <div className="d-flex justify-content-center">
            <input type="text" className="form-control rounded-end-0" placeholder="Enter Room ID" />
            <button className="btn btn-primary rounded-start-0" type="submit">
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
