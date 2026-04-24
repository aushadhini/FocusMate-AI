import { NavLink, Outlet, useLocation } from "react-router-dom";
import { supabase } from "../../supabase";

function AppLayout({ session }) {
  const location = useLocation();
  const userEmail = session?.user?.email || "user@email.com";
  const userName = userEmail.split("@")[0];

  const pageTitles = {
    "/dashboard": {
      label: "Welcome back",
      title: "Dashboard",
      desc: "Track your tasks, focus sessions, and productivity progress.",
    },
    "/tasks": {
      label: "Welcome back",
      title: "Task Manager",
      desc: "Create, edit, and organize what you want to finish today.",
    },
    "/focus": {
      label: "Deep work",
      title: "Focus Timer",
      desc: "Choose one task and start a distraction-free focus session.",
    },
    "/analytics": {
      label: "Your insights",
      title: "Analytics",
      desc: "Review your progress, streaks, and focus patterns.",
    },
    "/settings": {
      label: "Preferences",
      title: "Settings",
      desc: "Manage your account and workspace preferences.",
    },
  };

  const currentPage = pageTitles[location.pathname] || pageTitles["/dashboard"];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-block">
            <div className="brand-logo">FM</div>
            <div>
              <h1 className="brand-title">FocusMate AI</h1>
              <p className="brand-subtitle">Study smarter. Focus deeper.</p>
            </div>
          </div>

          <nav className="sidebar-nav">
            <NavLink to="/dashboard" className="nav-link">
              <span className="nav-icon">⌘</span>
              Dashboard
            </NavLink>

            <NavLink to="/tasks" className="nav-link">
              <span className="nav-icon">✓</span>
              Tasks
            </NavLink>

            <NavLink to="/focus" className="nav-link">
              <span className="nav-icon">◉</span>
              Focus
            </NavLink>

            <NavLink to="/analytics" className="nav-link">
              <span className="nav-icon">▣</span>
              Analytics
            </NavLink>

            <NavLink to="/settings" className="nav-link">
              <span className="nav-icon">⚙</span>
              Settings
            </NavLink>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="focus-tip">
            <span>Focus Tip</span>
            <strong>One task. One timer.</strong>
            <p>Pick a single task before starting your session to reduce switching.</p>
          </div>

          <div className="user-chip">
            <div className="avatar-circle">{userName.charAt(0).toUpperCase()}</div>
            <div className="user-meta">
              <strong>{userName}</strong>
              <span>{userEmail}</span>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <span className="eyebrow">{currentPage.label}</span>
            <h2 className="page-title">{currentPage.title}</h2>
            <p className="hero-copy">{currentPage.desc}</p>
          </div>

          <div className="workspace-status">
            <span></span>
            Workspace online
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default AppLayout;