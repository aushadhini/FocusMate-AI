import { useEffect, useState } from "react";
import { supabase } from "../supabase";

function TasksPage({ session }) {
  const user = session?.user;
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editedText, setEditedText] = useState("");

  useEffect(() => {
    const loadTasks = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: true });

      if (error) {
        console.error("Fetch tasks error:", error.message);
        return;
      }

      setTasks(data || []);
    };

    loadTasks();
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: true });

    if (error) {
      console.error("Fetch tasks error:", error.message);
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
    loadTasks();
  };

  const generateTask = () => {
    const suggestions = [
      "Complete one coding exercise",
      "Review today’s lecture notes",
      "Spend 25 minutes on FocusMate AI",
      "Fix one UI issue in the app",
      "Read about Supabase auth",
      "Practice JavaScript array methods",
      "Plan tomorrow’s top 3 tasks",
    ];

    const randomTask =
      suggestions[Math.floor(Math.random() * suggestions.length)];
    setNewTask(randomTask);
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

    loadTasks();
  };

  const deleteTask = async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Delete task error:", error.message);
      return;
    }

    loadTasks();
  };

  const saveEdit = async (id) => {
    if (!editedText.trim()) return;

    const { error } = await supabase
      .from("tasks")
      .update({ text: editedText.trim() })
      .eq("id", id);

    if (error) {
      console.error("Edit task error:", error.message);
      return;
    }

    setEditingId(null);
    setEditedText("");
    loadTasks();
  };

  return (
    <div className="page-grid">
      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Task manager</p>
            <h3>Create and organize your tasks</h3>
          </div>
        </div>

        <div className="task-entry">
          <input
            className="input"
            type="text"
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
          />
          <button className="btn btn-primary" onClick={addTask}>
            Add
          </button>
          <button className="btn btn-secondary" onClick={generateTask}>
            Suggest
          </button>
        </div>
      </section>

      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Your tasks</p>
            <h3>{tasks.length} total tasks</h3>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state">No tasks yet. Add one to get started.</div>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <div key={task.id} className="task-card">
                <div className="task-main">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task)}
                  />

                  {editingId === task.id ? (
                    <input
                      className="input"
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                    />
                  ) : (
                    <div>
                      <p className={task.completed ? "task-text done" : "task-text"}>
                        {task.text}
                      </p>
                      <span className="task-state">
                        {task.completed ? "Completed" : "In progress"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="task-actions">
                  {editingId === task.id ? (
                    <button className="icon-btn save-btn" onClick={() => saveEdit(task.id)}>
                      Save
                    </button>
                  ) : (
                    <button
                      className="icon-btn edit-btn"
                      onClick={() => {
                        setEditingId(task.id);
                        setEditedText(task.text);
                      }}
                    >
                      Edit
                    </button>
                  )}

                  <button
                    className="icon-btn delete-btn"
                    onClick={() => deleteTask(task.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default TasksPage;