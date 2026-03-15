import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { formatMoney } from "../utils/formatMoney";
import Navbar from "../components/Navbar";
import { useAccount } from "../context/AccountContext";

export default function Dashboard() {
  const { activeAccount } = useAccount();
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (activeAccount) {
      getSales();
      getExpenses();
    }
  }, [activeAccount]);

  async function getSales() {
    const { data } = await supabase
      .from("sales")
      .select("*")
      .eq("account_id", activeAccount.id)
      .gte("sold_at", today)
      .order("sold_at", { ascending: false });

    setSales(data || []);
  }

  async function getExpenses() {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("account_id", activeAccount.id)
      .gte("expense_date", today);

    let total = 0;
    data?.forEach(e => (total += Number(e.amount)));
    setExpenses(total);
  }

  const totalSales = sales.reduce((sum, s) => sum + Number(s.price), 0);
  const cashSales = sales.reduce(
    (sum, s) => (s.payment_mode === "Cash" ? sum + Number(s.price) : sum),
    0
  );
  const cashOnHand = cashSales - expenses;

  if (!activeAccount) return <p>Loading account...</p>;

  return (
    
    <div className="page">

      {/* ---------- NAVBAR ---------- */}
      <Navbar />
      <h1>Dashboard</h1>

      {/* ---------- SUMMARY CARDS ---------- */}
      <div className="cards">
        <div className="card card-sales">
          <h3>Today's Sales</h3>
          <p className="amount">{formatMoney(totalSales)}</p>
        </div>

        <div className="card card-expenses">
          <h3>Today's Expenses</h3>
          <p className="amount">{formatMoney(expenses)}</p>
        </div>

        <div className="card card-profit">
          <h3>Profit Today</h3>
          <p className="amount">{formatMoney(totalSales - expenses)}</p>
        </div>
      </div>

      {/* ---------- TRANSACTIONS TABLE ---------- */}
      <div className="table-container">
        <h2>Today's Transactions</h2>

        <table className="transactions-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan="3">No sales recorded today</td>
              </tr>
            )}
            {sales.map(sale => (
              <tr key={sale.id}>
                <td>{sale.item_name}</td>
                <td>{formatMoney(sale.price)}</td>
                <td>{sale.payment_mode}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* MOBILE CARDS */}
        <div className="transactions-cards">
          {sales.map(sale => (
            <div className="transaction-card" key={"s" + sale.id}>
              <p>
                <strong>Item:</strong> {sale.item_name}
              </p>
              <p>
                <strong>Price:</strong> {formatMoney(sale.price)}
              </p>
              <p>
                <strong>Payment:</strong> {sale.payment_mode}
              </p>
            </div>
          ))}
          {sales.length === 0 && <p>No sales recorded today</p>}
        </div>

        {/* DAILY SUMMARY */}
        <div className="summary">
          <p>Total Cash Sales: {formatMoney(cashSales)}</p>
          <p>Total Expenses: {formatMoney(expenses)}</p>
          <p>Cash On Hand: {formatMoney(cashOnHand)}</p>
        </div>
      </div>
    </div>
  );
}
