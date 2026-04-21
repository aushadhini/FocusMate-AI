import { useEffect, useState } from "react";
import { supabase } from "../supabase";

function Timer({ activeTask, user }) {
  const FOCUS_MINUTES = 25;
  const FOCUS_SECONDS = FOCUS_MINUTES * 60;

  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    let ignore = false;

    const loadSessions = async () => {
      if (!user) {
        if (!ignore) setSessions(0);
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
    if (secondsLeft > 0 || !isRunning) return;

    const completeSession = async () => {
      setIsRunning(false);

      if (!user || !activeTask) return;

      const payload = {
        user_id: user.id,
        task_id: activeTask.id,
        task_text: activeTask.text,
        duration_minutes: FOCUS_MINUTES,
        completed_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("sessions").insert([payload]);

      if (error) {
        console.error("Save session error:", error.message);

        const fallbackPayload = {
          user_id: user.id,
          task_id: activeTask.id,
          task_text: activeTask.text,
          duration_minutes: FOCUS_MINUTES,
        };

        const fallback = await supabase.from("sessions").insert([fallbackPayload]);

        if (fallback.error) {
          console.error("Fallback save session error:", fallback.error.message);
          return;
        }
      }

      setSessions((prev) => prev + 1);
      alert("Focus session completed!");
      setSecondsLeft(FOCUS_SECONDS);
    };

    completeSession();
  }, [secondsLeft, isRunning, user, activeTask]);

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

  const pauseTimer = () => setIsRunning(false);

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(FOCUS_SECONDS);
  };

  return (
    <div className="timer-card">
      <p className="timer-task">
        {activeTask ? `Working on: ${activeTask.text}` : "Select a task to focus on"}
      </p>

      <div className="timer-circle">
        <h2>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </h2>
      </div>

      <p className="timer-meta">Sessions completed: {sessions}</p>

      <div className="timer-actions">
        <button className="btn btn-primary" onClick={startTimer}>
          Start
        </button>
        <button className="btn btn-secondary" onClick={pauseTimer}>
          Pause
        </button>
        <button className="btn btn-ghost" onClick={resetTimer}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default Timer;