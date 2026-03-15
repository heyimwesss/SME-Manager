// src/pages/Accounts.jsx
import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAccount } from "../context/AccountContext";
import bcrypt from "bcryptjs";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

export default function Accounts() {
  const { activeAccount, login } = useAccount();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (activeAccount) {
      navigate("/dashboard");
    }
  }, [activeAccount, navigate]);

  // Fetch accounts
  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("name");

    if (error) console.log(error);
    else setAccounts(data || []);
  }

  async function handleLogin() {
    if (!selectedAccount || !loginPassword) {
      setErrorMsg("Select an account and enter password");
      return;
    }

    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", selectedAccount)
      .single();

    if (error || !data) {
      setErrorMsg("Account not found");
      return;
    }

    const match = bcrypt.compareSync(loginPassword, data.password_hash);

    if (match) {
      login(data);
      setErrorMsg("");
      navigate("/dashboard");
    } else {
      setErrorMsg("Incorrect password");
    }
  }

  return (
    <div className="page">
      <Navbar />
      <h1>Accounts</h1>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      <div className="form-container" style={{ marginTop: "30px" }}>
        <h2>Login</h2>

        <div className="form-group">
          <label>Select Account</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="">--Select--</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Password"
          />
        </div>

        <button className="btn" onClick={handleLogin}>
          Login
        </button>
      </div>
    </div>
  );
}