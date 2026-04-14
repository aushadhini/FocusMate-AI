import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabase";

function Timer({ activeTask, user }) {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  const saveSession = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase.from("sessions").insert([
      {
        user_id: user.id,
      },
    ]);

    if (error) {
      console.error("Save session error:", error.message);
      return;
    }

    setSessions((prev) => prev + 1);
    alert("Focus session completed! 🎉");
  }, [user]);

  useEffect(() => {
    let ignore = false;

    const loadSessions = async () => {
      if (!user) {
        if (!ignore) {
          setSessions(0);
        }
        return;
      }

      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Fetch sessions error:", error.message);
        return;
      }

      if (!ignore) {
        setSessions(data?.length || 0);
      }
    };

    loadSessions();

    return () => {
      ignore = true;
    };
  }, [user]);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          void saveSession();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, saveSession]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const startTimer = () => {
    if (!activeTask) {
      alert("Please select a task first.");
      return;
    }
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(25 * 60);
  };

  return (
    <div
      style={{
        background: "rgba(30, 41, 59, 0.9)",
        padding: "24px",
        borderRadius: "18px",
        maxWidth: "360px",
        margin: "20px auto",
        textAlign: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <h2 style={{ marginBottom: "10px" }}>⏱ Focus Timer</h2>

      <p style={{ color: "#94a3b8", marginBottom: "6px" }}>
        {activeTask
          ? `Working on: ${activeTask.text || activeTask}`
          : "Select a task to focus on"}
      </p>

      <p style={{ color: "#22c55e", marginBottom: "14px", fontWeight: "600" }}>
        🔥 Sessions completed: {sessions}
      </p>

      <h1
        style={{
          fontSize: "52px",
          margin: "18px 0",
          letterSpacing: "2px",
        }}
      >
        {String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </h1>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={startTimer}
          style={{
            background: "#22c55e",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: "10px",
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
            padding: "10px 16px",
            borderRadius: "10px",
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
            padding: "10px 16px",
            borderRadius: "10px",
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