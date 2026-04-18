import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const TIMER_MODES = {
  focus: { label: "Focus", minutes: 25 },
  shortBreak: { label: "Short Break", minutes: 5 },
  longBreak: { label: "Long Break", minutes: 15 },
};

function Timer({ activeTask, user, onSessionSaved }) {
  const [mode, setMode] = useState("focus");
  const [secondsLeft, setSecondsLeft] = useState(
    TIMER_MODES.focus.minutes * 60
  );
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  const totalSeconds = useMemo(() => {
    return TIMER_MODES[mode].minutes * 60;
  }, [mode]);

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

      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAAAP//AAD//wAA//8AAP//AAD//wAA"
        );
        audio.play();
      } catch (error) {
        console.log("Audio play blocked:", error);
      }

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`${TIMER_MODES[mode].label} completed!`, {
          body:
            mode === "focus"
              ? activeTask
                ? `Great job! You finished: ${activeTask.text}`
                : "Great job! Your focus session is done."
              : "Your break session is complete.",
        });
      }

      if (mode === "focus" && user && activeTask) {
        const { error } = await supabase.from("sessions").insert([
          {
            user_id: user.id,
            duration_minutes: TIMER_MODES.focus.minutes,
          },
        ]);

        if (error) {
          console.error("Save session error:", error.message);
          alert("Session finished, but saving failed.");
          setSecondsLeft(totalSeconds);
          return;
        }

        setSessions((prev) => prev + 1);

        if (onSessionSaved) {
          onSessionSaved();
        }
      }

      alert(`${TIMER_MODES[mode].label} completed!`);

      if (mode === "focus") {
        setMode("shortBreak");
        setSecondsLeft(TIMER_MODES.shortBreak.minutes * 60);
      } else {
        setSecondsLeft(totalSeconds);
      }
    };

    completeSession();
  }, [secondsLeft, isRunning, mode, user, activeTask, onSessionSaved, totalSeconds]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const progressPercent = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

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
    if (mode === "focus" && !activeTask) {
      alert("Please select a task first.");
      return;
    }

    if (secondsLeft <= 0) {
      setSecondsLeft(totalSeconds);
    }

    await requestNotificationPermission();
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const switchMode = (nextMode) => {
    setIsRunning(false);
    setMode(nextMode);
    setSecondsLeft(TIMER_MODES[nextMode].minutes * 60);
  };

  return (
    <div className="timer-card">
      <h2 className="timer-title">⏱ Focus Timer</h2>

      <div className="timer-modes">
        <button
          className={`timer-mode-btn ${mode === "focus" ? "timer-mode-active" : ""}`}
          onClick={() => switchMode("focus")}
        >
          Focus
        </button>

        <button
          className={`timer-mode-btn ${mode === "shortBreak" ? "timer-mode-active" : ""}`}
          onClick={() => switchMode("shortBreak")}
        >
          Short Break
        </button>

        <button
          className={`timer-mode-btn ${mode === "longBreak" ? "timer-mode-active" : ""}`}
          onClick={() => switchMode("longBreak")}
        >
          Long Break
        </button>
      </div>

      <p className="timer-task-text">
        {mode === "focus"
          ? activeTask
            ? `Working on: ${activeTask.text}`
            : "Select a task to focus on"
          : "Take a break and recharge"}
      </p>

      <p className="timer-session-count">Sessions completed: {sessions}</p>

      <div className="timer-progress-track">
        <div
          className="timer-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <h1 className="timer-time">
        {String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </h1>

      <div className="timer-actions">
        <button className="timer-btn start-btn" onClick={startTimer}>
          Start
        </button>

        <button className="timer-btn pause-btn" onClick={pauseTimer}>
          Pause
        </button>

        <button className="timer-btn reset-btn" onClick={resetTimer}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default Timer;