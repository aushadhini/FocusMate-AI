import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";

function DashboardPage({ session }) {
  const user = session?.user;

  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    todaySessions: 0,
    pendingTasks: 0,
    completedTasks: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      if (!user) return;

      const [tasksResponse, sessionsResponse] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .order("id", { ascending: false }),
        supabase
          .from("sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false }),
      ]);

      const tasks = tasksResponse.data || [];
      let finalSessions = sessionsResponse.data || [];

      if (tasksResponse.error) {
        console.error("Dashboard tasks error:", tasksResponse.error.message);
      }

      if (sessionsResponse.error) {
        const fallback = await supabase
          .from("sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fallback.error) {
          console.error("Dashboard sessions error:", fallback.error.message);
        } else {
          finalSessions = fallback.data || [];
        }
      }

      const todayKey = formatDateKey(new Date());
      const uniqueDays = getUniqueSessionDays(finalSessions);

      if (!ignore) {
        setStats({
          totalSessions: finalSessions.length,
          totalMinutes: finalSessions.reduce(
            (sum, item) => sum + (item.duration_minutes || 0),
            0
          ),
          todaySessions: finalSessions.filter(
            (item) => formatDateKey(getSessionDate(item)) === todayKey
          ).length,
          pendingTasks: tasks.filter((task) => !task.completed).length,
          completedTasks: tasks.filter((task) => task.completed).length,
          currentStreak: calculateCurrentStreak(uniqueDays, todayKey),
          bestStreak: calculateBestStreak(uniqueDays),
        });

        setRecentTasks(tasks.slice(0, 5));
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [user]);

  const motivation =
    stats.currentStreak >= 7
      ? "You are on fire. Keep protecting this streak."
      : stats.currentStreak >= 3
      ? "Strong consistency. A few more days and this becomes a real habit."
      : stats.totalSessions > 0
      ? "You’ve already started. Keep showing up daily."
      : "Start your first focus session and begin building your streak.";

  return (
    <div className="page-grid">
      <section className="hero-panel dashboard-hero">
        <div>
          <p className="eyebrow">Today’s overview</p>
          <h3 className="hero-heading">Stay consistent and keep your flow going.</h3>
          <p className="hero-copy">
            Track your sessions, manage tasks, and build a real study rhythm with FocusMate AI.
          </p>
        </div>

        <div className="quick-actions">
          <Link to="/tasks" className="btn btn-primary">
            Manage Tasks
          </Link>
          <Link to="/focus" className="btn btn-secondary">
            Start Focusing
          </Link>
        </div>
      </section>

      <section className="stats-grid dashboard-stats-grid">
        <div className="stat-card">
          <span>Total Sessions</span>
          <strong>{stats.totalSessions}</strong>
        </div>

        <div className="stat-card">
          <span>Total Focus Minutes</span>
          <strong>{stats.totalMinutes}</strong>
        </div>

        <div className="stat-card">
          <span>Today’s Sessions</span>
          <strong>{stats.todaySessions}</strong>
        </div>

        <div className="stat-card">
          <span>Pending Tasks</span>
          <strong>{stats.pendingTasks}</strong>
        </div>

        <div className="stat-card streak-card">
          <span>🔥 Current Streak</span>
          <strong>{stats.currentStreak} days</strong>
        </div>

        <div className="stat-card streak-card">
          <span>🏆 Best Streak</span>
          <strong>{stats.bestStreak} days</strong>
        </div>
      </section>

      <section className="content-card motivation-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Momentum</p>
            <h3>Your consistency status</h3>
          </div>
        </div>

        <div className="motivation-box">
          <div className="motivation-icon">✨</div>
          <div>
            <h4>{motivation}</h4>
            <p>
              Daily progress matters more than perfection. Even one finished session helps your streak and long-term consistency.
            </p>
          </div>
        </div>
      </section>

      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Recent tasks</p>
            <h3>What’s on your list</h3>
          </div>
          <Link to="/tasks" className="text-link">
            View all
          </Link>
        </div>

        {recentTasks.length === 0 ? (
          <div className="empty-state">No tasks yet. Add your first task.</div>
        ) : (
          <div className="mini-list">
            {recentTasks.map((task) => (
              <div key={task.id} className="mini-list-item">
                <span>{task.text}</span>
                <span className={task.completed ? "status-done" : "status-open"}>
                  {task.completed ? "Done" : "Open"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Progress</p>
            <h3>Quick summary</h3>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-box">
            <span>Completed Tasks</span>
            <strong>{stats.completedTasks}</strong>
          </div>
          <div className="summary-box">
            <span>Tasks Left</span>
            <strong>{stats.pendingTasks}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

function getSessionDate(item) {
  return new Date(item.completed_at || item.created_at);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getUniqueSessionDays(sessions) {
  const unique = new Set();

  sessions.forEach((item) => {
    unique.add(formatDateKey(getSessionDate(item)));
  });

  return Array.from(unique).sort((a, b) => (a < b ? -1 : 1));
}

function calculateCurrentStreak(uniqueDays, todayKey) {
  if (uniqueDays.length === 0) return 0;

  const daySet = new Set(uniqueDays);
  const today = new Date(todayKey);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const hasToday = daySet.has(formatDateKey(today));
  const hasYesterday = daySet.has(formatDateKey(yesterday));

  if (!hasToday && !hasYesterday) return 0;

  let streak = 0;
  let cursor = hasToday ? new Date(today) : new Date(yesterday);

  while (daySet.has(formatDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function calculateBestStreak(uniqueDays) {
  if (uniqueDays.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < uniqueDays.length; i += 1) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diff =
      (curr.setHours(0, 0, 0, 0) - prev.setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24);

    if (diff === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

export default DashboardPage;