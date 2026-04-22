import { useEffect, useState } from "react";
import { supabase } from "../supabase";

function TasksPage({ session }) {
  const user = session?.user;

  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editedText, setEditedText] = useState("");

  const fetchTasks = async () => {
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

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleAddTask = async () => {
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
    fetchTasks();
  };

  const handleSuggest = () => {
    const suggestions = [
      "Complete one coding exercise",
      "Review today’s lecture notes",
      "Spend 25 minutes on FocusMate AI",
      "Fix one UI issue in the app",
      "Read about Supabase auth",
      "Practice JavaScript array methods",
      "Plan tomorrow’s top 3 tasks",
    ];

    const randomTask = suggestions[Math.floor(Math.random() * suggestions.length)];
    setNewTask(randomTask);
  };

  const handleToggleTask = async (task) => {
    const { error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id);

    if (error) {
      console.error("Toggle task error:", error.message);
      return;
    }

    fetchTasks();
  };

  const handleDeleteTask = async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Delete task error:", error.message);
      return;
    }

    fetchTasks();
  };

  const handleSaveEdit = async (id) => {
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
    fetchTasks();
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
            onChange={(event) => setNewTask(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleAddTask();
            }}
          />
          <button className="btn btn-primary" onClick={handleAddTask}>
            Add
          </button>
          <button className="btn btn-secondary" onClick={handleSuggest}>
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
                    onChange={() => handleToggleTask(task)}
                  />

                  {editingId === task.id ? (
                    <input
                      className="input"
                      value={editedText}
                      onChange={(event) => setEditedText(event.target.value)}
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
                    <button
                      className="icon-btn save-btn"
                      onClick={() => handleSaveEdit(task.id)}
                    >
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
                    onClick={() => handleDeleteTask(task.id)}
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
