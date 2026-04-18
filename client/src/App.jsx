/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import Timer from "./components/Timer";
import { supabase } from "./supabase";
import Auth from "./Auth";

const DAILY_GOAL = 4;

const emptyStats = {
  totalSessions: 0,
  totalMinutes: 0,
  todaySessions: 0,
  streak: 0,
};

function App() {
  const [session, setSession] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [activeTask, setActiveTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(emptyStats);
  const [weeklyChartData, setWeeklyChartData] = useState([]);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session);

      if (!session) {
        setTasks([]);
        setActiveTask(null);
        setStats(emptyStats);
        setWeeklyChartData([]);
      }

      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession) {
        setTasks([]);
        setActiveTask(null);
        setStats(emptyStats);
        setWeeklyChartData([]);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const getLocalDateKey = (dateValue) => {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatShortDay = (dateValue) => {
    return new Date(dateValue).toLocaleDateString("en-US", {
      weekday: "short",
    });
  };

  const buildWeeklyChartData = (sessionsData) => {
    const countsByDay = {};

    sessionsData.forEach((item) => {
      if (!item.completed_at) return;

      const key = getLocalDateKey(item.completed_at);
      countsByDay[key] = (countsByDay[key] || 0) + 1;
    });

    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const key = getLocalDateKey(date);

      days.push({
        label: formatShortDay(date),
        fullDate: key,
        sessions: countsByDay[key] || 0,
      });
    }

    return days;
  };

  const calculateStreak = (sessionsData) => {
    if (!sessionsData || sessionsData.length === 0) return 0;

    const uniqueDays = Array.from(
      new Set(
        sessionsData
          .filter((item) => item.completed_at)
          .map((item) => getLocalDateKey(item.completed_at))
      )
    ).sort((a, b) => new Date(b) - new Date(a));

    if (uniqueDays.length === 0) return 0;

    let streak = 1;

    for (let i = 0; i < uniqueDays.length - 1; i++) {
      const current = new Date(uniqueDays[i]);
      const next = new Date(uniqueDays[i + 1]);

      current.setHours(0, 0, 0, 0);
      next.setHours(0, 0, 0, 0);

      const diffInDays = Math.round(
        (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffInDays === 1) {
        streak += 1;
      } else {
        break;
      }
    }

    return streak;
  };

  const fetchTasks = useCallback(async (currentUserId) => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", currentUserId)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error.message);
      return;
    }

    setTasks(data || []);
  }, []);

  const fetchStats = useCallback(async (currentUserId) => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", currentUserId)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("Error fetching stats:", error.message);
      return;
    }

    const sessionsData = data || [];

    const totalSessions = sessionsData.length;
    const totalMinutes = sessionsData.reduce(
      (sum, item) => sum + (item.duration_minutes || 0),
      0
    );

    const todayKey = getLocalDateKey(new Date());

    const todaySessions = sessionsData.filter(
      (item) =>
        item.completed_at && getLocalDateKey(item.completed_at) === todayKey
    ).length;

    const streak = calculateStreak(sessionsData);
    const weeklyData = buildWeeklyChartData(sessionsData);

    setStats({
      totalSessions,
      totalMinutes,
      todaySessions,
      streak,
    });

    setWeeklyChartData(weeklyData);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    fetchTasks(session.user.id);
    fetchStats(session.user.id);
  }, [session, fetchTasks, fetchStats]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          text: newTask.trim(),
          completed: false,
          user_id: session.user.id,
        },
      ])
      .select();

    if (error) {
      console.error("Error adding task:", error.message);
      return;
    }

    setTasks((prev) => [data[0], ...prev]);
    setNewTask("");
  };

  const deleteTask = async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Error deleting task:", error.message);
      return;
    }

    setTasks((prev) => prev.filter((task) => task.id !== id));

    if (activeTask?.id === id) {
      setActiveTask(null);
    }
  };

  const toggleTask = async (id, completed) => {
    const { error } = await supabase
      .from("tasks")
      .update({ completed: !completed })
      .eq("id", id);

    if (error) {
      console.error("Error updating task:", error.message);
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !completed } : task
      )
    );

    if (activeTask?.id === id) {
      setActiveTask((prev) => ({
        ...prev,
        completed: !completed,
      }));
    }
  };

  const startEdit = (index, text) => {
    setEditingIndex(index);
    setEditedText(text);
  };

  const saveEdit = async (id) => {
    if (!editedText.trim()) return;

    const trimmedText = editedText.trim();

    const { error } = await supabase
      .from("tasks")
      .update({ text: trimmedText })
      .eq("id", id);

    if (error) {
      console.error("Error editing task:", error.message);
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, text: trimmedText } : task
      )
    );

    if (activeTask?.id === id) {
      setActiveTask((prev) => ({ ...prev, text: trimmedText }));
    }

    setEditingIndex(null);
    setEditedText("");
  };

  const suggestTask = () => {
    const suggestions = [
      "Read for 20 minutes",
      "Practice JavaScript array methods",
      "Write project notes",
      "Revise React hooks",
      "Spend 25 minutes on FocusMate AI",
    ];

    const randomTask =
      suggestions[Math.floor(Math.random() * suggestions.length)];

    setNewTask(randomTask);
  };

  const goalPercent = useMemo(() => {
    return Math.min((stats.todaySessions / DAILY_GOAL) * 100, 100);
  }, [stats.todaySessions]);

  if (loading) {
    return (
      <h2 style={{ textAlign: "center", marginTop: "50px" }}>Loading...</h2>
    );
  }

  if (!session) {
    return <Auth />;
  }

  const maxSessions = Math.max(
    ...weeklyChartData.map((item) => item.sessions),
    1
  );

  return (
    <div className="app-container">
      <div className="top-bar">
        <h1>🔥 FocusMate AI</h1>
        <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
          Logout
        </button>
      </div>

      <div className="goal-card">
        <div className="goal-header">
          <h2>🎯 Daily Goal</h2>
          <span>
            {stats.todaySessions}/{DAILY_GOAL} sessions
          </span>
        </div>

        <div className="goal-progress-track">
          <div
            className="goal-progress-fill"
            style={{ width: `${goalPercent}%` }}
          />
        </div>

        <p className="goal-text">
          {stats.todaySessions >= DAILY_GOAL
            ? "Amazing! You reached today’s focus goal."
            : `${DAILY_GOAL - stats.todaySessions} more session${
                DAILY_GOAL - stats.todaySessions !== 1 ? "s" : ""
              } to reach your goal.`}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stats-box">
          <div className="stat-card">
            <h3>Total Sessions</h3>
            <p>{stats.totalSessions}</p>
          </div>
        </div>

        <div className="stats-box">
          <div className="stat-card">
            <h3>Total Focus Minutes</h3>
            <p>{stats.totalMinutes}</p>
          </div>
        </div>

        <div className="stats-box">
          <div className="stat-card">
            <h3>Today</h3>
            <p>{stats.todaySessions}</p>
          </div>
        </div>

        <div className="stats-box">
          <div className="stat-card">
            <h3>Current Streak</h3>
            <p>
              🔥 {stats.streak} day{stats.streak !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <h2>📊 Last 7 Days</h2>

        {stats.totalSessions === 0 ? (
          <div className="empty-state">
            No focus sessions yet. Complete your first session to see activity
            here.
          </div>
        ) : (
          <div className="chart-grid">
            {weeklyChartData.map((item) => (
              <div key={item.fullDate} className="chart-bar-group">
                <span className="chart-value">{item.sessions}</span>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{
                      height: `${(item.sessions / maxSessions) * 180}px`,
                    }}
                  />
                </div>
                <span className="chart-label">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Timer
        activeTask={activeTask}
        user={session.user}
        onSessionSaved={() => fetchStats(session.user.id)}
      />

      <div className="task-input-container">
        <input
          type="text"
          placeholder="Enter a task"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
        />
        <button onClick={addTask}>Add</button>
      </div>

      <button className="suggest-btn" onClick={suggestTask}>
        ✨ Suggest Tasks
      </button>

      {tasks.length === 0 ? (
        <div className="empty-state">
          No tasks yet. Add a task and select it before starting your focus
          timer.
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((task, index) => (
            <li
              key={task.id}
              className={`task-item ${activeTask?.id === task.id ? "task-active" : ""}`}
              onClick={() => setActiveTask(task)}
            >
              {editingIndex === index ? (
                <>
                  <input
                    className="input"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="task-actions">
                    <button
                      className="icon-btn save-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        saveEdit(task.id);
                      }}
                    >
                      ✓
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="task-left">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleTask(task.id, task.completed);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <span
                      className={`task-text ${
                        task.completed ? "task-completed" : ""
                      }`}
                    >
                      {task.text}
                    </span>
                  </div>

                  <div className="task-actions">
                    <button
                      className="icon-btn edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(index, task.text);
                      }}
                    >
                      ✏️
                    </button>

                    <button
                      className="icon-btn delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(task.id);
                      }}
                    >
                      ❌
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;