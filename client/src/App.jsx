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
      setSession(newSession);
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
        if (!ignore) {
          setTasks([]);
        }
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

  const deleteTask = async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Delete task error:", error.message);
      return;
    }

    if (activeTask && activeTask.id === id) {
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
      <div style={{ padding: "30px", color: "white" }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="app-container">
      <h1>FocusMate AI</h1>
      <p className="subtitle">
        Stay focused. Organize tasks. Finish with clarity.
      </p>

      <div style={{ marginBottom: "20px", color: "white" }}>
        <p>Welcome, {user.email}</p>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      <Timer activeTask={activeTask} user={user} />

      <div className="task-input-container">
        <input
          type="text"
          placeholder="Enter a task"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addTask();
            }
          }}
        />
        <button onClick={addTask}>Add</button>
      </div>

      <ul className="task-list">
        {tasks.map((task, index) => (
          <li key={task.id} className={task.completed ? "completed" : ""}>
            {editingIndex === index ? (
              <>
                <input
                  type="text"
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                />
                <button onClick={() => saveEditedTask(task.id)}>Save</button>
              </>
            ) : (
              <>
                <div className="task-left">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task)}
                  />
                  <span onClick={() => setActiveTask(task)}>{task.text}</span>
                </div>

                <div className="task-actions">
                  <button onClick={() => startEditing(index, task.text)}>
                    ✏️
                  </button>
                  <button onClick={() => deleteTask(task.id)}>❌</button>
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