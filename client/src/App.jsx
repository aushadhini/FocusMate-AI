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

    const initializeSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(currentSession);
        setLoading(false);
      }
    };

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
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
          <h2>Loading FocusMate AI...</h2>
          <p>Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={!session ? <Auth /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/"
        element={
          session ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        element={
          <ProtectedRoute session={session}>
            <AppLayout session={session} />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage session={session} />} />
        <Route path="/tasks" element={<TasksPage session={session} />} />
        <Route path="/focus" element={<FocusPage session={session} />} />
        <Route path="/analytics" element={<AnalyticsPage session={session} />} />
        <Route path="/settings" element={<SettingsPage session={session} />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to={session ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;