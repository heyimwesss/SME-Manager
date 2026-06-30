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
const [tab, setTab] = useState("login"); // "login" | "manual"

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

    {/* TABS */}
    <div className="tabs">
      <button
        className={tab === "login" ? "tab active" : "tab"}
        onClick={() => setTab("login")}
      >
        Login
      </button>

      <button
        className={tab === "manual" ? "tab active" : "tab"}
        onClick={() => setTab("manual")}
      >
        How it works?
      </button>
    </div>

    {/* NOTIFICATION */}
    {notification.message && (
      <div className={`alert ${notification.type}`}>
        {notification.message}
      </div>
    )}

    {/* 🔥 THIS IS THE IMPORTANT PART */}
    {tab === "login" ? (
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
          No account? <Link to="/register">Create Account</Link>
        </p>
      </div>
    ) : (
      <div className="form-container">
        <h2>How The App Works</h2>
<div className="manual">

  <p>
    This system is designed to help you manage your business finances in a structured,
    transparent, and automated way. Instead of relying on handwritten records or memory,
    every transaction is recorded, calculated, and retrievable instantly.
  </p>

  <h3>Why This System Improves Your Business</h3>
  <p>
    Using this system helps you avoid financial confusion, missing money, and manual errors.
    It gives you a real-time picture of your business performance, allowing you to know exactly:
  </p>
  <ul>
    <li>How much money you have at any moment</li>
    <li>How much profit you are making daily</li>
    <li>Where your money is being spent</li>
    <li>How much cash has been given to the business owner</li>
  </ul>

  <p>
    It also reduces dependency on manual calculations and ensures that all records are stored safely
    and can be reviewed at any time.
  </p>

  <h3>1. Sales Module</h3>
  <p>
    The sales section is used to record every product or service sold.
    Each sale requires:
  </p>
  <ul>
    <li>Item name</li>
    <li>Selling price</li>
    <li>Payment method (Cash or Bank)</li>
  </ul>

  <p>
    Once saved, the system automatically adds the sale to your records and updates your financial summary.
    Cash sales increase available cash, while bank sales are tracked separately for accounting clarity.
  </p>

  <h3>2. Expenses Module</h3>
  <p>
    Expenses represent any business money spent on operations such as transport, supplies, or maintenance.
    Every expense is recorded with a description and amount.
  </p>

  <p>
    Expenses are automatically deducted from your available cash, ensuring your financial balance remains accurate.
  </p>

  <h3>3. Bank Expenses Module</h3>
  <p>
    This section tracks money spent directly from a bank account instead of cash.
    It is important for separating cash flow from bank transactions.
  </p>

  <p>
    This helps you understand how much money is leaving your bank without affecting physical cash on hand.
  </p>

  <h3>4. Cash Remittance (Cash Given to Owner)</h3>
  <p>
    This feature is used when cash is handed over to the business owner or removed from the business.
  </p>

  <p>
    The system automatically checks available cash before allowing a remittance, preventing over-withdrawal.
    All remittances are recorded for accountability and auditing purposes.
  </p>

  <h3>5. Search & Transaction Tracking</h3>
  <p>
    The search feature allows you to quickly find any transaction using:
  </p>
  <ul>
    <li>Item or description</li>
    <li>Amount</li>
    <li>Transaction type (Sale, Expense, Bank Expense, Remittance)</li>
  </ul>

  <p>
    You can also click on any result to view full transaction details including date and time.
  </p>

  <h3>6. Automatic Financial Calculations</h3>
  <p>
    The system automatically calculates:
  </p>
  <ul>
    <li>Total sales</li>
    <li>Total expenses</li>
    <li>Total cash given to owner</li>
    <li>Current cash on hand</li>
  </ul>

  <p>
    This ensures you never need to manually compute balances, reducing errors and improving financial accuracy.
  </p>

  <h3>7. Reports & Data Export</h3>
  <p>
    The system allows you to generate and download financial reports.
    These reports provide a full summary of your transactions over a selected period.
  </p>

  <ul>
    <li>Daily reports</li>
    <li>Weekly reports</li>
    <li>Monthly reports</li>
    <li>Custom date range reports</li>
  </ul>

  <p>
    Reports can be downloaded for record keeping, auditing, or sharing with accountants or business partners.
    This makes it easier to analyze business performance outside the system.
  </p>

  <h3>8. Data Security & Reliability</h3>
  <p>
    All data is securely stored in the system database and linked to your account.
    This ensures that your records are not lost and can only be accessed by authorized users.
  </p>

</div>      </div>
    )}
  </div>
);
}