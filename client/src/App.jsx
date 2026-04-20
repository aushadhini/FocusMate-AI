/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import Timer from "./components/Timer";
import { supabase } from "./supabase";
import Auth from "./Auth";

const DAILY_GOAL = 4;
const HEATMAP_DAYS = 28;

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
  const [heatmapData, setHeatmapData] = useState([]);
  const [filter, setFilter] = useState("all");
  const [recentSessions, setRecentSessions] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem("focus-sound") === "on"
  );

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("focus-sound", soundEnabled ? "on" : "off");
  }, [soundEnabled]);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      const {
        data: { session: nextSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(nextSession);

      if (!nextSession) {
        setTasks([]);
        setActiveTask(null);
        setStats(emptyStats);
        setWeeklyChartData([]);
        setHeatmapData([]);
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
        setHeatmapData([]);
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

  const formatShortDay = (dateValue) =>
    new Date(dateValue).toLocaleDateString("en-US", {
      weekday: "short",
    });

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

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
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

  const buildHeatmapData = (sessionsData) => {
    const countsByDay = {};

    sessionsData.forEach((item) => {
      if (!item.completed_at) return;
      const key = getLocalDateKey(item.completed_at);
      countsByDay[key] = (countsByDay[key] || 0) + 1;
    });

    const cells = [];

    for (let i = HEATMAP_DAYS - 1; i >= 0; i -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);

      const key = getLocalDateKey(date);
      const count = countsByDay[key] || 0;

      let level = 0;
      if (count >= 4) level = 4;
      else if (count === 3) level = 3;
      else if (count === 2) level = 2;
      else if (count === 1) level = 1;

      cells.push({
        date: key,
        label: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        count,
        level,
      });
    }

    return cells;
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

    const todayKey = getLocalDateKey(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterday);

    if (uniqueDays[0] !== todayKey && uniqueDays[0] !== yesterdayKey) {
      return 0;
    }

    let streak = 1;

    for (let i = 0; i < uniqueDays.length - 1; i += 1) {
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
    const heatmap = buildHeatmapData(sessionsData);

    setStats({
      totalSessions,
      totalMinutes,
      todaySessions,
      streak,
    });

    setWeeklyChartData(weeklyData);
    setHeatmapData(heatmap);
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
    if (!newTask.trim() || !session?.user) return;

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
      setActiveTask((prev) =>
        prev ? { ...prev, completed: !completed } : prev
      );
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
      setActiveTask((prev) => (prev ? { ...prev, text: trimmedText } : prev));
    }

    setEditingIndex(null);
    setEditedText("");
  };

  const suggestTask = () => {
    const suggestions = [
      "Revise one lecture topic for 25 minutes",
      "Polish one FocusMate AI UI section",
      "Write tomorrow's study goals",
      "Practice one coding challenge",
      "Review React hooks for 25 minutes",
      "Clean up one overdue task",
    ];

    const remainingHighPriority = tasks.find(
      (task) => !task.completed && task.priority === "high"
    );

    if (remainingHighPriority) {
      setNewTask(`Finish: ${remainingHighPriority.text}`);
      return;
    }

    const randomTask =
      suggestions[Math.floor(Math.random() * suggestions.length)];

    setNewTask(randomTask);
  };

  const goalPercent = useMemo(
    () => Math.min((stats.todaySessions / DAILY_GOAL) * 100, 100),
    [stats.todaySessions]
  );

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
  const highPriorityCount = tasks.filter(
    (task) => !task.completed && task.priority === "high"
  ).length;

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
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getProductivityMessage = () => {
    if (stats.todaySessions >= DAILY_GOAL) {
      return "You already hit today's target. This is elite consistency.";
    }

    if (highPriorityCount > 0) {
      return `You have ${highPriorityCount} high-priority task${
        highPriorityCount > 1 ? "s" : ""
      } waiting. Start with the hardest one first.`;
    }

    if (activeCount > 0) {
      return `There are ${activeCount} active task${
        activeCount > 1 ? "s" : ""
      } left. Pick one small win and start a focus round.`;
    }

    return "Inbox clear. Add a fresh task and keep your momentum alive.";
  };

  const topRecommendation = useMemo(() => {
    const highPriorityTask = tasks.find(
      (task) => !task.completed && task.priority === "high"
    );

    if (highPriorityTask) {
      return `Best next move: finish “${highPriorityTask.text}”.`;
    }

    const mediumPriorityTask = tasks.find(
      (task) => !task.completed && task.priority === "medium"
    );

    if (mediumPriorityTask) {
      return `Recommended focus: “${mediumPriorityTask.text}”.`;
    }

    if (activeTask && !activeTask.completed) {
      return `Stay with “${activeTask.text}” and complete another round.`;
    }

    return "No active recommendation yet. Add a meaningful task to get started.";
  }, [tasks, activeTask]);

  const userEmail = session?.user?.email || "Focused user";

  const focusScore = Math.min(
    Math.round(
      stats.totalSessions * 3 + stats.streak * 8 + stats.todaySessions * 12
    ),
    100
  );

  const completionRate = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  const todayGoalLeft = Math.max(DAILY_GOAL - stats.todaySessions, 0);
  const maxSessions = Math.max(...weeklyChartData.map((item) => item.sessions), 1);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-card">Loading your workspace...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth theme={theme} setTheme={setTheme} />;
  }

  return (
    <div className="app-shell">
      <div className="app-container">
        <section className="hero-card">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-main">
            <div className="hero-topline">FocusMate AI · Premium Workspace</div>
            <h1 className="hero-title">
              {getGreeting()}, <span>let’s create your best focus flow.</span>
            </h1>
            <p className="hero-subtitle">
              A next-level productivity dashboard for planning tasks, running
              Pomodoro sessions, tracking streaks, and staying consistent.
            </p>

            <div className="hero-chip-row">
              <div className="hero-chip">
                <span>Signed in as</span>
                <strong>{userEmail}</strong>
              </div>
              <div className="hero-chip accent">
                <span>Focus score</span>
                <strong>{focusScore}%</strong>
              </div>
              <div className="hero-chip success">
                <span>Completion rate</span>
                <strong>{completionRate}%</strong>
              </div>
            </div>

            <div className="hero-insight-strip">
              <div className="hero-insight-card">
                <span>Today</span>
                <strong>{stats.todaySessions} sessions</strong>
              </div>
              <div className="hero-insight-card">
                <span>Streak</span>
                <strong>{stats.streak} days</strong>
              </div>
              <div className="hero-insight-card">
                <span>High priority</span>
                <strong>{highPriorityCount}</strong>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-panel-card">
              <span className="hero-panel-label">Smart Coach</span>
              <h3>{topRecommendation}</h3>
              <p>{getProductivityMessage()}</p>
            </div>

            <div className="hero-controls">
              <button
                className="control-btn"
                onClick={() =>
                  setTheme((prevTheme) =>
                    prevTheme === "dark" ? "light" : "dark"
                  )
                }
              >
                {theme === "dark" ? "☀ Switch to Light" : "🌙 Switch to Dark"}
              </button>

              <button
                className={`control-btn ${soundEnabled ? "control-btn-active" : ""}`}
                onClick={() => setSoundEnabled((prev) => !prev)}
              >
                {soundEnabled ? "🎧 Focus Sound On" : "🔈 Focus Sound Off"}
              </button>

              <button
                className="logout-btn"
                onClick={() => supabase.auth.signOut()}
              >
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total sessions</span>
            <strong>{stats.totalSessions}</strong>
            <p>All completed focus rounds stored in your workspace.</p>
          </div>

          <div className="stat-card">
            <span className="stat-label">Focus minutes</span>
            <strong>{stats.totalMinutes}</strong>
            <p>Your total deep-work time across all sessions.</p>
          </div>

          <div className="stat-card">
            <span className="stat-label">Current streak</span>
            <strong>🔥 {stats.streak} days</strong>
            <p>Keep showing up daily to protect your momentum.</p>
          </div>

          <div className="stat-card">
            <span className="stat-label">Tasks in progress</span>
            <strong>{activeCount}</strong>
            <p>Clear these one by one with focused work blocks.</p>
          </div>
        </section>

        <section className="workspace-grid">
          <div className="workspace-main">
            <Timer
              activeTask={activeTask}
              user={session.user}
              soundEnabled={soundEnabled}
              onSessionSaved={() => {
                fetchStats(session.user.id);
                fetchRecentSessions(session.user.id);
              }}
            />

            <div className="panel-card">
              <div className="panel-head">
                <div>
                  <h2>Weekly Focus Activity</h2>
                  <p>See how consistently you showed up in the last 7 days.</p>
                </div>
                <span className="panel-badge">7-day trend</span>
              </div>

              {stats.totalSessions === 0 ? (
                <div className="empty-state">
                  No focus sessions yet. Finish your first session to unlock
                  charts and consistency insights.
                </div>
              ) : (
                <div className="chart-grid">
                  {weeklyChartData.map((item) => (
                    <div key={item.fullDate} className="chart-bar-group">
                      <span className="chart-value">{item.sessions}</span>
                      <div className="chart-track">
                        <div
                          className="chart-fill"
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

            <div className="panel-card">
              <div className="panel-head">
                <div>
                  <h2>Consistency Heatmap</h2>
                  <p>
                    Your last {HEATMAP_DAYS} days of effort from quiet days to
                    stronger streaks.
                  </p>
                </div>
                <span className="panel-badge">Streak view</span>
              </div>

              {heatmapData.length === 0 ? (
                <div className="empty-state">No activity available yet.</div>
              ) : (
                <>
                  <div className="heatmap-grid">
                    {heatmapData.map((cell) => (
                      <div
                        key={cell.date}
                        className={`heatmap-cell heat-level-${cell.level}`}
                        title={`${cell.label} · ${cell.count} session${
                          cell.count !== 1 ? "s" : ""
                        }`}
                      />
                    ))}
                  </div>

                  <div className="heatmap-legend">
                    <span>Less</span>
                    <div className="legend-dots">
                      <span className="heatmap-cell heat-level-0" />
                      <span className="heatmap-cell heat-level-1" />
                      <span className="heatmap-cell heat-level-2" />
                      <span className="heatmap-cell heat-level-3" />
                      <span className="heatmap-cell heat-level-4" />
                    </div>
                    <span>More</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="workspace-side">
            <div className="panel-card spotlight-card">
              <span className="spotlight-kicker">Today’s target</span>
              <h3>
                {stats.todaySessions >= DAILY_GOAL
                  ? "Goal reached 🎉"
                  : `${todayGoalLeft} more to hit your goal`}
              </h3>

              <div className="goal-track">
                <div
                  className="goal-fill"
                  style={{ width: `${goalPercent}%` }}
                />
              </div>

              <p className="spotlight-copy">
                {stats.todaySessions >= DAILY_GOAL
                  ? "Amazing. You’ve already completed today’s focus goal."
                  : `You are at ${stats.todaySessions}/${DAILY_GOAL} sessions today.`}
              </p>
            </div>

            <div className="panel-card coach-card">
              <div className="panel-head compact">
                <div>
                  <h2>Smart Coach</h2>
                  <p>Suggestions based on your current workload.</p>
                </div>
                <span className="panel-badge">Adaptive</span>
              </div>

              <div className="coach-highlight">
                <span>Recommended move</span>
                <strong>{topRecommendation}</strong>
              </div>

              <ul className="coach-list">
                <li>{getProductivityMessage()}</li>
                <li>{stats.todaySessions} sessions completed today.</li>
                <li>{completedCount} tasks are already finished.</li>
              </ul>
            </div>

            <div className="panel-card">
              <div className="panel-head compact">
                <div>
                  <h2>Recent Sessions</h2>
                  <p>Your latest completed focus records.</p>
                </div>
                <span className="panel-counter">{recentSessions.length} shown</span>
              </div>

              {recentSessions.length === 0 ? (
                <div className="empty-state">
                  No recent sessions yet. Your completed sessions will appear here.
                </div>
              ) : (
                <div className="recent-session-list">
                  {recentSessions.map((sessionItem) => (
                    <div key={sessionItem.id} className="recent-session-item">
                      <div>
                        <strong>
                          {sessionItem.duration_minutes || 0} min focus
                        </strong>
                        <p>{formatSessionDate(sessionItem.completed_at)}</p>
                      </div>
                      <span className="session-badge">Completed</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel-card insight-card">
              <span className="insight-badge">Momentum insight</span>
              <h3>{getProductivityMessage()}</h3>
              <ul className="insight-list">
                <li>{stats.todaySessions} sessions completed today</li>
                <li>{completedCount} tasks marked done</li>
                <li>{stats.streak} day streak in progress</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="task-section">
          <div className="task-toolbar-card">
            <div className="task-toolbar-head">
              <div>
                <h2>Task Manager</h2>
                <p>Select one task before starting your focus timer.</p>
              </div>
              <span className="task-summary">
                {activeCount} active · {completedCount} completed
              </span>
            </div>

            <div className="task-entry-grid">
              <input
                type="text"
                placeholder="What do you want to focus on next?"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
              />

              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="priority-select"
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>

              <button className="primary-btn" onClick={addTask}>
                Add Task
              </button>

              <button className="secondary-btn" onClick={suggestTask}>
                ✨ Smart Suggestion
              </button>
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
                className={`filter-tab ${
                  filter === "completed" ? "filter-tab-active" : ""
                }`}
                onClick={() => setFilter("completed")}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="empty-state large-empty-state">
              No tasks yet. Add a task and choose it before starting your focus
              session.
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state large-empty-state">
              No tasks in this filter yet.
            </div>
          ) : (
            <ul className="task-list">
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
                          className="edit-input"
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
                            ✕
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;