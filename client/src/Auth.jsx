import { useState } from "react";
import { supabase } from "./supabase";

function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          alert(error.message);
        } else {
          alert("Login successful!");
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          alert(error.message);
        } else {
          alert("Signup successful!");
        }
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }

    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>{isLogin ? "Login" : "Sign Up"}</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        <p style={styles.switchText} onClick={() => setIsLogin(!isLogin)}>
          {isLogin
            ? "Don’t have an account? Sign Up"
            : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0b1220",
  },
  card: {
    background: "#111827",
    padding: "30px",
    borderRadius: "16px",
    width: "350px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    color: "white",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "20px",
  },
  input: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #374151",
    fontSize: "16px",
    background: "#1f2937",
    color: "white",
  },
  button: {
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "#22c55e",
    color: "white",
    fontSize: "16px",
    cursor: "pointer",
  },
  switchText: {
    marginTop: "16px",
    color: "#60a5fa",
    cursor: "pointer",
    textAlign: "center",
  },
};

export default Auth;