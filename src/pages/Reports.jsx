import { useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabase";
import { formatMoney } from "../utils/formatMoney";
import { toPng } from "html-to-image";
import download from "downloadjs";
import { useAccount } from "../context/AccountContext";
import Navbar from "../components/Navbar";

export default function Reports() {
  const { activeAccount } = useAccount();
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [remittances, setRemittances] = useState([]);
  const [view, setView] = useState("daily"); // daily, weekly, monthly
  const reportRef = useRef();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Current week: Sunday to Saturday
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Sunday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Saturday
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  // Month: first to last day
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  const monthEndStr = monthEnd.toISOString().split("T")[0];

  useEffect(() => {
    if (activeAccount) {
      fetchSales();
      fetchExpenses();
      fetchRemittances();
    }
  }, [activeAccount]);

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

  // Filter transactions based on view
  const filteredSales = sales.filter((s) => {
    const date = s.sold_at.split("T")[0];
    if (view === "daily") return date === todayStr;
    if (view === "weekly") return date >= weekStartStr && date <= weekEndStr;
    if (view === "monthly") return date >= monthStartStr && date <= monthEndStr;
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    const date = e.expense_date.split("T")[0];
    if (view === "daily") return date === todayStr;
    if (view === "weekly") return date >= weekStartStr && date <= weekEndStr;
    if (view === "monthly") return date >= monthStartStr && date <= monthEndStr;
    return true;
  });

  const filteredRemittances = remittances.filter((r) => {
    const date = r.created_at.split("T")[0];
    if (view === "daily") return date === todayStr;
    if (view === "weekly") return date >= weekStartStr && date <= weekEndStr;
    if (view === "monthly") return date >= monthStartStr && date <= monthEndStr;
    return true;
  });

  // Totals
  const totalSales = filteredSales.reduce((sum, s) => sum + Number(s.price), 0);
  const totalCashSales = filteredSales.reduce(
    (sum, s) => (s.payment_mode === "Cash" ? sum + Number(s.price) : sum),
    0
  );
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalRemittances = filteredRemittances.reduce((sum, r) => sum + Number(r.amount), 0);
  const profit = totalSales - totalExpenses - totalRemittances;

  // Payment breakdown
  const paymentBreakdown = filteredSales.reduce((acc, s) => {
    acc[s.payment_mode] = (acc[s.payment_mode] || 0) + Number(s.price);
    return acc;
  }, {});

  // Report range
  let reportRange = "";
  if (view === "daily") reportRange = new Date(todayStr).toLocaleDateString();
  else if (view === "weekly")
    reportRange = `${new Date(weekStartStr).toLocaleDateString()} to ${new Date(
      weekEndStr
    ).toLocaleDateString()}`;
  else if (view === "monthly")
    reportRange = `${today.toLocaleString("default", { month: "long" })} ${today.getFullYear()}`;

  const saveAsImage = () => {
    if (reportRef.current) {
      toPng(reportRef.current)
        .then((dataUrl) => download(dataUrl, `report-${view}.png`))
        .catch((err) => console.log(err));
    }
  };

  if (!activeAccount) return <p>Loading account...</p>;

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Reports - {activeAccount.name}</h1>

        <div className="form-group">
          <label>View</label>
          <select value={view} onChange={(e) => setView(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div ref={reportRef} className="report-card">
          <h2>{view.charAt(0).toUpperCase() + view.slice(1)} Report</h2>
          <p>
            <strong>Period:</strong> {reportRange}
          </p>

          <div className="summary">
            <p>
              Total Sales: <span className="monofont">{formatMoney(totalSales)}</span>
            </p>
            <p>
              Total Cash Sales: <span className="monofont">{formatMoney(totalCashSales)}</span>
            </p>
            <p>
              Total Expenses: <span className="monofont faded-red">{formatMoney(totalExpenses)}</span>
            </p>
            <p>
              Total Cash Given to Boss: <span className="monofont faded-red">{formatMoney(totalRemittances)}</span>
            </p>
            <p>
              Balance: <span className="monofont faded-green">{formatMoney(profit)}</span>
            </p>
          </div>

          <h3>Payment Breakdown</h3>
          <ul>
            {Object.entries(paymentBreakdown).map(([mode, value]) => (
              <li key={mode}>
                <span className="monofont">
                  {mode}: {formatMoney(value)}
                </span>
              </li>
            ))}
          </ul>

          <h3>Transactions</h3>
          <div className="report-table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Item / Description</th>
                  <th className="amount-col">Amount</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((s) => (
                  <tr key={"s" + s.id} className="sale-row">
                    <td>Sale</td>
                    <td>{s.item_name}</td>
                    <td className="monofont amount-col faded-green">{formatMoney(s.price)}</td>
                    <td>{s.payment_mode}</td>
                  </tr>
                ))}
                {filteredExpenses.map((e) => (
                  <tr key={"e" + e.id} className="expense-row">
                    <td>Expense</td>
                    <td>{e.description}</td>
                    <td className="monofont amount-col faded-red">{formatMoney(e.amount)}</td>
                    <td>—</td>
                  </tr>
                ))}
                {filteredRemittances.map((r) => (
                  <tr key={"r" + r.id} className="remit-row">
                    <td>Remittance</td>
                    <td>{r.note}</td>
                    <td className="monofont amount-col faded-red">-{formatMoney(r.amount)}</td>
                    <td>Cash Out</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button className="btn" style={{ marginTop: "20px" }} onClick={saveAsImage}>
          Save Report as Image
        </button>
      </div>
    </>
  );
}