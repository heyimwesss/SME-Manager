
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Accounts from "./pages/Accounts";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Notes from "./pages/Notes";
import Register from "./pages/Register";
import AdminRoute from "./routes/AdminRoute";
import AdminAccounts from "./pages/AdminAccounts";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/accounts" replace />} />

        <Route path="/accounts" element={<Accounts />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/admin/accounts"
          element={
            <AdminRoute>
              <AdminAccounts />
            </AdminRoute>
          }
        />

        {/* Send unknown URLs to the landing page */}
        <Route path="*" element={<Navigate to="/accounts" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
