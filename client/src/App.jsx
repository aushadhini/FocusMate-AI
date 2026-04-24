import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "./supabase";

import Auth from "./Auth";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

import DashboardPage from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import FocusPage from "./pages/FocusPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(session);
        setLoading(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="screen-center">
        <div className="loading-card">
          <span className="eyebrow">FocusMate AI</span>
          <h2>Loading your workspace...</h2>
          <p className="muted">Preparing your dashboard.</p>
        </div>
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute session={session}>
            <AppLayout session={session} />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage session={session} />} />
        <Route path="tasks" element={<TasksPage session={session} />} />
        <Route path="focus" element={<FocusPage session={session} />} />
        <Route path="analytics" element={<AnalyticsPage session={session} />} />
        <Route path="settings" element={<SettingsPage session={session} />} />
      </Route>
    </Routes>
  );
}

export default App;