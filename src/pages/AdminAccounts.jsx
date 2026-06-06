import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import Navbar from "../components/Navbar";

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setLoading(true);

    const { data } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: false });

    setAccounts(data || []);
    setLoading(false);
  }

  // 🔥 APPROVE
  async function approveAccount(id) {
    await supabase
      .from("accounts")
      .update({ status: "active" })
      .eq("id", id);

    fetchAccounts();
  }

  // 🔥 TOGGLE (Disable / Enable)
  async function toggleAccount(acc) {
    const newStatus =
      acc.status === "active" ? "disabled" : "active";

    await supabase
      .from("accounts")
      .update({ status: newStatus })
      .eq("id", acc.id);

    fetchAccounts();
  }

  // 🔎 FILTER LOGIC
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" || acc.status === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="page">
      <Navbar />

      <div className="container">
        <h1>Admin Panel</h1>

        {/* 🔍 Controls */}
        <div className="admin-controls">
          <input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        {loading ? (
          <p>Loading accounts...</p>
        ) : (
          <div className="grid">
            {filteredAccounts.map((acc) => (
              <div key={acc.id} className="card">

                {/* Header */}
                <div className="card-header">
                  <h3>{acc.name}</h3>

                  <span className={`badge ${acc.status}`}>
                    {acc.status}
                  </span>
                </div>

                {/* Info */}
                <p>
                  Admin:{" "}
                  <strong>
                    {acc.is_admin ? "Yes" : "No"}
                  </strong>
                </p>

                {/* Actions */}
                <div className="actions">

                  {/* Pending → Approve */}
                  {acc.status === "pending" && (
                    <button
                      className="btn approve"
                      onClick={() =>
                        approveAccount(acc.id)
                      }
                    >
                      Approve
                    </button>
                  )}

                  {/* Active / Disabled toggle */}
                  {acc.status !== "pending" &&
                    !acc.is_admin && (
                      <button
                        className={
                          acc.status === "active"
                            ? "btn disable"
                            : "btn approve"
                        }
                        onClick={() =>
                          toggleAccount(acc)
                        }
                      >
                        {acc.status === "active"
                          ? "Disable"
                          : "Enable"}
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}