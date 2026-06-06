import { useState } from "react";
import { supabase } from "../services/supabase";
import bcrypt from "bcryptjs";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleRegister() {
    setErrorMsg("");

    if (!name || !password) {
      setErrorMsg("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    const { data: existing } = await supabase
      .from("accounts")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      setErrorMsg("Username already exists");
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const { error } = await supabase
      .from("accounts")
      .insert([
        {
          name,
          password_hash: passwordHash
        }
      ]);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

window.alert(
  "Account created successfully. Please wait for approval before logging in."
);
navigate("/");
  }

  return (
    <div className="page">
      <h1>Create Account</h1>

      {errorMsg && (
        <p style={{ color: "red" }}>{errorMsg}</p>
      )}

      <div className="form-container">

        <div className="form-group">
          <label>Username</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
          />
        </div>

        <button className="btn" onClick={handleRegister}>
          Create Account
        </button>

        <p style={{ marginTop: "15px" }}>
          Already have an account?{" "}
          <Link to="/">Login</Link>
        </p>

      </div>
    </div>
  );
}