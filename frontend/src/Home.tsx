export default function Home() {
  return (
    <div className="w-100">
      <h1 className="text-center mt-4 display-1">Welcome to Pro Chess</h1>
      <div className="d-flex justify-content-center">
        <button className="home-btn">
          <a href="/local" className="text-white fs-1">
            Play Local Game
          </a>
        </button>
        <button className="home-btn">
          <a href="/start" className="text-white fs-1">
            Start Game
          </a>
        </button>
        <button className="home-btn">
          <a href="/join" className="text-white fs-1">
            Join Game
          </a>
        </button>
      </div>
    </div>
  );
}
