import { useEffect, useState } from "react";
import Timer from "./components/Timer";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  // EDIT STATES
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");

  // NEW: ACTIVE TASK
  const [activeTask, setActiveTask] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .catch((err) => console.error("ERROR:", err));
  }, []);

  const addTask = async () => {
    if (!newTask.trim()) return;

    await fetch("http://localhost:3000/add-task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ task: newTask }),
    });

    setNewTask("");

    const res = await fetch("http://localhost:3000/tasks");
    const data = await res.json();
    setTasks(data);
  };

  const deleteTask = async (indexToDelete) => {
    await fetch("http://localhost:3000/delete-task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ index: indexToDelete }),
    });

    const res = await fetch("http://localhost:3000/tasks");
    const data = await res.json();
    setTasks(data);

    if (activeTask === tasks[indexToDelete]?.text) {
      setActiveTask(null);
    }
  };

  const saveEdit = async (index) => {
    await fetch("http://localhost:3000/edit-task", {
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

    const res = await fetch("http://localhost:3000/tasks");
    const data = await res.json();
    setTasks(data);
  };

  const suggestTask = () => {
    const suggestions = [
      "25-minute deep work session",
      "Revise React concepts",
      "Practice Express routes",
      "Update GitHub repository",
      "Complete one UI screen design",
    ];

    const randomTask =
      suggestions[Math.floor(Math.random() * suggestions.length)];

    setNewTask(randomTask);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        padding: "20px",
        color: "white",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "40px", marginBottom: "20px" }}>
        FocusMate AI
      </h1>

      {activeTask && (
        <h3 style={{ marginBottom: "10px", color: "#22c55e" }}>
          🎯 Focusing on: {activeTask}
        </h3>
      )}

      <Timer activeTask={activeTask} />

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Enter a task"
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            width: "250px",
            outline: "none",
          }}
        />

        <button
          onClick={addTask}
          style={{
            background: "#00c896",
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Add
        </button>

        <button
          onClick={suggestTask}
          style={{
            background: "#6c63ff",
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          AI ✨
        </button>
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          maxWidth: "500px",
          margin: "20px auto",
        }}
      >
        {tasks.map((task, index) => (
          <li
            key={index}
            onClick={() => {
              if (editingIndex !== index) {
                setActiveTask(task.text);
              }
            }}
            style={{
              background:
                activeTask === task.text ? "#334155" : "#1e1e2f",
              margin: "10px 0",
              padding: "12px 20px",
              borderRadius: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "0.3s",
              cursor: "pointer",
              border:
                activeTask === task.text
                  ? "2px solid #22c55e"
                  : "2px solid transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={async (e) => {
                  e.stopPropagation();

                  await fetch("http://localhost:3000/toggle-task", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ index }),
                  });

                  const res = await fetch("http://localhost:3000/tasks");
                  const data = await res.json();
                  setTasks(data);
                }}
              />

              {editingIndex === index ? (
                <input
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginLeft: "10px", padding: "5px" }}
                />
              ) : (
                <span
                  style={{
                    marginLeft: "10px",
                    textDecoration: task.completed
                      ? "line-through"
                      : "none",
                    opacity: task.completed ? 0.5 : 1,
                  }}
                >
                  {task.text}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {editingIndex === index ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveEdit(index);
                  }}
                  style={{
                    background: "#00c896",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  💾
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingIndex(index);
                    setEditedText(task.text);
                  }}
                  style={{
                    background: "#ffc107",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  ✏️
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTask(index);
                }}
                style={{
                  background: "red",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                ❌
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;