import { useState } from "react";
import { useAccount } from "../context/AccountContext";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { activeAccount, setActiveAccount } = useAccount();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = () => {
    setActiveAccount(null);
    navigate("/accounts");
  };

  if (!activeAccount) return null;

  return (
    <nav className="navbar">
      <div className="nav-brand">{activeAccount.name}</div>

      {/* Hamburger */}
      <button
        className="hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>

      <ul className={`nav-links ${menuOpen ? "open" : ""}`}>
        <li onClick={() => { setMenuOpen(false); navigate("/dashboard"); }}>Dashboard</li>
        <li onClick={() => { setMenuOpen(false); navigate("/transactions"); }}>Transactions</li>
        <li onClick={() => { setMenuOpen(false); navigate("/reports"); }}>Reports</li>
        <li>
          <button className="btn btn-logout" onClick={logout}>Log Out</button>
        </li>
      </ul>
    </nav>
  );
}
