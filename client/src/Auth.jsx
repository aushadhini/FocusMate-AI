import { useState } from "react";
import { supabase } from "./supabase";

function Auth({ theme = "light", setTheme }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleMagicLink = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Magic link sent. Check your email to sign in.");
    }

    setLoading(false);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });

    if (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-bg-blur auth-bg-one" />
      <div className="auth-bg-blur auth-bg-two" />

      <div className="auth-layout">
        <div className="auth-brand-panel">
          <div className="hero-badge">FocusMate AI · Premium Productivity</div>
          <h1>Focus better. Study smarter. Build your rhythm.</h1>
          <p>
            A modern workspace for tasks, Pomodoro sessions, streak tracking,
            and elegant study flow — designed to feel like a premium app.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-card">
              <strong>Deep focus timer</strong>
              <span>Pomodoro modes, progress ring, and session saving.</span>
            </div>

            <div className="auth-feature-card">
              <strong>Task clarity</strong>
              <span>Priorities, filters, and quick focus selection.</span>
            </div>

            <div className="auth-feature-card">
              <strong>Consistency tracking</strong>
              <span>Weekly trends, streaks, and a visual heatmap.</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-top">
            <div>
              <span className="auth-kicker">Welcome back</span>
              <h2>Sign in to your workspace</h2>
              <p>Continue your focus sessions with your saved data.</p>
            </div>

            {setTheme && (
              <button
                className="theme-toggle-btn auth-theme-btn"
                onClick={() =>
                  setTheme((prevTheme) =>
                    prevTheme === "dark" ? "light" : "dark"
                  )
                }
              >
                {theme === "dark" ? "☀ Light" : "🌙 Dark"}
              </button>
            )}
          </div>

          <button className="oauth-btn" onClick={signInWithGoogle}>
            <span>🔐</span>
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or use email</span>
          </div>

          <form className="auth-form" onSubmit={handleMagicLink}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Magic Link"}
            </button>
          </form>

          {message ? <div className="auth-message">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default Auth;
