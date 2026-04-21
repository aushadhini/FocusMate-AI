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

  const firstName =
    user?.email?.split("@")[0]?.charAt(0)?.toUpperCase() +
      user?.email?.split("@")[0]?.slice(1) || "User";

  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/tasks", label: "Tasks" },
    { to: "/focus", label: "Focus" },
    { to: "/analytics", label: "Analytics" },
    { to: "/settings", label: "Settings" },
  ];

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

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar-circle">
              {firstName?.charAt(0) || "U"}
            </div>
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
            <h2 className="page-title">
              {location.pathname === "/dashboard" && "Your Dashboard"}
              {location.pathname === "/tasks" && "Task Manager"}
              {location.pathname === "/focus" && "Focus Session"}
              {location.pathname === "/analytics" && "Analytics"}
              {location.pathname === "/settings" && "Settings"}
            </h2>
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