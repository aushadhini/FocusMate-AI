import { useEffect, useState } from "react";
import "./App.css";
import Timer from "./components/Timer";

const API_URL = "https://focusmate-ai-production.up.railway.app";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [activeTask, setActiveTask] = useState(null);

  const loadTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error("ERROR:", err);
    }
  };

  useEffect(() => {
    let ignore = false;

    const fetchTasks = async () => {
      try {
        const res = await fetch(`${API_URL}/tasks`);
        const data = await res.json();

        if (!ignore) {
          setTasks(data);
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
      await fetch(`${API_URL}/add-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task: newTask }),
      });

      setNewTask("");
      loadTasks();
    } catch (err) {
      console.error("Add task error:", err);
    }
  };

  const deleteTask = async (indexToDelete) => {
    try {
      await fetch(`${API_URL}/delete-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ index: indexToDelete }),
      });

      if (activeTask === tasks[indexToDelete]?.text) {
        setActiveTask(null);
      }

      loadTasks();
    } catch (err) {
      console.error("Delete task error:", err);
    }
  };

  const saveEdit = async (index) => {
    if (!editedText.trim()) return;

    try {
      await fetch(`${API_URL}/edit-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          index,
          newText: editedText,
        }),
      });

      if (activeTask === tasks[index]?.text) {
        setActiveTask(editedText);
      }

      setEditingIndex(null);
      setEditedText("");
      loadTasks();
    } catch (err) {
      console.error("Edit task error:", err);
    }
  };

  const toggleTask = async (index) => {
    try {
      await fetch(`${API_URL}/toggle-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ index }),
      });

      loadTasks();
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
        <h3 className="active-task">🎯 Focusing on: {activeTask}</h3>
      )}

      <div className="timer-wrapper">
        <Timer key={activeTask || "no-task"} activeTask={activeTask} />
      </div>

      <div className="input-group">
        <input
          className="input"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Enter a task"
        />

        <button className="btn btn-add" onClick={addTask}>
          Add
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          No tasks yet. Add one and start your focus session.
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((task, index) => (
            <li
              key={index}
              className={`task-item ${
                activeTask === task.text ? "task-active" : ""
              }`}
              onClick={() => {
                if (editingIndex !== index) {
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
                    toggleTask(index);
                  }}
                />

                {editingIndex === index ? (
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
                {editingIndex === index ? (
                  <button
                    className="icon-btn save-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEdit(index);
                    }}
                  >
                    💾
                  </button>
                ) : (
                  <button
                    className="icon-btn edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingIndex(index);
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
                    deleteTask(index);
                  }}
                >
                  ❌
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;