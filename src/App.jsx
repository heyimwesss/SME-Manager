// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Accounts from "./pages/Accounts";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import "./app.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Accounts />} /> {/* Default to landing */}
      </Routes>
    </BrowserRouter>
  );
}
