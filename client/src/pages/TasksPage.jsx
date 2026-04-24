import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

function TasksPage({ session }) {
  const user = session?.user;

  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editedText, setEditedText] = useState("");

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

  useEffect(() => {
    const load = async () => {
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

    load();
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
    loadTasks();
  };

  const handleSuggest = () => {
    const suggestions = [
      "Review today’s lecture notes",
      "Complete one portfolio improvement",
      "Practice English speaking for 15 minutes",
      "Clean up one GitHub project section",
      "Plan tomorrow’s top 3 tasks",
    ];

    setNewTask(suggestions[Math.floor(Math.random() * suggestions.length)]);
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

    loadTasks();
  };

  const handleEditTask = (task) => {
    setEditingId(task.id);
    setEditedText(task.text);
  };

  const handleSaveTask = async (taskId) => {
    if (!editedText.trim()) return;

    const { error } = await supabase
      .from("tasks")
      .update({ text: editedText.trim() })
      .eq("id", taskId);

    if (error) {
      console.error("Update task error:", error.message);
      return;
    }

    setEditingId(null);
    setEditedText("");
    loadTasks();
  };

  const handleDeleteTask = async (taskId) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      console.error("Delete task error:", error.message);
      return;
    }

    loadTasks();
  };

  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks]
  );

  const activeCount = tasks.length - completedCount;

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Task Command Center</span>
          <h2 className="hero-heading">Organize your next focus moves</h2>
          <p className="hero-copy">
            Add, complete, edit, and clean up your daily tasks before starting a
            focus session.
          </p>
        </div>

        <div className="quick-actions">
          <button className="btn btn-secondary" onClick={handleSuggest}>
            AI Suggest
          </button>
        </div>
      </section>

      <section className="stats-grid dashboard-stats-grid">
        <div className="stat-card">
          <span>Total Tasks</span>
          <strong>{tasks.length}</strong>
        </div>

        <div className="stat-card">
          <span>Active Tasks</span>
          <strong>{activeCount}</strong>
        </div>

        <div className="stat-card">
          <span>Completed</span>
          <strong>{completedCount}</strong>
        </div>
      </section>

      <section className="content-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Create Task</span>
            <h3>Add a new task</h3>
          </div>
        </div>

        <div className="task-entry">
          <input
            className="input"
            type="text"
            placeholder="Example: Finish UI improvements"
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleAddTask();
            }}
          />

          <button className="btn btn-primary" onClick={handleAddTask}>
            Add Task
          </button>

          <button className="btn btn-secondary" onClick={handleSuggest}>
            Suggest
          </button>
        </div>
      </section>

      <section className="content-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Task List</span>
            <h3>Your tasks</h3>
          </div>
        </div>

        <div className="task-list">
          {tasks.length === 0 ? (
            <div className="empty-state">
              No tasks yet. Add your first task above.
            </div>
          ) : (
            tasks.map((task) => (
              <div className="task-card" key={task.id}>
                <div className="task-main">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task)}
                  />

                  <div>
                    {editingId === task.id ? (
                      <input
                        className="input"
                        value={editedText}
                        onChange={(event) => setEditedText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleSaveTask(task.id);
                        }}
                      />
                    ) : (
                      <>
                        <p
                          className={`task-text ${
                            task.completed ? "done" : ""
                          }`}
                        >
                          {task.text}
                        </p>
                        <span className="task-state">
                          {task.completed ? "Completed" : "Pending"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="task-actions">
                  {editingId === task.id ? (
                    <button
                      className="icon-btn save-btn"
                      onClick={() => handleSaveTask(task.id)}
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      className="icon-btn edit-btn"
                      onClick={() => handleEditTask(task)}
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
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default TasksPage;