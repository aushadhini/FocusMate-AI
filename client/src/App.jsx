import { useEffect, useState } from "react";
import "./App.css";
import Timer from "./components/Timer";
import { supabase } from "./supabase";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [activeTask, setActiveTask] = useState(null);
  
  console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL);
  console.log("SUPABASE KEY:", import.meta.env.VITE_SUPABASE_KEY);

  const refreshTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Load tasks error:", error);
        return;
      }

      setTasks(data || []);
    } catch (err) {
      console.error("ERROR:", err);
    }
  };

  useEffect(() => {
    let ignore = false;

    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .order("id", { ascending: true });

        if (error) {
          console.error("Load tasks error:", error);
          return;
        }

        if (!ignore) {
          setTasks(data || []);
        }
      } catch (err) {
        console.error("ERROR:", err);
      }
    };

    fetchTasks();

    return () => {
      ignore = true;
    };
  }, []);

  const addTask = async () => {
    if (!newTask.trim()) return;

    try {
      const { error } = await supabase.from("tasks").insert([
        {
          text: newTask.trim(),
          completed: false,
        },
      ]);

      if (error) {
        console.error("Add task error:", error);
        return;
      }

      setNewTask("");
      refreshTasks();
    } catch (err) {
      console.error("Add task error:", err);
    }
  };

  const deleteTask = async (idToDelete, taskText) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", idToDelete);

      if (error) {
        console.error("Delete task error:", error);
        return;
      }

      if (activeTask === taskText) {
        setActiveTask(null);
      }

      refreshTasks();
    } catch (err) {
      console.error("Delete task error:", err);
    }
  };

  const saveEdit = async (id) => {
    if (!editedText.trim()) return;

    try {
      const currentTask = tasks.find((task) => task.id === id);

      const { error } = await supabase
        .from("tasks")
        .update({ text: editedText.trim() })
        .eq("id", id);

      if (error) {
        console.error("Edit task error:", error);
        return;
      }

      if (activeTask === currentTask?.text) {
        setActiveTask(editedText.trim());
      }

      setEditingIndex(null);
      setEditedText("");
      refreshTasks();
    } catch (err) {
      console.error("Edit task error:", err);
    }
  };

  const toggleTask = async (id, currentCompleted) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed: !currentCompleted })
        .eq("id", id);

      if (error) {
        console.error("Toggle task error:", error);
        return;
      }

      refreshTasks();
    } catch (err) {
      console.error("Toggle task error:", err);
    }
  };

  return (
    <div className="container">
      <h1 className="title">FocusMate AI</h1>
      <p className="subtitle">
        Stay focused. Organize tasks. Finish with clarity.
      </p>

      {activeTask && (
        <h3 className="active-task">
          🎯 Now focusing: <strong>{activeTask}</strong>
        </h3>
      )}

      <div className="timer-wrapper">
        <Timer key={activeTask || "no-task"} activeTask={activeTask} />
      </div>

      <div className="input-group">
        <input
          className="input"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
          placeholder="Enter a task"
        />

        <button
          className="btn btn-add"
          onClick={addTask}
          disabled={!newTask.trim()}
        >
          Add
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          No tasks yet. Add one and start your focus session.
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`task-item ${
                activeTask === task.text ? "task-active" : ""
              }`}
              onClick={() => {
                if (editingIndex !== task.id) {
                  setActiveTask(task.text);
                }
              }}
            >
              <div className="task-left">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleTask(task.id, task.completed);
                  }}
                />

                {editingIndex === task.id ? (
                  <input
                    className="input"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className={`task-text ${
                      task.completed ? "task-completed" : ""
                    }`}
                  >
                    {task.text}
                  </span>
                )}
              </div>

              <div className="task-actions">
                {editingIndex === task.id ? (
                  <button
                    className="icon-btn save-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEdit(task.id);
                    }}
                  >
                    💾
                  </button>
                ) : (
                  <button
                    className="icon-btn edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingIndex(task.id);
                      setEditedText(task.text);
                    }}
                  >
                    ✏️
                  </button>
                )}

                <button
                  className="icon-btn delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(task.id, task.text);
                  }}
                >
                  ❌
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: "40px", opacity: 0.5 }}>
        Built with ❤️ by Niragi
      </p>
    </div>
  );
}

export default App;