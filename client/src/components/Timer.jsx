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
  const progress = ((FOCUS_SECONDS - secondsLeft) / FOCUS_SECONDS) * 100;

  return (
    <div className={isRunning ? "timer-card running" : "timer-card"}>
      <div className="timer-task-card">
        <span className="timer-task-label">Current task</span>
        <p className="timer-task">{activeTask ? activeTask.text : "No task selected"}</p>
      </div>

      <div className="timer-circle" style={{ "--progress": `${progress}%` }}>
        <div className="timer-inner">
          <span>{isRunning ? "In focus" : "Ready"}</span>
          <h2>
            {minutes}:{String(seconds).padStart(2, "0")}
          </h2>
        </div>
      </div>

      <div className="timer-progress">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <p className="timer-meta">{sessions} sessions completed</p>

      <div className="timer-actions">
        {!isRunning ? (
          <button className="btn btn-primary" onClick={handleStart}>Start Focus</button>
        ) : (
          <button className="btn btn-secondary" onClick={handlePause}>Pause</button>
        )}

        <button className="btn btn-ghost" onClick={handleReset}>Reset</button>
      </div>
    </div>
  );
}

export default Timer;
