import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { formatMoney } from "../utils/formatMoney";
import Navbar from "../components/Navbar";
import { useAccount } from "../context/AccountContext";

const BUSINESS_TIME_ZONE = "Africa/Blantyre";

// Return a calendar date in Malawi time. Date-only values stay unchanged.
function getMalawiDateKey(value) {
  if (!value) return "";

  const rawValue = String(value);
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(rawValue)) return rawValue;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function Dashboard() {
  const { activeAccount } = useAccount();

  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [remittances, setRemittances] = useState([]);
  const [bankExpenses, setBankExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = useMemo(() => getMalawiDateKey(new Date()), []);

  const fetchPaged = useCallback(async (table, dateColumn) => {
    let rows = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error: queryError } = await supabase
        .from(table)
        .select("*")
        .eq("account_id", activeAccount.id)
        .order(dateColumn, { ascending: false })
        .range(from, from + pageSize - 1);

      if (queryError) throw queryError;
      if (!data?.length) break;

      rows = rows.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    return rows;
  }, [activeAccount]);

  const fetchAllData = useCallback(async () => {
    if (!activeAccount?.id) return;

    setLoading(true);
    setError("");

    try {
      const [salesData, expensesData, remittancesData, bankExpensesData] =
        await Promise.all([
          fetchPaged("sales", "sold_at"),
          fetchPaged("expenses", "expense_date"),
          fetchPaged("cash_remittances", "created_at"),
          fetchPaged("bank_expenses", "created_at"),
        ]);

      setSales(salesData);
      setExpenses(expensesData);
      setRemittances(remittancesData);
      setBankExpenses(bankExpensesData);
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
      setError("We couldn't load the latest dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeAccount, fetchPaged]);

  useEffect(() => {
    if (activeAccount?.id) {
      fetchAllData();
    } else {
      setSales([]);
      setExpenses([]);
      setRemittances([]);
      setBankExpenses([]);
    }
  }, [activeAccount?.id, fetchAllData]);

  const dateKey = (value) => getMalawiDateKey(value);

  const todaySales = useMemo(
    () => sales.filter((item) => dateKey(item.sold_at) === today),
    [sales, today]
  );
  const todayExpenses = useMemo(
    () => expenses.filter((item) => dateKey(item.expense_date) === today),
    [expenses, today]
  );
  const todayRemittances = useMemo(
    () => remittances.filter((item) => dateKey(item.created_at) === today),
    [remittances, today]
  );
  const todayBankExpenses = useMemo(
    () => bankExpenses.filter((item) => dateKey(item.created_at) === today),
    [bankExpenses, today]
  );

  const prevSales = useMemo(
    () => sales.filter((item) => dateKey(item.sold_at) < today),
    [sales, today]
  );
  const prevExpenses = useMemo(
    () => expenses.filter((item) => dateKey(item.expense_date) < today),
    [expenses, today]
  );
  const prevRemittances = useMemo(
    () => remittances.filter((item) => dateKey(item.created_at) < today),
    [remittances, today]
  );

  const sum = (items, getter) =>
    items.reduce((total, item) => total + Number(getter(item) || 0), 0);

  const openingCash =
    sum(prevSales.filter((item) => item.payment_mode === "Cash"), (item) => item.price) -
    sum(prevExpenses, (item) => item.amount) -
    sum(prevRemittances, (item) => item.amount);

  const totalSales = sum(todaySales, (item) => item.price);
  const cashSales = sum(
    todaySales.filter((item) => item.payment_mode === "Cash"),
    (item) => item.price
  );
  const bankSales = sum(
    todaySales.filter((item) => item.payment_mode === "Bank"),
    (item) => item.price
  );
  const cashExpenses = sum(todayExpenses, (item) => item.amount);
  const bankExpensesTotal = sum(todayBankExpenses, (item) => item.amount);
  const cashRemitted = sum(todayRemittances, (item) => item.amount);

  const cashOnHand = openingCash + cashSales - cashExpenses - cashRemitted;
  const bankBalance = bankSales - bankExpensesTotal;
  const totalBalance = cashOnHand + bankBalance;

  const activity = useMemo(() => {
    const entries = [
      ...todaySales.map((item) => ({
        id: `sale-${item.id}`,
        type: "Sale",
        description: item.item_name || "Sale",
        detail: item.payment_mode || "Payment",
        amount: Number(item.price || 0),
        income: true,
        date: item.sold_at,
      })),
      ...todayExpenses.map((item) => ({
        id: `expense-${item.id}`,
        type: "Cash expense",
        description: item.description || "Expense",
        detail: "Cash",
        amount: Number(item.amount || 0),
        income: false,
        date: item.expense_date,
      })),
      ...todayBankExpenses.map((item) => ({
        id: `bank-expense-${item.id}`,
        type: "Bank expense",
        description: item.description || "Bank expense",
        detail: "Bank",
        amount: Number(item.amount || 0),
        income: false,
        date: item.created_at,
      })),
      ...todayRemittances.map((item) => ({
        id: `remittance-${item.id}`,
        type: "Cash remittance",
        description: item.note || "Cash remitted",
        detail: "Cash",
        amount: Number(item.amount || 0),
        income: false,
        date: item.created_at,
      })),
    ];

    return entries.sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
  }, [todaySales, todayExpenses, todayBankExpenses, todayRemittances]);

  const formatTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-GB", {
      timeZone: BUSINESS_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };

  if (!activeAccount) {
    return (
      <>
        <Navbar />
        <main className="dashboard-page">
          <div className="dashboard-loading">
            <span className="dashboard-spinner" />
            <p>Loading your account...</p>
          </div>
        </main>
        <DashboardStyles />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="dashboard-page">
        <header className="dashboard-heading">
          <div>
            <span className="dashboard-eyebrow">BUSINESS OVERVIEW</span>
            <h1>Dashboard</h1>
            <p>Keep track of your money and today's business activity.</p>
          </div>

          <div className="dashboard-heading-actions">
            <div className="dashboard-date">
              <span className="date-icon">▦</span>
              <div>
                <small>Today</small>
                <strong>
                  {new Intl.DateTimeFormat("en-GB", {
                    timeZone: BUSINESS_TIME_ZONE,
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(`${today}T12:00:00`))}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="dashboard-refresh"
              onClick={fetchAllData}
              disabled={loading}
            >
              <span className={loading ? "refresh-symbol is-spinning" : "refresh-symbol"}>↻</span>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {error && (
          <div className="dashboard-alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={fetchAllData}>Try again</button>
          </div>
        )}

        <section className="dashboard-balance-grid" aria-label="Current balances">
          <article className="dashboard-total-card">
            <div className="balance-card-top">
              <span className="balance-card-label">Total balance</span>
              <span className="balance-card-icon">↗</span>
            </div>
            <strong className="total-balance-value">{formatMoney(totalBalance)}</strong>
            <div className="total-balance-footer">
              <span className="balance-status-dot" />
              <span>Cash on hand + bank balance</span>
            </div>
          </article>

          <article className="dashboard-balance-card">
            <div className="dashboard-card-title">
              <span className="dashboard-icon cash-icon">C</span>
              <span>Cash on hand</span>
            </div>
            <strong className={cashOnHand < 0 ? "negative-value" : ""}>{formatMoney(cashOnHand)}</strong>
            <div className="balance-card-footnote">
              <span>Opening cash</span>
              <b>{formatMoney(openingCash)}</b>
            </div>
          </article>

          <article className="dashboard-balance-card">
            <div className="dashboard-card-title">
              <span className="dashboard-icon bank-icon">B</span>
              <span>Bank balance</span>
            </div>
            <strong className={bankBalance < 0 ? "negative-value" : ""}>{formatMoney(bankBalance)}</strong>
            <div className="balance-card-footnote">
              <span>Today's net bank activity</span>
              <b>{formatMoney(bankSales - bankExpensesTotal)}</b>
            </div>
          </article>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <h2>Today's performance</h2>
              <p>A quick breakdown of today's money movement.</p>
            </div>
            <span className="dashboard-live-label"><span /> TODAY</span>
          </div>

          <div className="dashboard-metrics-grid">
            <article className="dashboard-metric-card metric-sales">
              <div className="metric-heading">
                <span className="metric-icon">↗</span>
                <span>Sales</span>
              </div>
              <strong>{formatMoney(totalSales)}</strong>
              <div className="metric-detail-row">
                <span>Cash sales</span><b>{formatMoney(cashSales)}</b>
              </div>
              <div className="metric-detail-row">
                <span>Bank sales</span><b>{formatMoney(bankSales)}</b>
              </div>
            </article>

            <article className="dashboard-metric-card metric-expenses">
              <div className="metric-heading">
                <span className="metric-icon">−</span>
                <span>Cash expenses</span>
              </div>
              <strong>{formatMoney(cashExpenses)}</strong>
              <div className="metric-bottom-note">
                {todayExpenses.length} {todayExpenses.length === 1 ? "transaction" : "transactions"} today
              </div>
            </article>

            <article className="dashboard-metric-card metric-remittance">
              <div className="metric-heading">
                <span className="metric-icon">⇧</span>
                <span>Cash remitted</span>
              </div>
              <strong>{formatMoney(cashRemitted)}</strong>
              <div className="metric-bottom-note">
                {todayRemittances.length} {todayRemittances.length === 1 ? "remittance" : "remittances"} today
              </div>
            </article>

            <article className="dashboard-metric-card metric-bank-expenses">
              <div className="metric-heading">
                <span className="metric-icon">▤</span>
                <span>Bank expenses</span>
              </div>
              <strong>{formatMoney(bankExpensesTotal)}</strong>
              <div className="metric-bottom-note">
                {todayBankExpenses.length} {todayBankExpenses.length === 1 ? "transaction" : "transactions"} today
              </div>
            </article>
          </div>
        </section>

        <section className="dashboard-activity-panel">
          <div className="activity-panel-header">
            <div>
              <h2>Today's activity</h2>
              <p>Recent sales, expenses and cash movements.</p>
            </div>
            <span className="activity-count">{activity.length} {activity.length === 1 ? "entry" : "entries"}</span>
          </div>

          {loading && activity.length === 0 ? (
            <div className="dashboard-empty-state">
              <span className="dashboard-spinner" />
              <p>Loading activity...</p>
            </div>
          ) : activity.length === 0 ? (
            <div className="dashboard-empty-state">
              <span className="empty-activity-icon">▤</span>
              <strong>No transactions yet today</strong>
              <p>When you record sales or expenses, they'll appear here.</p>
            </div>
          ) : (
            <>
              <div className="activity-table-wrap">
                <table className="dashboard-activity-table">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Category</th>
                      <th>Payment</th>
                      <th>Time</th>
                      <th className="activity-amount-heading">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="activity-description-cell">
                            <span className={item.income ? "activity-type-icon is-income" : "activity-type-icon is-expense"}>
                              {item.income ? "+" : "−"}
                            </span>
                            <div>
                              <strong>{item.description}</strong>
                              <small>{item.type}</small>
                            </div>
                          </div>
                        </td>
                        <td><span className={`activity-category ${item.income ? "category-income" : "category-expense"}`}>{item.type}</span></td>
                        <td><span className="activity-payment">{item.detail}</span></td>
                        <td className="activity-time">{formatTime(item.date)}</td>
                        <td className={`activity-amount ${item.income ? "amount-positive" : "amount-negative"}`}>
                          {item.income ? "+" : "−"}{formatMoney(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="dashboard-mobile-activity">
                {activity.map((item) => (
                  <article className="mobile-activity-row" key={item.id}>
                    <span className={item.income ? "activity-type-icon is-income" : "activity-type-icon is-expense"}>
                      {item.income ? "+" : "−"}
                    </span>
                    <div className="mobile-activity-main">
                      <strong>{item.description}</strong>
                      <span>{item.type} · {item.detail} · {formatTime(item.date)}</span>
                    </div>
                    <strong className={`activity-amount ${item.income ? "amount-positive" : "amount-negative"}`}>
                      {item.income ? "+" : "−"}{formatMoney(item.amount)}
                    </strong>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <footer className="dashboard-footer">
          <span>Business overview</span>
          <span>{loading ? "Updating data…" : "Data reflects recorded transactions for the selected account."}</span>
        </footer>
      </main>

      <DashboardStyles />
    </>
  );
}

function DashboardStyles() {
  return (
    <style>{`
      .dashboard-page,
      .dashboard-page *,
      .dashboard-page *::before,
      .dashboard-page *::after {
        box-sizing: border-box;
      }

      .dashboard-page {
        width: 100%;
        max-width: 1500px;
        margin: 0 auto;
        padding: 22px 24px 34px;
        color: #111827;
      }

      .dashboard-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 26px;
      }

      .dashboard-eyebrow {
        display: inline-block;
        margin-bottom: 7px;
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .13em;
      }

      .dashboard-heading h1 {
        margin: 0;
        color: #111827;
        font-size: clamp(26px, 3vw, 34px);
        line-height: 1.15;
        letter-spacing: -.04em;
      }

      .dashboard-heading p,
      .dashboard-section-heading p,
      .activity-panel-header p {
        margin: 8px 0 0;
        color: #6b7280;
        font-size: 14px;
        line-height: 1.5;
      }

      .dashboard-heading-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        flex-shrink: 0;
      }

      .dashboard-date {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 13px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
      }

      .date-icon {
        display: grid;
        place-items: center;
        width: 35px;
        height: 35px;
        border-radius: 10px;
        background: #eff6ff;
        color: #2563eb;
        font-size: 20px;
      }

      .dashboard-date div { display: grid; gap: 3px; }
      .dashboard-date small { color: #6b7280; font-size: 11px; }
      .dashboard-date strong { color: #1f2937; font-size: 12px; white-space: nowrap; }

      .dashboard-refresh {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 45px;
        padding: 0 15px;
        border: 1px solid #dbe2ea;
        border-radius: 11px;
        background: #fff;
        color: #1f2937;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease;
      }

      .dashboard-refresh:hover { background: #f8fafc; border-color: #cbd5e1; }
      .dashboard-refresh:disabled { opacity: .65; cursor: wait; }
      .refresh-symbol { font-size: 19px; line-height: 1; }
      .is-spinning { display: inline-block; animation: dashboard-spin 1s linear infinite; }
      @keyframes dashboard-spin { to { transform: rotate(360deg); } }

      .dashboard-alert {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 18px;
        padding: 13px 15px;
        border: 1px solid #fecaca;
        border-radius: 11px;
        background: #fef2f2;
        color: #991b1b;
        font-size: 13px;
      }

      .dashboard-alert button {
        border: 0;
        background: transparent;
        color: #991b1b;
        font-weight: 800;
        text-decoration: underline;
        cursor: pointer;
        white-space: nowrap;
      }

      .dashboard-balance-grid {
        display: grid;
        grid-template-columns: 1.25fr 1fr 1fr;
        gap: 16px;
        margin-bottom: 30px;
      }

      .dashboard-total-card,
      .dashboard-balance-card,
      .dashboard-metric-card,
      .dashboard-activity-panel {
        min-width: 0;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 4px 18px rgba(15, 23, 42, .035);
      }

      .dashboard-total-card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 190px;
        padding: 23px 24px;
        overflow: hidden;
        border-color: #1d4ed8;
        background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
        color: #fff;
        position: relative;
      }

      .dashboard-total-card::after {
        content: "";
        position: absolute;
        width: 180px;
        height: 180px;
        right: -62px;
        top: -78px;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 50%;
        box-shadow: 0 0 0 24px rgba(255,255,255,.035), 0 0 0 48px rgba(255,255,255,.025);
        pointer-events: none;
      }

      .balance-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        position: relative;
        z-index: 1;
      }

      .balance-card-label { color: rgba(255,255,255,.82); font-size: 13px; font-weight: 650; }
      .balance-card-icon {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border: 1px solid rgba(255,255,255,.24);
        border-radius: 10px;
        background: rgba(255,255,255,.1);
        font-size: 19px;
      }

      .total-balance-value {
        display: block;
        position: relative;
        z-index: 1;
        margin: 18px 0;
        font-size: clamp(25px, 2.7vw, 35px);
        font-weight: 800;
        line-height: 1.2;
        letter-spacing: -.04em;
        overflow-wrap: anywhere;
      }

      .total-balance-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        color: rgba(255,255,255,.8);
        font-size: 11px;
        position: relative;
        z-index: 1;
      }

      .balance-status-dot, .dashboard-live-label span {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #86efac;
        flex-shrink: 0;
      }

      .dashboard-balance-card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 190px;
        padding: 23px;
      }

      .dashboard-card-title {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #64748b;
        font-size: 13px;
        font-weight: 650;
      }

      .dashboard-icon {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 11px;
        font-size: 14px;
        font-weight: 850;
      }

      .cash-icon { background: #dcfce7; color: #15803d; }
      .bank-icon { background: #dbeafe; color: #1d4ed8; }

      .dashboard-balance-card > strong {
        margin: 20px 0;
        color: #111827;
        font-size: clamp(23px, 2.3vw, 30px);
        font-weight: 800;
        line-height: 1.2;
        letter-spacing: -.035em;
        overflow-wrap: anywhere;
      }

      .dashboard-balance-card > strong.negative-value { color: #dc2626; }

      .balance-card-footnote {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding-top: 13px;
        border-top: 1px solid #f1f5f9;
        color: #6b7280;
        font-size: 11px;
      }

      .balance-card-footnote b { color: #374151; font-size: 12px; text-align: right; }

      .dashboard-section { margin-bottom: 30px; }
      .dashboard-section-heading,
      .activity-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }

      .dashboard-section-heading h2,
      .activity-panel-header h2 {
        margin: 0;
        color: #111827;
        font-size: 19px;
        font-weight: 800;
        letter-spacing: -.025em;
      }

      .dashboard-live-label {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 7px 10px;
        border: 1px solid #bbf7d0;
        border-radius: 20px;
        background: #f0fdf4;
        color: #15803d;
        font-size: 10px;
        font-weight: 850;
        letter-spacing: .07em;
        white-space: nowrap;
      }

      .dashboard-live-label span { background: #22c55e; }

      .dashboard-metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 15px;
      }

      .dashboard-metric-card { padding: 19px 20px; }
      .metric-heading {
        display: flex;
        align-items: center;
        gap: 9px;
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
      }

      .metric-icon {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        font-size: 19px;
        font-weight: 800;
      }

      .metric-sales .metric-icon { color: #15803d; background: #dcfce7; }
      .metric-expenses .metric-icon { color: #b91c1c; background: #fee2e2; }
      .metric-remittance .metric-icon { color: #a16207; background: #fef3c7; }
      .metric-bank-expenses .metric-icon { color: #1d4ed8; background: #dbeafe; }

      .dashboard-metric-card > strong {
        display: block;
        margin: 17px 0 14px;
        color: #111827;
        font-size: clamp(19px, 1.8vw, 25px);
        font-weight: 800;
        letter-spacing: -.035em;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }

      .metric-detail-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        padding-top: 9px;
        margin-top: 8px;
        border-top: 1px solid #f1f5f9;
        color: #6b7280;
        font-size: 11px;
      }

      .metric-detail-row b { color: #374151; text-align: right; }
      .metric-bottom-note {
        padding-top: 11px;
        border-top: 1px solid #f1f5f9;
        color: #9ca3af;
        font-size: 11px;
      }

      .dashboard-activity-panel { overflow: hidden; }
      .activity-panel-header { margin: 0; padding: 21px 23px; border-bottom: 1px solid #eef2f7; }
      .activity-count {
        padding: 7px 10px;
        border-radius: 20px;
        background: #f1f5f9;
        color: #475569;
        font-size: 11px;
        font-weight: 750;
        white-space: nowrap;
      }

      .activity-table-wrap { width: 100%; overflow-x: auto; }
      .dashboard-activity-table { width: 100%; border-collapse: collapse; text-align: left; }
      .dashboard-activity-table th {
        padding: 13px 20px;
        background: #f8fafc;
        color: #64748b;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .07em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .dashboard-activity-table td {
        padding: 14px 20px;
        border-top: 1px solid #f1f5f9;
        color: #374151;
        font-size: 12px;
        vertical-align: middle;
      }

      .dashboard-activity-table tbody tr:hover { background: #fbfdff; }
      .activity-description-cell { display: flex; align-items: center; gap: 11px; min-width: 200px; }
      .activity-description-cell > div { display: grid; gap: 4px; min-width: 0; }
      .activity-description-cell strong {
        color: #1f2937;
        font-size: 12px;
        font-weight: 750;
        overflow-wrap: anywhere;
      }
      .activity-description-cell small { color: #9ca3af; font-size: 10px; }
      .activity-type-icon {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        font-size: 20px;
        font-weight: 750;
      }

      .activity-type-icon.is-income { background: #dcfce7; color: #15803d; }
      .activity-type-icon.is-expense { background: #fee2e2; color: #b91c1c; }
      .activity-category {
        display: inline-block;
        padding: 6px 8px;
        border-radius: 7px;
        font-size: 10px;
        font-weight: 750;
        white-space: nowrap;
      }

      .category-income { background: #f0fdf4; color: #15803d; }
      .category-expense { background: #fff1f2; color: #be123c; }
      .activity-payment { color: #475569; font-size: 11px; }
      .activity-time { color: #64748b !important; white-space: nowrap; }
      .activity-amount { font-weight: 800 !important; white-space: nowrap; text-align: right; }
      .amount-positive { color: #15803d !important; }
      .amount-negative { color: #dc2626 !important; }
      .activity-amount-heading { text-align: right; }

      .dashboard-mobile-activity { display: none; }
      .dashboard-empty-state {
        display: flex;
        min-height: 200px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 28px 20px;
        text-align: center;
      }

      .dashboard-empty-state p { margin: 8px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.5; }
      .dashboard-empty-state > strong { margin-top: 12px; color: #374151; font-size: 14px; }
      .empty-activity-icon {
        display: grid;
        place-items: center;
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: #f1f5f9;
        color: #64748b;
        font-size: 24px;
      }

      .dashboard-loading {
        display: flex;
        min-height: 50vh;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #64748b;
        font-size: 13px;
      }

      .dashboard-spinner {
        display: inline-block;
        width: 25px;
        height: 25px;
        border: 3px solid #dbeafe;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: dashboard-spin .8s linear infinite;
      }

      .dashboard-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 2px 0;
        color: #9ca3af;
        font-size: 10px;
      }

      @media (min-width: 1600px) {
        .dashboard-page { max-width: 1600px; padding-left: 30px; padding-right: 30px; }
        .dashboard-balance-grid { gap: 20px; }
        .dashboard-metrics-grid { gap: 18px; }
      }

      @media (max-width: 1100px) {
        .dashboard-page { padding: 18px; }
        .dashboard-balance-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .dashboard-total-card { grid-column: 1 / -1; min-height: 165px; }
        .dashboard-metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }

      @media (max-width: 700px) {
        .dashboard-page { padding: 15px 12px 25px; }
        .dashboard-heading { align-items: stretch; flex-direction: column; gap: 15px; margin-bottom: 20px; }
        .dashboard-heading h1 { font-size: 27px; }
        .dashboard-heading p { font-size: 12px; }
        .dashboard-heading-actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; justify-content: stretch; }
        .dashboard-date { min-width: 0; padding: 8px 10px; }
        .dashboard-date strong { white-space: normal; font-size: 11px; }
        .dashboard-refresh { min-height: 43px; padding: 0 12px; }
        .dashboard-balance-grid { grid-template-columns: minmax(0, 1fr); gap: 11px; margin-bottom: 25px; }
        .dashboard-total-card { grid-column: auto; min-height: 165px; padding: 20px; }
        .dashboard-balance-card { min-height: 150px; padding: 18px; }
        .dashboard-balance-card > strong { margin: 14px 0; font-size: 25px; }
        .dashboard-section { margin-bottom: 25px; }
        .dashboard-section-heading { align-items: flex-start; }
        .dashboard-section-heading h2, .activity-panel-header h2 { font-size: 17px; }
        .dashboard-section-heading p, .activity-panel-header p { font-size: 11px; }
        .dashboard-metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .dashboard-metric-card { padding: 14px 13px; border-radius: 13px; }
        .metric-heading { align-items: flex-start; gap: 7px; font-size: 11px; }
        .metric-icon { width: 29px; height: 29px; flex-shrink: 0; }
        .dashboard-metric-card > strong { margin: 14px 0 12px; font-size: clamp(16px, 4.4vw, 21px); }
        .metric-detail-row { font-size: 10px; }
        .dashboard-live-label { padding: 6px 8px; font-size: 9px; }
        .activity-panel-header { padding: 17px 15px; }
        .activity-count { font-size: 10px; }
        .activity-table-wrap { display: none; }
        .dashboard-mobile-activity { display: block; }
        .mobile-activity-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 14px;
          border-top: 1px solid #f1f5f9;
          min-width: 0;
        }
        .mobile-activity-main { display: flex; flex: 1; flex-direction: column; gap: 5px; min-width: 0; }
        .mobile-activity-main > strong { color: #1f2937; font-size: 12px; overflow-wrap: anywhere; }
        .mobile-activity-main > span { color: #9ca3af; font-size: 10px; line-height: 1.4; }
        .mobile-activity-row .activity-amount { font-size: 11px !important; white-space: normal; overflow-wrap: anywhere; max-width: 42%; }
        .mobile-activity-row .activity-type-icon { width: 31px; height: 31px; border-radius: 9px; }
        .dashboard-footer { align-items: flex-start; flex-direction: column; gap: 5px; font-size: 10px; }
        .dashboard-alert { align-items: flex-start; flex-direction: column; }
      }

      @media (max-width: 360px) {
        .dashboard-page { padding-left: 9px; padding-right: 9px; }
        .dashboard-metrics-grid { gap: 8px; }
        .dashboard-metric-card { padding: 12px 10px; }
        .metric-heading { font-size: 10px; }
        .dashboard-metric-card > strong { font-size: 16px; }
        .dashboard-heading-actions { grid-template-columns: minmax(0, 1fr); }
        .dashboard-refresh { width: 100%; }
      }

      @media (prefers-reduced-motion: reduce) {
        .dashboard-page *, .dashboard-page *::before, .dashboard-page *::after {
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
        }
      }
    `}</style>
  );
}
