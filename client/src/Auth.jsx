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
      <div className="auth-hero">
        <div className="auth-badge">Premium Productivity Workspace</div>
        <h1>Focus better. Organize tasks. Build your rhythm.</h1>
        <p>
          FocusMate AI helps you manage tasks, run Pomodoro sessions, and track
          your consistency in one clean workspace.
        </p>
      </div>

      <div className="auth-card">
        <p className="eyebrow">Welcome back</p>
        <h2>Sign in to FocusMate AI</h2>
        <p className="muted">
          Continue with your saved tasks, sessions, and progress.
        </p>

        <button className="btn btn-primary full-width" onClick={signInWithGoogle}>
          Continue with Google
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
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>

        {message ? <div className="message-box">{message}</div> : null}
      </div>
    </div>
  );
}

export default Auth;