import { useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { Actor, HttpAgent } from "@dfinity/agent";
import { guessing_number_backend } from "declarations/guessing_number_backend";
import { canisterId } from "declarations/guessing_number_backend/index";

function App() {
  const [message, setMessage] = useState("");
  const [isGameActive, setIsGameActive] = useState(false);
  const [guess, setGuess] = useState("");
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    const client = await AuthClient.create();
    setAuthClient(client);

    if (await client.isAuthenticated()) {
      handleAuthenticated(client);
    }
  };

  async function handleAuthenticated(client) {
    const identity = client.getIdentity();
    const agent = new HttpAgent({ identity });

    if (process.env.DFX_NETWORK !== "ic") {
      await agent.fetchRootKey();
    }

    const newActor = Actor.createActor(guessing_number_backend.factory, {
      agent,
      canisterId,
    });

    setActor(newActor);
    setIsAuthenticated(true);
  }

  const login = async () => {
    if (!authClient) return;

    await new Promise((resolve, reject) => {
      authClient.login({
        identityProvider: "https://identity.ic0.app",
        onSuccess: () => {
          setIsAuthenticated(true);
          resolve(null);
        },
        onError: reject,
      });
    });
  };

  const logout = async () => {
    if (!authClient) return;
    await authClient.logout();
    setIsAuthenticated(false);
    setIsGameActive(false);
    setMessage("");
    setActor(null);
  };

  const startGame = async () => {
    try {
      const response = await guessing_number_backend.startGame();
      setMessage(response);
      setIsGameActive(true);
      setGuess("");
    } catch (error) {
      setMessage("Error starting game: " + error.message);
    }
  };

  const submitGuess = async (e) => {
    e.preventDefault();
    if (!guess || isNaN(guess)) {
      setMessage("Please enter a valid number");
      return;
    }

    try {
      const response = await guessing_number_backend.guess(Number(guess));
      setMessage(response);
      if (response.includes("Congratulations")) {
        setIsGameActive(false);
      }
      setGuess("");
    } catch (error) {
      setMessage("Error submitting guess: " + error.message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎮 Number Guessing Game</h1>
        <button
          className="auth-button"
          onClick={isAuthenticated ? logout : login}
        >
          {isAuthenticated ? "Logout" : "Login"}
        </button>
      </header>

      {isAuthenticated ? (
        <main className="main-content">
          <div className="game-container">
            <button
              onClick={startGame}
              disabled={isGameActive}
              className="start-button"
            >
              {isGameActive ? "Game in Progress" : "Start New Game"}
            </button>

            {isGameActive && (
              <form onSubmit={submitGuess} className="guess-form">
                <input
                  type="number"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  min="1"
                  max="100"
                  className="guess-input"
                  placeholder="Enter number (1-100)"
                />
                <button type="submit" className="submit-button">
                  Submit Guess
                </button>
              </form>
            )}

            {message && (
              <div
                className={`message ${
                  message.includes("Congratulations")
                    ? "success"
                    : message.includes("Error")
                    ? "error"
                    : "info"
                }`}
              >
                {message}
              </div>
            )}

            <div className="instructions">
              <h2>How to Play:</h2>
              <ul>
                <li>Click "Start New Game" to begin</li>
                <li>Enter a number between 1 and 100</li>
                <li>
                  The game will tell you if your guess is too high or too low
                </li>
                <li>Try to guess the correct number!</li>
              </ul>
            </div>
          </div>
        </main>
      ) : (
        <div className="login-prompt">
          <h2>Welcome to Number Guessing Game!</h2>
          <p>Please login with Internet Identity to play.</p>
          <button onClick={login} className="login-button">
            Login to Play
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
