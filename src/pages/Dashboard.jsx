import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { formatMoney } from "../utils/formatMoney";
import Navbar from "../components/Navbar";
import { useAccount } from "../context/AccountContext";

export default function Dashboard() {

  const { activeAccount } = useAccount();

  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [remittances, setRemittances] = useState([]);
  const [bankExpenses, setBankExpenses] = useState([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (activeAccount) {
      fetchAllData();
    }
  }, [activeAccount]);

  async function fetchAllData() {
    await Promise.all([
      fetchSales(),
      fetchExpenses(),
      fetchRemittances(),
      fetchBankExpenses()
    ]);
  }

  async function fetchSales() {
    const { data } = await supabase
      .from("sales")
      .select("*")
      .eq("account_id", activeAccount.id)
      .order("sold_at", { ascending: true });

    setSales(data || []);
  }

  async function fetchExpenses() {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("account_id", activeAccount.id)
      .order("expense_date", { ascending: true });

    setExpenses(data || []);
  }

  async function fetchRemittances() {
    const { data } = await supabase
      .from("cash_remittances")
      .select("*")
      .eq("account_id", activeAccount.id)
      .order("created_at", { ascending: true });

    setRemittances(data || []);
  }

  async function fetchBankExpenses() {
    const { data } = await supabase
      .from("bank_expenses")
      .select("*")
      .eq("account_id", activeAccount.id)
      .order("created_at", { ascending: true });

    setBankExpenses(data || []);
  }

  /* ---------- DATE HELPERS ---------- */
  const isToday = (date) => date === today;
  const isBeforeToday = (date) => date < today;

  /* ---------- TODAY DATA ---------- */
  const todaySales = sales.filter(s => isToday(s.sold_at.split("T")[0]));
  const todayExpenses = expenses.filter(e => isToday(e.expense_date.split("T")[0]));
  const todayRemittances = remittances.filter(r => isToday(r.created_at.split("T")[0]));
  const todayBankExpenses = bankExpenses.filter(b => isToday(b.created_at.split("T")[0]));

  /* ---------- PREVIOUS DATA (FOR OPENING CASH) ---------- */
  const prevSales = sales.filter(s => isBeforeToday(s.sold_at.split("T")[0]));
  const prevExpenses = expenses.filter(e => isBeforeToday(e.expense_date.split("T")[0]));
  const prevRemittances = remittances.filter(r => isBeforeToday(r.created_at.split("T")[0]));

  /* ---------- OPENING CASH ---------- */
  const openingCash =
    prevSales.reduce(
      (sum, s) => s.payment_mode === "Cash" ? sum + Number(s.price) : sum,
      0
    )
    - prevExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
    - prevRemittances.reduce((sum, r) => sum + Number(r.amount), 0);

  /* ---------- TODAY TOTALS ---------- */
  const totalSales = todaySales.reduce((sum, s) => sum + Number(s.price), 0);

  const cashSales = todaySales.reduce(
    (sum, s) => s.payment_mode === "Cash" ? sum + Number(s.price) : sum,
    0
  );

  const bankSales = todaySales.reduce(
    (sum, s) => s.payment_mode === "Bank" ? sum + Number(s.price) : sum,
    0
  );

  const cashExpenses = todayExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const bankExpensesTotal = todayBankExpenses.reduce(
    (sum, b) => sum + Number(b.amount),
    0
  );

  const cashRemitted = todayRemittances.reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  /* ---------- FINAL BALANCES ---------- */
  const cashOnHand =
    openingCash + cashSales - cashExpenses - cashRemitted;

  const bankBalance =
    bankSales - bankExpensesTotal;

  const totalBalance =
    cashOnHand + bankBalance;

if (!activeAccount) return <p>Loading account...</p>;


return (
  <>
    <Navbar />

    <div className="page dashboard-page">
      <h1>Dashboard</h1>

      {/* content */}

    {/* ===== TOP KPI (MOST IMPORTANT) ===== */}
    <div className="kpi-grid">

      <div className="kpi-card highlight">
        <h3>Total Balance</h3>
        <p className={totalBalance >= 0 ? "good" : "bad"}>
          {formatMoney(totalBalance)}
        </p>
      </div>

      <div className="kpi-card">
        <h3>Cash On Hand</h3>
        <p className={cashOnHand >= 0 ? "good" : "bad"}>
          {formatMoney(cashOnHand)}
        </p>
      </div>

      <div className="kpi-card">
        <h3>Bank Balance</h3>
        <p className={bankBalance >= 0 ? "good" : "bad"}>
          {formatMoney(bankBalance)}
        </p>
      </div>

    </div>

    {/* ===== PERFORMANCE SUMMARY ===== */}
    <div className="cards-grid">

      <div className="card">
        <h3>Opening Cash</h3>
        <p className="amount">{formatMoney(openingCash)}</p>
      </div>

      <div className="card card-sales">
        <h3>Today's Sales</h3>
        <p className="amount">{formatMoney(totalSales)}</p>
      </div>

      <div className="card card-expenses">
        <h3>Cash Expenses</h3>
        <p className="amount">{formatMoney(cashExpenses)}</p>
      </div>

      <div className="card card-remittance">
        <h3>Cash Given to Boss</h3>
        <p className="amount">{formatMoney(cashRemitted)}</p>
      </div>

      <div className="card card-bank-expenses">
        <h3>Bank Expenses</h3>
        <p className="amount">{formatMoney(bankExpensesTotal)}</p>
      </div>

    </div>

    {/* ===== ACTIVITY FEED ===== */}
    <div className="table-container">
      <h2>Today's Activity</h2>

      <div className="activity-list">

        {todaySales.map(s => (
          <div className="activity-item income" key={"s" + s.id}>
            <span>Sale</span>
            <span>{s.item_name}</span>
            <span className="green">+{formatMoney(s.price)}</span>
          </div>
        ))}

        {todayExpenses.map(e => (
          <div className="activity-item expense" key={"e" + e.id}>
            <span>Expense</span>
            <span>{e.description}</span>
            <span className="red">-{formatMoney(e.amount)}</span>
          </div>
        ))}

        {todayBankExpenses.map(b => (
          <div className="activity-item expense" key={"b" + b.id}>
            <span>Bank</span>
            <span>{b.description}</span>
            <span className="red">-{formatMoney(b.amount)}</span>
          </div>
        ))}

        {todayRemittances.map(r => (
          <div className="activity-item expense" key={"r" + r.id}>
            <span>Remittance</span>
            <span>{r.note}</span>
            <span className="red">-{formatMoney(r.amount)}</span>
          </div>
        ))}

        {todaySales.length === 0 &&
         todayExpenses.length === 0 &&
         todayRemittances.length === 0 && (
          <p className="empty-state">No transactions today</p>
        )}

      </div>
    </div>
  </div>
  </>
);}
