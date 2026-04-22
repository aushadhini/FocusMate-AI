import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";

function Timer({ activeTask, user }) {
  const FOCUS_MINUTES = 25;
  const FOCUS_SECONDS = FOCUS_MINUTES * 60;

  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  const intervalRef = useRef(null);

  useEffect(() => {
    const loadSessions = async () => {
      if (!user) {
        setSessions(0);
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

      setSessions(count || 0);
    };

    loadSessions();
  }, [user]);

  const completeSession = useCallback(async () => {
    if (!user || !activeTask) return;

    const { error } = await supabase.from("sessions").insert([
      {
        user_id: user.id,
        task_id: activeTask.id,
        duration_minutes: FOCUS_MINUTES,
      },
    ]);

    if (error) {
      console.error("Session save error:", error.message);
      return;
    }

    setSessions((prev) => prev + 1);
    setIsRunning(false);
    window.alert("Focus session completed!");
  }, [user, activeTask, FOCUS_MINUTES]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          completeSession();
          return FOCUS_SECONDS;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, completeSession, FOCUS_SECONDS]);

  const handleStart = () => {
    if (!activeTask) {
      window.alert("Please select a task first.");
      return;
    }

    if (secondsLeft <= 0) {
      setSecondsLeft(FOCUS_SECONDS);
    }

    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
  };

  const handleReset = () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
    setSecondsLeft(FOCUS_SECONDS);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="timer-card">
      <p className="timer-task">
        {activeTask ? activeTask.text : "No task selected"}
      </p>

      <div className="timer-circle">
        <h2>
          {minutes}:{String(seconds).padStart(2, "0")}
        </h2>
      </div>

      <p className="timer-meta">{sessions} sessions completed</p>

      <div className="timer-actions">
        {!isRunning ? (
          <button className="btn btn-primary" onClick={handleStart}>
            Start
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={handlePause}>
            Pause
          </button>
        )}

        <button className="btn btn-ghost" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default Timer;