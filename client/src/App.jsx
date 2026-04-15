import { useEffect, useState } from "react";
import "./App.css";
import Timer from "./components/Timer";
import { supabase } from "./supabase";
import Auth from "./Auth";

function App() {
  const [session, setSession] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [activeTask, setActiveTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    totalMinutes: 0,
    today: 0,
  });

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const user = session?.user;

  useEffect(() => {
    let ignore = false;

    const loadTasks = async () => {
      if (!user) {
        if (!ignore) setTasks([]);
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: true });

      if (error) {
        console.error("Fetch tasks error:", error.message);
        return;
      }

      if (!ignore) {
        setTasks(data || []);
      }
    };

    loadTasks();

    return () => {
      ignore = true;
    };
  }, [user]);

  useEffect(() => {
    let ignore = false;

    const fetchStats = async () => {
      if (!user) {
        if (!ignore) {
          setStats({
            total: 0,
            totalMinutes: 0,
            today: 0,
          });
        }
        return;
      }

      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Stats error:", error.message);
        return;
      }

      const sessionsData = data || [];
      const total = sessionsData.length;

      const totalMinutes = sessionsData.reduce(
        (sum, item) => sum + (item.duration_minutes || 0),
        0
      );

      const now = new Date();

      const today = sessionsData.filter((item) => {
        const sessionDate = new Date(item.completed_at);
        return (
          sessionDate.getDate() === now.getDate() &&
          sessionDate.getMonth() === now.getMonth() &&
          sessionDate.getFullYear() === now.getFullYear()
        );
      }).length;

      if (!ignore) {
        setStats({
          total,
          totalMinutes,
          today,
        });
      }
    };

    fetchStats();

    return () => {
      ignore = true;
    };
  }, [user]);

  const refreshTasks = async () => {
    if (!user) {
      setTasks([]);
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: true });

    if (error) {
      console.error("Refresh tasks error:", error.message);
      return;
    }

    setTasks(data || []);
  };

  const refreshStats = async () => {
    if (!user) {
      setStats({
        total: 0,
        totalMinutes: 0,
        today: 0,
      });
      return;
    }

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Refresh stats error:", error.message);
      return;
    }

    const sessionsData = data || [];
    const total = sessionsData.length;

    const totalMinutes = sessionsData.reduce(
      (sum, item) => sum + (item.duration_minutes || 0),
      0
    );

    const now = new Date();

    const today = sessionsData.filter((item) => {
      const sessionDate = new Date(item.completed_at);
      return (
        sessionDate.getDate() === now.getDate() &&
        sessionDate.getMonth() === now.getMonth() &&
        sessionDate.getFullYear() === now.getFullYear()
      );
    }).length;

    setStats({
      total,
      totalMinutes,
      today,
    });
  };

  const addTask = async () => {
    if (!newTask.trim() || !user) return;

    const { error } = await supabase.from("tasks").insert([
      {
        text: newTask.trim(),
        completed: false,
        user_id: user.id,
      },
    ]);

    if (error) {
      console.error("Add task error:", error.message);
      return;
    }

    setNewTask("");
    await refreshTasks();
  };

  const generateTasks = () => {
    const suggestions = [
      "Complete one coding exercise",
      "Review today's lecture notes",
      "Spend 25 minutes on FocusMate AI",
      "Fix one UI issue in the app",
      "Read about Supabase auth",
      "Practice JavaScript array methods",
      "Plan tomorrow's top 3 tasks",
    ];

    const randomTask =
      suggestions[Math.floor(Math.random() * suggestions.length)];

    setNewTask(randomTask);
  };

  const deleteTask = async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Delete task error:", error.message);
      return;
    }

    if (activeTask?.id === id) {
      setActiveTask(null);
    }

    await refreshTasks();
  };

  const toggleTask = async (task) => {
    const { error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id);

    if (error) {
      console.error("Toggle task error:", error.message);
      return;
    }

    await refreshTasks();
  };

  const startEditing = (index, text) => {
    setEditingIndex(index);
    setEditedText(text);
  };

  const saveEditedTask = async (id) => {
    if (!editedText.trim()) return;

    const { error } = await supabase
      .from("tasks")
      .update({ text: editedText.trim() })
      .eq("id", id);

    if (error) {
      console.error("Edit task error:", error.message);
      return;
    }

    setEditingIndex(null);
    setEditedText("");
    await refreshTasks();
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error.message);
      return;
    }

    setActiveTask(null);
  };

  if (loading) {
    return (
      <div className="container">
        <h1 className="title">Loading...</h1>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="container">
      <h1 className="title">FocusMate AI</h1>
      <p className="subtitle">
        Stay focused. Organize tasks. Finish with clarity.
      </p>

      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h2 style={{ marginBottom: "10px" }}>
          Hi {user.email.split("@")[0]} 👋
        </h2>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      <div className="stats-box">
        <h3>📊 Your Stats</h3>
        <p>Total Sessions: {stats.total}</p>
        <p>Total Focus Time: {stats.totalMinutes} mins</p>
        <p>Today Sessions: {stats.today}</p>
      </div>

      {activeTask && (
        <p className="active-task">Working on: {activeTask.text}</p>
      )}

      <div className="timer-wrapper">
        <Timer
          activeTask={activeTask}
          user={user}
          onSessionSaved={refreshStats}
        />
      </div>

      <div className="input-group">
        <input
          type="text"
          className="input"
          placeholder="Enter a task"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addTask();
            }
          }}
        />
        <button onClick={addTask} className="btn btn-add">
          Add
        </button>
      </div>

      <button
        onClick={generateTasks}
        className="btn"
        style={{
          marginBottom: "20px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        }}
      >
        ✨ Suggest Tasks
      </button>

      {tasks.length === 0 && (
        <div className="empty-state">
          No tasks yet. Add one and start your focus session 🚀
        </div>
      )}

      <ul className="task-list">
        {tasks.map((task, index) => (
          <li
            key={task.id}
            className={`task-item ${
              activeTask?.id === task.id ? "task-active" : ""
            }`}
            onClick={() => setActiveTask(task)}
          >
            {editingIndex === index ? (
              <>
                <div className="task-left">
                  <input
                    type="text"
                    className="input"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="task-actions">
                  <button
                    className="icon-btn save-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEditedTask(task.id);
                    }}
                  >
                    💾
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
                      toggleTask(task);
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
                      startEditing(index, task.text);
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
    </div>
  );
}

export default App;