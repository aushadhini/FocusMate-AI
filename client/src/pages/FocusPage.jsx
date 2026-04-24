import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import Timer from "../components/Timer";

function FocusPage({ session }) {
  const user = session?.user;
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);

  useEffect(() => {
    const loadTasks = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: true });

      if (error) {
        console.error("Focus page tasks error:", error.message);
        return;
      }

      const allTasks = data || [];
      setTasks(allTasks);

      setActiveTask((previousTask) => {
        if (!allTasks.length) return null;

        if (previousTask) {
          const matchedTask = allTasks.find((task) => task.id === previousTask.id);
          if (matchedTask) return matchedTask;
        }

        return allTasks.find((task) => !task.completed) || allTasks[0];
      });
    };

    loadTasks();
  }, [user]);

  const openTasks = tasks.filter((task) => !task.completed).length;

  return (
    <div className="page-grid focus-grid">
      <section className="content-card focus-timer-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Focus timer</p>
            <h3>Start a Pomodoro session</h3>
          </div>
          <span className="status-pill neutral">25 min block</span>
        </div>

        <Timer activeTask={activeTask} user={user} />
      </section>

      <section className="content-card focus-list-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Choose task</p>
            <h3>Select what you’ll work on</h3>
          </div>
          <span className="status-pill warning">{openTasks} open</span>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            No tasks yet. Go to Tasks and add one first.
          </div>
        ) : (
          <div className="focus-task-list">
            {tasks.map((task) => (
              <button
                key={task.id}
                className={activeTask?.id === task.id ? "focus-task active" : "focus-task"}
                onClick={() => setActiveTask(task)}
              >
                <span className={task.completed ? "focus-check done" : "focus-check"}>
                  {task.completed ? "✓" : ""}
                </span>
                <div>
                  <strong>{task.text}</strong>
                  <span>{task.completed ? "Completed" : "Ready to focus"}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default FocusPage;
