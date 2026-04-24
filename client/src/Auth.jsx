import { useState } from "react";
import { supabase } from "./supabase";

function Auth() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleMagicLink = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

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
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />

        <div className="auth-hero-content">
          <div className="auth-badge">✨ Premium Productivity Workspace</div>
          <h1>Focus better. Plan smarter. Build your daily rhythm.</h1>
          <p>
            FocusMate AI brings your tasks, Pomodoro sessions, streaks, and
            analytics into one polished workspace designed for deep work.
          </p>

          <div className="hero-grid">
            <div className="hero-card">
              <span className="hero-card-icon">⏱️</span>
              <h3>Focused Pomodoro</h3>
              <p>Run clean 25-minute sessions and save your progress.</p>
            </div>
            <div className="hero-card">
              <span className="hero-card-icon">✅</span>
              <h3>Smart Task Flow</h3>
              <p>Capture tasks quickly and choose what matters next.</p>
            </div>
            <div className="hero-card">
              <span className="hero-card-icon">📊</span>
              <h3>Visual Analytics</h3>
              <p>Track streaks, weekly activity, and total focus time.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card-header">
          <div className="mini-logo">FM</div>
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in to FocusMate AI</h2>
          </div>
        </div>

        <p className="muted auth-copy">
          Continue with your saved tasks, focus sessions, and progress history.
        </p>

        <button className="btn btn-primary full-width" onClick={signInWithGoogle}>
          <span>Continue with Google</span>
        </button>

        <div className="auth-divider">
          <span>or use email</span>
        </div>

        <form onSubmit={handleMagicLink} className="auth-form">
          <label className="field-label">Email address</label>
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button className="btn btn-secondary full-width" type="submit" disabled={loading}>
            {loading ? "Sending magic link..." : "Send Magic Link"}
          </button>
        </form>

        {message ? <div className="message-box">{message}</div> : null}
      </section>
    </div>
  );
}

export default Auth;
