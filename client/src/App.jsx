/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import "./App.css";
import Timer from "./components/Timer";
import { supabase } from "./supabase";
import Auth from "./Auth";

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

  const calculateStreak = (sessionsData) => {
    if (!sessionsData || sessionsData.length === 0) return 0;

    const uniqueDays = new Set(
      sessionsData
        .filter((item) => item.completed_at)
        .map((item) => getLocalDateKey(item.completed_at))
    );

    let streak = 0;
    const currentDate = new Date();

    while (true) {
      const currentKey = getLocalDateKey(currentDate);

      if (uniqueDays.has(currentKey)) {
        streak += 1;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

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
          text: newTask,
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
  };

  const startEdit = (index, text) => {
    setEditingIndex(index);
    setEditedText(text);
  };

  const saveEdit = async (id) => {
    if (!editedText.trim()) return;

    const { error } = await supabase
      .from("tasks")
      .update({ text: editedText })
      .eq("id", id);

    if (error) {
      console.error("Error editing task:", error.message);
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, text: editedText } : task
      )
    );

    if (activeTask?.id === id) {
      setActiveTask((prev) => ({ ...prev, text: editedText }));
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
      <h1>🔥 FocusMate AI</h1>

      <div className="stats-box">
        <div className="stat-card">
          <h3>Total Sessions</h3>
          <p>{stats.totalSessions}</p>
        </div>

        <div className="stat-card">
          <h3>Total Focus Minutes</h3>
          <p>{stats.totalMinutes}</p>
        </div>

        <div className="stat-card">
          <h3>Today</h3>
          <p>{stats.todaySessions}</p>
        </div>

        <div className="stat-card">
          <h3>Current Streak</h3>
          <p>
            🔥 {stats.streak} day{stats.streak !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="chart-card">
        <h2>📊 Last 7 Days</h2>
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
      </div>

      <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
        Logout
      </button>

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
        />
        <button onClick={addTask}>Add</button>
      </div>

      <button className="suggest-btn" onClick={suggestTask}>
        ✨ Suggest Tasks
      </button>

      <ul className="task-list">
        {tasks.map((task, index) => (
          <li
            key={task.id}
            className={activeTask?.id === task.id ? "active-task" : ""}
            onClick={() => setActiveTask(task)}
          >
            {editingIndex === index ? (
              <>
                <input
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveEdit(task.id);
                  }}
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTask(task.id, task.completed);
                  }}
                  style={{
                    textDecoration: task.completed ? "line-through" : "none",
                    flex: 1,
                    cursor: "pointer",
                  }}
                >
                  {task.text}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(index, task.text);
                  }}
                >
                  ✏️
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(task.id);
                  }}
                >
                  ❌
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;