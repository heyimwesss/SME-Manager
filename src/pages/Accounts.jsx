import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAccount } from "../context/AccountContext";
import bcrypt from "bcryptjs";
import { useNavigate, Link } from "react-router-dom";

export default function Accounts() {
  const { activeAccount, login } = useAccount();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

const [notification, setNotification] = useState({
  type: "", // "error" | "success" | "info"
  message: ""
});

useEffect(() => {
  if (notification.message) {
    const t = setTimeout(() => {
      setNotification({ type: "", message: "" });
    }, 5000);

    return () => clearTimeout(t);
  }
}, [notification]);

  useEffect(() => {
    if (activeAccount) {
      navigate("/dashboard");
    }
  }, [activeAccount, navigate]);

  async function handleLogin() {
    setErrorMsg("");

    if (!name || !password) {
setNotification({
  type: "error",
  message: "Enter username and password"
});      return;
    }

    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("name", name)
      .single();

    if (error || !data) {
setNotification({
  type: "error",
  message: "Account not found"
});      return;
    }

    // 🔒 Status checks (IMPORTANT for your system)
    if (data.status === "pending") {
setNotification({
  type: "info",
  message: "Your account is awaiting approval. Check again in a few minutes"
});      return;
    }

    if (data.status === "disabled") {
setNotification({
  type: "error",
  message: "Your account has been disabled. Contact admin to re-activate"
});      return;
    }

    const match = bcrypt.compareSync(
      password,
      data.password_hash
    );

    if (!match) {
setNotification({
  type: "error",
  message: "Incorrect password"
});      return;
    }

    login(data);
    navigate("/dashboard");
  }

  return (
    <div className="page">
      <h1>Login</h1>

{notification.message && (
  <div className={`alert ${notification.type}`}>
    {notification.message}
  </div>
)}

      <div className="form-container">

        <div className="form-group">
          <label>Username</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Username"
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>

        <button className="btn" onClick={handleLogin}>
          Login
        </button>

        <p style={{ marginTop: "15px" }}>
          No account?{" "}
          <Link to="/register">Create Account</Link>
        </p>

      </div>
    </div>
  );
}