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

  const navItems = [
    { to: "/dashboard", icon: "⌘", label: "Dashboard" },
    { to: "/tasks", icon: "✓", label: "Tasks" },
    { to: "/focus", icon: "◉", label: "Focus" },
    { to: "/analytics", icon: "▣", label: "Analytics" },
    { to: "/settings", icon: "⚙", label: "Settings" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">FM</div>

          <div className="brand-copy">
            <h1>FocusMate AI</h1>
            <p>Study smarter. Focus deeper.</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-link">
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span>Today’s tip</span>
            <p>Pick one task before starting your timer.</p>
          </div>

          <div className="sidebar-account">
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
