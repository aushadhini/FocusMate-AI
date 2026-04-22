import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

function AnalyticsPage({ session }) {
  const user = session?.user;

  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    totalMinutes: 0,
    today: 0,
    currentStreak: 0,
    bestStreak: 0,
    thisWeek: 0,
  });

  useEffect(() => {
    let ignore = false;

    const buildAnalytics = (sessionsData) => {
      setSessions(sessionsData);

      const today = new Date();
      const todayKey = formatDateKey(today);
      const uniqueDays = getUniqueSessionDays(sessionsData);

      setStats({
        total: sessionsData.length,
        totalMinutes: sessionsData.reduce(
          (sum, item) => sum + (item.duration_minutes || 0),
          0
        ),
        today: sessionsData.filter((item) => {
          const date = getSessionDate(item);
          return formatDateKey(date) === todayKey;
        }).length,
        currentStreak: calculateCurrentStreak(uniqueDays, todayKey),
        bestStreak: calculateBestStreak(uniqueDays),
        thisWeek: countThisWeekSessions(sessionsData),
      });
    };

    const fetchSessions = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (error) {
        const fallback = await supabase
          .from("sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fallback.error) {
          console.error("Analytics error:", fallback.error.message);
          return;
        }

        if (!ignore) {
          buildAnalytics(fallback.data || []);
        }
        return;
      }

      if (!ignore) {
        buildAnalytics(data || []);
      }
    };

    fetchSessions();

    return () => {
      ignore = true;
    };
  }, [user]);

  const heatmapDays = useMemo(() => {
    const map = new Map();

    sessions.forEach((item) => {
      const date = getSessionDate(item);
      const key = formatDateKey(date);
      map.set(key, (map.get(key) || 0) + 1);
    });

    const days = [];
    const today = new Date();

    for (let i = 179; i >= 0; i -= 1) {
      const currentDay = new Date(today);
      currentDay.setDate(today.getDate() - i);
      const key = formatDateKey(currentDay);

      days.push({
        key,
        date: currentDay,
        count: map.get(key) || 0,
      });
    }

    return days;
  }, [sessions]);

  const weeklyData = useMemo(() => {
    const today = new Date();
    const labels = [];
    const countsMap = new Map();

    for (let i = 6; i >= 0; i -= 1) {
      const currentDay = new Date(today);
      currentDay.setDate(today.getDate() - i);
      const key = formatDateKey(currentDay);
      countsMap.set(key, 0);

      labels.push({
        key,
        short: currentDay.toLocaleDateString(undefined, { weekday: "short" }),
      });
    }

    sessions.forEach((item) => {
      const key = formatDateKey(getSessionDate(item));
      if (countsMap.has(key)) {
        countsMap.set(key, countsMap.get(key) + 1);
      }
    });

    return labels.map((item) => ({
      ...item,
      count: countsMap.get(item.key) || 0,
    }));
  }, [sessions]);

  const badges = [
    {
      label: "3 Day Streak",
      description: "Focused for 3 consecutive days",
      achieved: stats.bestStreak >= 3,
      icon: "🥉",
    },
    {
      label: "7 Day Streak",
      description: "Focused for 7 consecutive days",
      achieved: stats.bestStreak >= 7,
      icon: "🥈",
    },
    {
      label: "30 Day Streak",
      description: "Focused for 30 consecutive days",
      achieved: stats.bestStreak >= 30,
      icon: "🥇",
    },
  ];

  return (
    <div className="page-grid">
      <section className="stats-grid analytics-stats-grid">
        <div className="stat-card">
          <span>Total Sessions</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="stat-card">
          <span>Total Focus Minutes</span>
          <strong>{stats.totalMinutes}</strong>
        </div>

        <div className="stat-card">
          <span>Today</span>
          <strong>{stats.today}</strong>
        </div>

        <div className="stat-card">
          <span>This Week</span>
          <strong>{stats.thisWeek}</strong>
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

      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Calendar heatmap</p>
            <h3>Your last 180 days</h3>
          </div>
        </div>

        {heatmapDays.length === 0 ? (
          <div className="empty-state">No session data yet.</div>
        ) : (
          <>
            <div className="heatmap-legend">
              <span>Less</span>
              <div className="heatmap-cell level-0" />
              <div className="heatmap-cell level-1" />
              <div className="heatmap-cell level-2" />
              <div className="heatmap-cell level-3" />
              <div className="heatmap-cell level-4" />
              <span>More</span>
            </div>

            <div className="heatmap-grid">
              {heatmapDays.map((day) => (
                <div
                  key={day.key}
                  className={`heatmap-cell ${getHeatLevelClass(day.count)}`}
                  title={`${day.key} • ${day.count} session${day.count === 1 ? "" : "s"}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Weekly streak</p>
            <h3>Last 7 days activity</h3>
          </div>
        </div>

        <div className="weekly-chart">
          {weeklyData.map((item) => (
            <div key={item.key} className="weekly-bar-card">
              <div className="weekly-bar-wrap">
                <div
                  className="weekly-bar"
                  style={{ height: `${Math.max(12, item.count * 22)}px` }}
                />
              </div>
              <strong>{item.count}</strong>
              <span>{item.short}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Badges</p>
            <h3>Milestones unlocked</h3>
          </div>
        </div>

        <div className="badges-grid">
          {badges.map((badge) => (
            <div
              key={badge.label}
              className={badge.achieved ? "badge-card achieved" : "badge-card locked"}
            >
              <div className="badge-icon">{badge.icon}</div>
              <div>
                <h4>{badge.label}</h4>
                <p>{badge.description}</p>
              </div>
              <span className="badge-state">
                {badge.achieved ? "Unlocked" : "Locked"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Recent sessions</p>
            <h3>Your latest focus activity</h3>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-state">No sessions yet. Complete one from Focus page.</div>
        ) : (
          <div className="session-list">
            {sessions.slice(0, 10).map((sessionItem) => {
              const sessionDate = getSessionDate(sessionItem);
              return (
                <div key={sessionItem.id} className="session-card">
                  <div>
                    <strong>{sessionItem.task_text || "Untitled task"}</strong>
                    <p>{sessionItem.duration_minutes || 0} minutes</p>
                  </div>
                  <span>{sessionDate.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
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

function countThisWeekSessions(sessions) {
  const today = new Date();
  const day = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - day);
  start.setHours(0, 0, 0, 0);

  return sessions.filter((item) => getSessionDate(item) >= start).length;
}

function getHeatLevelClass(count) {
  if (count === 0) return "level-0";
  if (count === 1) return "level-1";
  if (count === 2) return "level-2";
  if (count <= 4) return "level-3";
  return "level-4";
}

export default AnalyticsPage;