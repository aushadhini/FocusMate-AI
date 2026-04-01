import { useEffect, useState } from "react";

function Timer({ activeTask }) {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  const [sessions, setSessions] = useState(() => {
    return Number(localStorage.getItem("sessions")) || 0;
  });

  // Countdown logic
  useEffect(() => {
    let timer;

    if (isRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [isRunning, secondsLeft]);

  // Session complete logic
  useEffect(() => {
    if (secondsLeft === 0) {
      setIsRunning(false);

      setSessions((prev) => {
        const newCount = prev + 1;
        localStorage.setItem("sessions", newCount);
        return newCount;
      });

      alert("Focus session completed! 🎉");
    }
  }, [secondsLeft]);

  // Auto start when task selected
  useEffect(() => {
    if (activeTask) {
      setSecondsLeft(25 * 60);
      setIsRunning(true);
    }
  }, [activeTask]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const startTimer = () => setIsRunning(true);
  const pauseTimer = () => setIsRunning(false);
  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(25 * 60);
  };

  return (
    <div
      style={{
        background: "#1e293b",
        padding: "20px",
        borderRadius: "12px",
        maxWidth: "320px",
        margin: "20px auto",
        textAlign: "center",
      }}
    >
      <h2>⏱ Focus Timer</h2>

      <p style={{ color: "#94a3b8", marginBottom: "5px" }}>
        {activeTask
          ? `Working on: ${activeTask}`
          : "Select a task to focus on"}
      </p>

      <p style={{ color: "#22c55e", marginBottom: "10px" }}>
        🔥 Sessions completed: {sessions}
      </p>

      <h1 style={{ fontSize: "48px", margin: "20px 0" }}>
        {String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </h1>

      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        <button
          onClick={startTimer}
          style={{
            background: "#22c55e",
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Start
        </button>

        <button
          onClick={pauseTimer}
          style={{
            background: "#f59e0b",
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Pause
        </button>

        <button
          onClick={resetTimer}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default Timer;