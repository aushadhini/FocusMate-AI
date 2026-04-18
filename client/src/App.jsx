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
  const [newPriority, setNewPriority] = useState("medium");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [activeTask, setActiveTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(emptyStats);
  const [weeklyChartData, setWeeklyChartData] = useState([]);
  const [filter, setFilter] = useState("all");
  const [recentSessions, setRecentSessions] = useState([]);

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
        setRecentSessions([]);
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
        setRecentSessions([]);
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

  const formatSessionDate = (dateValue) => {
    if (!dateValue) return "Unknown time";

    return new Date(dateValue).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

    const normalizedTasks = (data || []).map((task) => ({
      ...task,
      priority: task.priority || "medium",
    }));

    setTasks(normalizedTasks);
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

  const fetchRecentSessions = useCallback(async (currentUserId) => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", currentUserId)
      .order("completed_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching recent sessions:", error.message);
      return;
    }

    setRecentSessions(data || []);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    fetchTasks(session.user.id);
    fetchStats(session.user.id);
    fetchRecentSessions(session.user.id);
  }, [session, fetchTasks, fetchStats, fetchRecentSessions]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    if (!session?.user) return;

    const taskPayload = {
      text: newTask.trim(),
      completed: false,
      user_id: session.user.id,
      priority: newPriority,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert([taskPayload])
      .select();

    if (error) {
      console.error("Error adding task:", error.message);
      return;
    }

    const insertedTask = {
      ...data[0],
      priority: data[0].priority || newPriority,
    };

    setTasks((prev) => [insertedTask, ...prev]);
    setNewTask("");
    setNewPriority("medium");
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

  const filteredTasks = useMemo(() => {
    if (filter === "active") {
      return tasks.filter((task) => !task.completed);
    }

    if (filter === "completed") {
      return tasks.filter((task) => task.completed);
    }

    return tasks;
  }, [tasks, filter]);

  const activeCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.filter((task) => task.completed).length;

  const getPriorityClass = (priority) => {
    if (priority === "high") return "priority-high";
    if (priority === "low") return "priority-low";
    return "priority-medium";
  };

  const getTaskPriorityAccent = (priority) => {
    if (priority === "high") return "task-accent-high";
    if (priority === "low") return "task-accent-low";
    return "task-accent-medium";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const userEmail = session?.user?.email || "Focused user";

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
    <div className="app-shell">
      <div className="app-container">
        <div className="hero-card">
          <div className="hero-left">
            <div className="hero-badge">⚡ Stay Consistent</div>
            <h1>{getGreeting()}, welcome back</h1>
            <p>{userEmail}</p>
          </div>

          <div className="hero-right">
            <div className="hero-mini-card">
              <span>Today</span>
              <strong>{stats.todaySessions} sessions</strong>
            </div>
            <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
              Logout
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-main">
            <Timer
              activeTask={activeTask}
              user={session.user}
              onSessionSaved={() => {
                fetchStats(session.user.id);
                fetchRecentSessions(session.user.id);
              }}
            />

            <div className="chart-card">
              <div className="section-card-header">
                <div>
                  <h2>📊 Last 7 Days</h2>
                  <p>Track your consistency across the week.</p>
                </div>
              </div>

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
          </div>

          <div className="dashboard-side">
            <div className="goal-card">
              <div className="goal-header">
                <h2>🎯 Daily Goal</h2>
                <span>
                  {stats.todaySessions}/{DAILY_GOAL}
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

            <div className="stats-grid side-stats-grid">
              <div className="stats-box">
                <div className="stat-card">
                  <h3>Total Sessions</h3>
                  <p>{stats.totalSessions}</p>
                </div>
              </div>

              <div className="stats-box">
                <div className="stat-card">
                  <h3>Focus Minutes</h3>
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
                  <h3>Streak</h3>
                  <p>
                    🔥 {stats.streak} day{stats.streak !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="recent-sessions-card compact-card">
              <div className="section-card-header recent-sessions-header">
                <div>
                  <h2>🕘 Recent Sessions</h2>
                  <p>Your latest focus activity.</p>
                </div>
                <span>{recentSessions.length} shown</span>
              </div>

              {recentSessions.length === 0 ? (
                <div className="empty-state">
                  No recent sessions yet. Finish one to see your history here.
                </div>
              ) : (
                <div className="recent-sessions-list">
                  {recentSessions.map((sessionItem) => (
                    <div key={sessionItem.id} className="recent-session-item">
                      <div>
                        <strong>{sessionItem.duration_minutes || 0} min focus</strong>
                        <p>{formatSessionDate(sessionItem.completed_at)}</p>
                      </div>
                      <span className="recent-session-badge">Completed</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="task-area">
          <div className="task-toolbar-card">
            <div className="task-section-header">
              <div>
                <h2>📝 My Tasks</h2>
                <p>Choose one task, then start your focus session.</p>
              </div>
              <span className="task-summary">
                {activeCount} active · {completedCount} completed
              </span>
            </div>

            <div className="task-input-stack">
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

              <div className="task-toolbar-bottom">
                <div className="priority-select-row">
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="priority-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <button className="suggest-btn small-suggest-btn" onClick={suggestTask}>
                  ✨ Suggest
                </button>
              </div>
            </div>

            <div className="filter-tabs">
              <button
                className={`filter-tab ${filter === "all" ? "filter-tab-active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All ({tasks.length})
              </button>
              <button
                className={`filter-tab ${filter === "active" ? "filter-tab-active" : ""}`}
                onClick={() => setFilter("active")}
              >
                Active ({activeCount})
              </button>
              <button
                className={`filter-tab ${filter === "completed" ? "filter-tab-active" : ""}`}
                onClick={() => setFilter("completed")}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="empty-state large-empty-state">
              No tasks yet. Add a task and select it before starting your focus timer.
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state large-empty-state">No tasks in this filter yet.</div>
          ) : (
            <ul className="task-list modern-task-list">
              {filteredTasks.map((task) => {
                const originalIndex = tasks.findIndex((item) => item.id === task.id);

                return (
                  <li
                    key={task.id}
                    className={`task-item ${getTaskPriorityAccent(
                      task.priority || "medium"
                    )} ${activeTask?.id === task.id ? "task-active" : ""}`}
                    onClick={() => setActiveTask(task)}
                  >
                    {editingIndex === originalIndex ? (
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

                          <div className="task-content">
                            <span
                              className={`task-text ${
                                task.completed ? "task-completed" : ""
                              }`}
                            >
                              {task.text}
                            </span>

                            <div className="task-meta-row">
                              <span
                                className={`priority-badge ${getPriorityClass(
                                  task.priority || "medium"
                                )}`}
                              >
                                {(task.priority || "medium").toUpperCase()}
                              </span>

                              {activeTask?.id === task.id && (
                                <span className="task-status-chip">In Focus</span>
                              )}

                              {task.completed && (
                                <span className="task-status-chip task-status-done">
                                  Done
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="task-actions">
                          <button
                            className="icon-btn edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(originalIndex, task.text);
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
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;