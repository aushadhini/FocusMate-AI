import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";

function DashboardPage({ session }) {
  const user = session?.user;

  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);

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

      if (tasksResponse.error) {
        console.error("Dashboard tasks error:", tasksResponse.error.message);
      }

      if (sessionsResponse.error) {
        console.error("Dashboard sessions error:", sessionsResponse.error.message);
      }

      if (!ignore) {
        setTasks(tasksResponse.data || []);
        setSessions(sessionsResponse.data || []);
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [user]);

  const todayKey = formatDateKey(new Date());

  const stats = useMemo(() => {
    const completedTasks = tasks.filter((task) => task.completed).length;
    const pendingTasks = tasks.length - completedTasks;
    const totalMinutes = sessions.reduce(
      (sum, item) => sum + (item.duration_minutes || 0),
      0
    );

    const todaySessions = sessions.filter(
      (item) => formatDateKey(getSessionDate(item)) === todayKey
    ).length;

    const uniqueDays = getUniqueSessionDays(sessions);

    return {
      totalTasks: tasks.length,
      completedTasks,
      pendingTasks,
      totalSessions: sessions.length,
      totalMinutes,
      todaySessions,
      currentStreak: calculateCurrentStreak(uniqueDays, todayKey),
      bestStreak: calculateBestStreak(uniqueDays),
    };
  }, [tasks, sessions, todayKey]);

  const recentTasks = tasks.slice(0, 5);

  const progressPercent =
    stats.totalTasks === 0
      ? 0
      : Math.round((stats.completedTasks / stats.totalTasks) * 100);

  const focusGoalPercent = Math.min(
    Math.round((stats.todaySessions / 4) * 100),
    100
  );

  const motivation =
    stats.currentStreak >= 7
      ? "You’re building a powerful focus habit. Keep protecting your streak."
      : stats.currentStreak >= 3
      ? "Great rhythm. A few more consistent days will make this feel natural."
      : stats.totalSessions > 0
      ? "You’ve already started. Keep showing up one session at a time."
      : "Start your first focus session and begin building your momentum.";

  return (
    <div className="page-grid">
      <section className="dashboard-hero-premium">
        <div className="hero-content">
          <span className="eyebrow">FocusMate AI Dashboard</span>
          <h2>Build focus, finish tasks, and protect your momentum.</h2>
          <p>
            Your daily productivity command center for tasks, focus sessions,
            streaks, and smart progress tracking.
          </p>

          <div className="hero-actions">
            <Link to="/focus" className="btn btn-primary">
              Start Focus Session
            </Link>
            <Link to="/tasks" className="btn btn-secondary">
              Manage Tasks
            </Link>
          </div>
        </div>

        <div className="hero-score-card">
          <span>Today’s Focus Goal</span>
          <strong>{stats.todaySessions}/4</strong>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${focusGoalPercent}%` }}
            />
          </div>

          <p>{focusGoalPercent}% completed today</p>
        </div>
      </section>

      <section className="stats-grid dashboard-stats-grid">
        <StatCard label="Total Sessions" value={stats.totalSessions} icon="⏱️" />
        <StatCard label="Focus Minutes" value={stats.totalMinutes} icon="⚡" />
        <StatCard label="Today Sessions" value={stats.todaySessions} icon="🎯" />
        <StatCard label="Tasks Left" value={stats.pendingTasks} icon="📌" />
        <StatCard
          label="Current Streak"
          value={`${stats.currentStreak}d`}
          icon="🔥"
          special
        />
        <StatCard
          label="Best Streak"
          value={`${stats.bestStreak}d`}
          icon="🏆"
          special
        />
      </section>

      <section className="dashboard-two-column">
        <div className="content-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Recent Tasks</span>
              <h3>What’s on your list</h3>
            </div>

            <Link to="/tasks" className="text-link">
              View all
            </Link>
          </div>

          {recentTasks.length === 0 ? (
            <div className="empty-state">
              🚀 No tasks yet
              <br />
              Start by adding your first focus task.
            </div>
          ) : (
            <div className="mini-list">
              {recentTasks.map((task) => (
                <div key={task.id} className="mini-list-item">
                  <div className="task-mini-left">
                    <span className={`task-dot ${task.completed ? "done" : ""}`}>
                      {task.completed ? "✓" : ""}
                    </span>
                    <span>{task.text}</span>
                  </div>

                  <span
                    className={`status-pill ${
                      task.completed ? "status-done" : "status-open"
                    }`}
                  >
                    {task.completed ? "Done" : "Open"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="content-card progress-card-premium">
          <div className="section-head">
            <div>
              <span className="eyebrow">Progress</span>
              <h3>Daily task progress</h3>
            </div>
          </div>

          <div className="big-progress-number">{progressPercent}%</div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="summary-grid">
            <div className="summary-box">
              <span>Completed</span>
              <strong>{stats.completedTasks}</strong>
            </div>

            <div className="summary-box">
              <span>Remaining</span>
              <strong>{stats.pendingTasks}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="content-card motivation-card">
        <div className="motivation-box">
          <div className="motivation-icon">✨</div>
          <div>
            <span className="eyebrow">Momentum</span>
            <h4>{motivation}</h4>
            <p>
              Small consistent progress creates real improvement. One completed
              task and one focus session is enough to move forward today.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon, special }) {
  return (
    <div className={`stat-card premium-stat ${special ? "streak-card" : ""}`}>
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
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