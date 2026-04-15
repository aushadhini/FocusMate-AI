import { useEffect, useState } from "react";
import { supabase } from "../supabase";

function Timer({ activeTask, user, onSessionSaved }) {
  const FOCUS_MINUTES = 25;
  const FOCUS_SECONDS = FOCUS_MINUTES * 60;

  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    let ignore = false;

    const loadSessions = async () => {
      if (!user) {
        if (!ignore) {
          setSessions(0);
        }
        return;
      }

      const { count, error } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) {
        console.error("Fetch sessions error:", error.message);
        return;
      }

      if (!ignore) {
        setSessions(count || 0);
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
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (secondsLeft > 0) return;
    if (!isRunning) return;

    const completeSession = async () => {
      setIsRunning(false);

      if (!user || !activeTask) return;

      const { error } = await supabase.from("sessions").insert([
        {
          user_id: user.id,
          task_id: activeTask.id,
          task_text: activeTask.text,
          duration_minutes: FOCUS_MINUTES,
        },
      ]);

      if (error) {
        console.error("Save session error:", error.message);
        return;
      }

      setSessions((prev) => prev + 1);

      if (onSessionSaved) {
        onSessionSaved();
      }

      alert("Focus session completed! 🎉");
    };

    completeSession();
  }, [secondsLeft, isRunning, user, activeTask, onSessionSaved]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const startTimer = () => {
    if (!activeTask) {
      alert("Please select a task first.");
      return;
    }

    if (secondsLeft <= 0) {
      setSecondsLeft(FOCUS_SECONDS);
    }

    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(FOCUS_SECONDS);
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
          ? `Working on: ${activeTask.text}`
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