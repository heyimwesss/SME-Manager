
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import Navbar from "../components/Navbar";
import "./AdminAccounts.css";

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAccounts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("accounts")
        .select("id, name, created_at, status, is_admin, last_login, login_count")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setAccounts(data || []);
    } catch (err) {
      setError(err.message || "Unable to load accounts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const stats = useMemo(() => {
    const total = accounts.length;
    const pending = accounts.filter(
      (acc) => (acc.status || "pending") === "pending"
    ).length;
    const active = accounts.filter(
      (acc) => acc.status === "active"
    ).length;
    const disabled = accounts.filter(
      (acc) => acc.status === "disabled"
    ).length;

    return { total, pending, active, disabled };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return accounts.filter((acc) => {
      const name = (acc.name || "").toLowerCase();
      const status = acc.status || "pending";

      return (
        name.includes(query) &&
        (filter === "all" || status === filter)
      );
    });
  }, [accounts, search, filter]);

  async function updateAccount(acc, newStatus) {
    if (busyId) return;

    setBusyId(acc.id);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("accounts")
        .update({ status: newStatus })
        .eq("id", acc.id);

      if (updateError) throw updateError;

      setAccounts((current) =>
        current.map((item) =>
          item.id === acc.id
            ? { ...item, status: newStatus }
            : item
        )
      );

      const messages = {
        active:
          acc.status === "pending"
            ? `${acc.name} has been approved successfully.`
            : `${acc.name} has been enabled successfully.`,
        disabled: `${acc.name} has been disabled successfully.`,
      };

      setSuccess(messages[newStatus] || "Account updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update account.");
    } finally {
      setBusyId(null);
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getInitial(name) {
    return (name || "?").trim().charAt(0).toUpperCase() || "?";
  }

  function getStatus(acc) {
    return acc.status || "pending";
  }

  return (
    <div className="accounts-page">
      <Navbar />

      <main className="accounts-main">
        <div className="accounts-heading">
          <div>
            <div className="accounts-eyebrow">
              <span className="accounts-eyebrow-dot" />
              ADMINISTRATION
            </div>

            <h1>Account Management</h1>

            <p className="accounts-subtitle">
              Manage users, review account requests and control access
              to your platform.
            </p>
          </div>

          <button
            type="button"
            className="accounts-refresh"
            onClick={() => fetchAccounts(true)}
            disabled={loading || refreshing}
          >
            <span className={refreshing ? "refresh-symbol spinning" : "refresh-symbol"}>
              ↻
            </span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="accounts-alert accounts-alert-error" role="alert">
            <span>!</span>
            <div>
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="accounts-alert accounts-alert-success" role="status">
            <span>✓</span>
            <p>{success}</p>
            <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss message">
              ×
            </button>
          </div>
        )}

        <section className="accounts-stats" aria-label="Account statistics">
          <article className="accounts-stat-card">
            <div className="accounts-stat-top">
              <span className="accounts-stat-label">Total accounts</span>
              <span className="accounts-stat-icon icon-total">◎</span>
            </div>
            <strong className="accounts-stat-value">
              {loading ? "—" : stats.total}
            </strong>
            <span className="accounts-stat-caption">All registered users</span>
          </article>

          <article className="accounts-stat-card">
            <div className="accounts-stat-top">
              <span className="accounts-stat-label">Active accounts</span>
              <span className="accounts-stat-icon icon-active">✓</span>
            </div>
            <strong className="accounts-stat-value">
              {loading ? "—" : stats.active}
            </strong>
            <span className="accounts-stat-caption">Approved and enabled</span>
          </article>

          <article className="accounts-stat-card">
            <div className="accounts-stat-top">
              <span className="accounts-stat-label">Pending approval</span>
              <span className="accounts-stat-icon icon-pending">◷</span>
            </div>
            <strong className="accounts-stat-value">
              {loading ? "—" : stats.pending}
            </strong>
            <span className="accounts-stat-caption">Awaiting your review</span>
          </article>

          <article className="accounts-stat-card">
            <div className="accounts-stat-top">
              <span className="accounts-stat-label">Disabled accounts</span>
              <span className="accounts-stat-icon icon-disabled">⊘</span>
            </div>
            <strong className="accounts-stat-value">
              {loading ? "—" : stats.disabled}
            </strong>
            <span className="accounts-stat-caption">Access currently disabled</span>
          </article>
        </section>

        <section className="accounts-panel">
          <div className="accounts-panel-heading">
            <div>
              <h2>All accounts</h2>
              <p>Review users and manage their access.</p>
            </div>

            <span className="accounts-result-count">
              {loading ? "Loading..." : `${filteredAccounts.length} results`}
            </span>
          </div>

          <div className="accounts-toolbar">
            <div className="accounts-search">
              <span className="accounts-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="search"
                placeholder="Search by account name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search accounts"
              />
              {search && (
                <button
                  type="button"
                  className="accounts-clear-search"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="accounts-filter">
              <label htmlFor="account-status-filter">Status</label>
              <select
                id="account-status-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>

          <div className="accounts-table-wrap">
            {loading ? (
              <div className="accounts-loading">
                <span className="accounts-spinner" />
                <p>Loading accounts...</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="accounts-empty">
                <div className="accounts-empty-icon">⌕</div>
                <h3>No accounts found</h3>
                <p>
                  {search || filter !== "all"
                    ? "Try changing your search or status filter."
                    : "Registered accounts will appear here."}
                </p>

                {(search || filter !== "all") && (
                  <button
                    type="button"
                    className="accounts-reset"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <table className="accounts-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Logins</th>
                    <th className="accounts-actions-heading">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAccounts.map((acc) => {
                    const status = getStatus(acc);
                    const isBusy = busyId === acc.id;

                    return (
                      <tr key={acc.id}>
                        <td>
                          <div className="accounts-user">
                            <div className={`accounts-avatar ${acc.is_admin ? "avatar-admin" : ""}`}>
                              {getInitial(acc.name)}
                            </div>
                            <div className="accounts-user-info">
                              <strong>{acc.name}</strong>
                              <span>
                                {acc.is_admin ? "Administrator account" : "Standard account"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`accounts-role ${acc.is_admin ? "role-admin" : "role-user"}`}>
                            {acc.is_admin ? "Admin" : "User"}
                          </span>
                        </td>

                        <td>
                          <span className={`accounts-status status-${status}`}>
                            <span className="accounts-status-dot" />
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>

                        <td className="accounts-date">
                          {formatDate(acc.created_at)}
                        </td>

                        <td className="accounts-login-count">
                          {acc.login_count ?? 0}
                        </td>

                        <td>
                          <div className="accounts-row-actions">
                            {status === "pending" && (
                              <button
                                type="button"
                                className="accounts-action action-approve"
                                disabled={Boolean(busyId)}
                                onClick={() => updateAccount(acc, "active")}
                              >
                                {isBusy ? "Saving..." : "Approve"}
                              </button>
                            )}

                            {status !== "pending" && !acc.is_admin && (
                              <button
                                type="button"
                                className={`accounts-action ${
                                  status === "active"
                                    ? "action-disable"
                                    : "action-approve"
                                }`}
                                disabled={Boolean(busyId)}
                                onClick={() =>
                                  updateAccount(
                                    acc,
                                    status === "active" ? "disabled" : "active"
                                  )
                                }
                              >
                                {isBusy
                                  ? "Saving..."
                                  : status === "active"
                                    ? "Disable"
                                    : "Enable"}
                              </button>
                            )}

                            {acc.is_admin && (
                              <span className="accounts-protected">
                                Protected
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!loading && filteredAccounts.length > 0 && (
            <div className="accounts-panel-footer">
              <span>
                Showing <strong>{filteredAccounts.length}</strong> of{" "}
                <strong>{accounts.length}</strong> accounts
              </span>
              <span>Account management</span>
            </div>
          )}
        </section>

        <footer className="accounts-footer">
          <span>Account Management</span>
          <span>Manage access carefully and review pending accounts regularly.</span>
        </footer>
      </main>
    </div>
  );
}
