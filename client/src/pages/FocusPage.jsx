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

      if (!activeTask && allTasks.length > 0) {
        const firstOpenTask =
          allTasks.find((task) => !task.completed) || allTasks[0];
        setActiveTask(firstOpenTask);
      }
    };

    loadTasks();
  }, [user, activeTask]);

  return (
    <div className="page-grid focus-grid">
      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Focus timer</p>
            <h3>Start a Pomodoro session</h3>
          </div>
        </div>

        <Timer activeTask={activeTask} user={user} />
      </section>

      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Choose task</p>
            <h3>Select what you’ll work on</h3>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state">
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