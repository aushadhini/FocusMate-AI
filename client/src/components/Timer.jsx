import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";

const TIMER_MODES = {
  focus: { label: "Focus", minutes: 25 },
  shortBreak: { label: "Short Break", minutes: 5 },
  longBreak: { label: "Long Break", minutes: 15 },
};

function Timer({ activeTask, user, onSessionSaved, soundEnabled = false }) {
  const [mode, setMode] = useState("focus");
  const [secondsLeft, setSecondsLeft] = useState(
    TIMER_MODES.focus.minutes * 60
  );
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  const audioContextRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const gainRef = useRef(null);

  const totalSeconds = useMemo(() => TIMER_MODES[mode].minutes * 60, [mode]);

  const progressPercent = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const circle = {
    size: 252,
    stroke: 14,
  };

  const radius = (circle.size - circle.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPercent / 100) * circumference;

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
    if (!isRunning) return undefined;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  const stopAmbientSound = () => {
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
      } catch (error) {
        console.log("Noise stop skipped:", error);
      }
      noiseSourceRef.current.disconnect();
      noiseSourceRef.current = null;
    }

    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }
  };

  const startAmbientSound = async () => {
    if (!soundEnabled || !isRunning || mode !== "focus") {
      stopAmbientSound();
      return;
    }

    if (noiseSourceRef.current) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const audioContext = audioContextRef.current;

    if (audioContext.state === "suspended") {
      try {
        await audioContext.resume();
      } catch (error) {
        console.error("Audio resume failed:", error);
        return;
      }
    }

    const bufferSize = audioContext.sampleRate * 2;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      output[i] = (Math.random() * 2 - 1) * 0.25;
    }

    const whiteNoise = audioContext.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 680;
    lowpass.Q.value = 0.4;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.018;

    whiteNoise.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(audioContext.destination);
    whiteNoise.start();

    noiseSourceRef.current = whiteNoise;
    gainRef.current = gainNode;
  };

  useEffect(() => {
    startAmbientSound();
    if (!soundEnabled || !isRunning || mode !== "focus") {
      stopAmbientSound();
    }

    return () => {
      if (!isRunning) stopAmbientSound();
    };
  }, [soundEnabled, isRunning, mode]);

  useEffect(() => {
    return () => {
      stopAmbientSound();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (secondsLeft > 0) return;
    if (!isRunning) return;

    const completeSession = async () => {
      setIsRunning(false);
      stopAmbientSound();

      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAAAP//AAD//wAA//8AAP//AAD//wAA"
        );
        await audio.play();
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
    stopAmbientSound();
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
    stopAmbientSound();
  };

  const switchMode = (nextMode) => {
    setIsRunning(false);
    setMode(nextMode);
    setSecondsLeft(TIMER_MODES[nextMode].minutes * 60);
    stopAmbientSound();
  };

  return (
    <div className={`timer-card premium-timer-card ${isRunning ? "timer-running" : ""}`}>
      <div className="timer-top-row">
        <div className="timer-heading-block">
          <div className="timer-pill">Deep Work Mode</div>
          <h2 className="timer-title">Focus Timer</h2>
          <p className="timer-subtitle">
            {mode === "focus"
              ? "Choose a single task and work without distractions."
              : "Pause, reset, and come back stronger for the next block."}
          </p>
        </div>

        <div className="timer-session-bubble">
          <span>Completed</span>
          <strong>{sessions}</strong>
        </div>
      </div>

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

      <div className="timer-focus-banner">
        <span className="timer-focus-label">
          {mode === "focus" ? "Current Focus" : "Current Mode"}
        </span>
        <strong>
          {mode === "focus"
            ? activeTask
              ? activeTask.text
              : "Select a task to begin your session"
            : TIMER_MODES[mode].label}
        </strong>
      </div>

      <div className="timer-center-layout">
        <div className="timer-ring-wrap">
          <svg
            className="timer-ring"
            width={circle.size}
            height={circle.size}
            viewBox={`0 0 ${circle.size} ${circle.size}`}
          >
            <defs>
              <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-2)" />
                <stop offset="100%" stopColor="var(--accent-1)" />
              </linearGradient>
            </defs>

            <circle
              className="timer-ring-track"
              cx={circle.size / 2}
              cy={circle.size / 2}
              r={radius}
              strokeWidth={circle.stroke}
              fill="none"
            />
            <circle
              className="timer-ring-progress"
              cx={circle.size / 2}
              cy={circle.size / 2}
              r={radius}
              strokeWidth={circle.stroke}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              stroke="url(#focusGradient)"
            />
          </svg>

          <div className="timer-ring-content">
            <span className="timer-mode-text">{TIMER_MODES[mode].label}</span>
            <h1 className="timer-time">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </h1>
            <span className="timer-progress-text">
              {Math.round(progressPercent)}% complete
            </span>
          </div>
        </div>

        <div className="timer-side-panel">
          <div className="timer-side-card">
            <span>Status</span>
            <strong>{isRunning ? "Running" : "Ready"}</strong>
          </div>

          <div className="timer-side-card">
            <span>Length</span>
            <strong>{TIMER_MODES[mode].minutes} min</strong>
          </div>

          <div className="timer-side-card">
            <span>Ambient sound</span>
            <strong>
              {soundEnabled && mode === "focus"
                ? isRunning
                  ? "Playing"
                  : "Armed"
                : "Off"}
            </strong>
          </div>
        </div>
      </div>

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
