import { useEffect, useState } from "react";
import { supabase } from "../supabase";

function Timer({ activeTask, user, onSessionSaved }) {
  const FOCUS_MINUTES = 1;
  const FOCUS_SECONDS = 10;

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

      // play sound
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAAAP//AAD//wAA//8AAP//AAD//wAA"
        );
        audio.play();
      } catch (error) {
        console.log("Audio play blocked:", error);
      }

      // browser notification
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Focus session completed!", {
            body: activeTask
              ? `Great job! You finished: ${activeTask.text}`
              : "Great job! Your focus session is done.",
          });
        }
      }

      if (!user || !activeTask) {
        alert("Focus session completed!");
        setSecondsLeft(FOCUS_SECONDS);
        return;
      }

      const { error } = await supabase.from("sessions").insert([
        {
          user_id: user.id,
          duration_minutes: FOCUS_MINUTES,
        },
      ]);

      if (error) {
        console.error("Save session error:", error.message);
        alert("Session finished, but saving failed.");
        setSecondsLeft(FOCUS_SECONDS);
        return;
      }

      setSessions((prev) => prev + 1);

      if (onSessionSaved) {
        onSessionSaved();
      }

      alert("Focus session completed!");
      setSecondsLeft(FOCUS_SECONDS);
    };

    completeSession();
  }, [secondsLeft, isRunning, user, activeTask, onSessionSaved, FOCUS_SECONDS]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const progressPercent =
    ((FOCUS_SECONDS - secondsLeft) / FOCUS_SECONDS) * 100;

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.error("Notification permission error:", error);
      }
    }
  };

  const startTimer = async () => {
    if (!activeTask) {
      alert("Please select a task first.");
      return;
    }

    if (secondsLeft <= 0) {
      setSecondsLeft(FOCUS_SECONDS);
    }

    await requestNotificationPermission();
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
        background: "#ffffff",
        padding: "24px",
        borderRadius: "20px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        marginTop: "24px",
      }}
    >
      <h2 style={{ marginBottom: "10px" }}>⏱ Focus Timer</h2>

      <p style={{ marginBottom: "8px", color: "#555" }}>
        {activeTask
          ? `Working on: ${activeTask.text}`
          : "Select a task to focus on"}
      </p>

      <p style={{ marginBottom: "20px", fontWeight: "600" }}>
        Sessions completed: {sessions}
      </p>

      <div
        style={{
          width: "100%",
          height: "14px",
          background: "#e5e7eb",
          borderRadius: "999px",
          overflow: "hidden",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            background: "#6366f1",
            transition: "width 1s linear",
          }}
        />
      </div>

      <h1
        style={{
          fontSize: "48px",
          marginBottom: "20px",
          color: "#111827",
        }}
      >
        {String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </h1>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button
          onClick={startTimer}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            background: "#4f46e5",
            color: "white",
            cursor: "pointer",
          }}
        >
          Start
        </button>

        <button
          onClick={pauseTimer}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            background: "#f59e0b",
            color: "white",
            cursor: "pointer",
          }}
        >
          Pause
        </button>

        <button
          onClick={resetTimer}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            background: "#ef4444",
            color: "white",
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