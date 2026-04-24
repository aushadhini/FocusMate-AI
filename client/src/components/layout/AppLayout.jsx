import { NavLink, Outlet, useLocation } from "react-router-dom";
import { supabase } from "../../supabase";

function AppLayout({ session }) {
  const user = session?.user;
  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error.message);
    }
  };

  const emailPrefix = user?.email?.split("@")[0] || "user";
  const firstName = `${emailPrefix.charAt(0).toUpperCase()}${emailPrefix.slice(1)}`;

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: "⌘" },
    { to: "/tasks", label: "Tasks", icon: "✓" },
    { to: "/focus", label: "Focus", icon: "◉" },
    { to: "/analytics", label: "Analytics", icon: "▣" },
    { to: "/settings", label: "Settings", icon: "⚙" },
  ];

  const pageDetails = {
    "/dashboard": {
      title: "Your Dashboard",
      subtitle: "A calm overview of your tasks, sessions, and momentum.",
    },
    "/tasks": {
      title: "Task Manager",
      subtitle: "Create, edit, and organize what you want to finish today.",
    },
    "/focus": {
      title: "Focus Session",
      subtitle: "Choose one task and protect your attention for 25 minutes.",
    },
    "/analytics": {
      title: "Analytics",
      subtitle: "Understand your consistency and focus patterns.",
    },
    "/settings": {
      title: "Settings",
      subtitle: "Manage your account and future workspace preferences.",
    },
  };

  const currentPage = pageDetails[location.pathname] || {
    title: "FocusMate AI",
    subtitle: "Study smarter. Focus deeper.",
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-logo">FM</div>
          <div>
            <h1 className="brand-title">FocusMate AI</h1>
            <p className="brand-subtitle">Study smarter. Focus deeper.</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-insight">
          <p className="eyebrow">Focus tip</p>
          <h3>One task. One timer.</h3>
          <p>Pick a single task before starting your session to reduce switching.</p>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar-circle">{firstName.charAt(0) || "U"}</div>
            <div className="user-meta">
              <strong>{firstName}</strong>
              <span>{user?.email}</span>
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
            <p className="eyebrow">Welcome back</p>
            <h2 className="page-title">{currentPage.title}</h2>
            <p className="page-subtitle">{currentPage.subtitle}</p>
          </div>
          <div className="topbar-pill">
            <span className="pulse-dot" />
            Workspace online
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
