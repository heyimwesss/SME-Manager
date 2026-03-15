import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { formatMoney } from "../utils/formatMoney";
import { useAccount } from "../context/AccountContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Transactions() {
  const { activeAccount } = useAccount();
  const navigate = useNavigate();

  // redirect if no active account
  useEffect(() => {
    if (!activeAccount) navigate("/accounts");
  }, [activeAccount, navigate]);

  // Form state
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [payment, setPayment] = useState("Cash");

  // Transactions state
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // View selector
  const [view, setView] = useState("today");

  // Dates
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Fetch sales and expenses when account changes
  useEffect(() => {
    if (activeAccount) {
      fetchSales();
      fetchExpenses();
    }
  }, [activeAccount]);

  async function fetchSales() {
    const { data } = await supabase
      .from("sales")
      .select("*")
      .eq("account_id", activeAccount.id)
      .order("sold_at", { ascending: false });
    setSales(data || []);
  }

  async function fetchExpenses() {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("account_id", activeAccount.id)
      .order("expense_date", { ascending: false });
    setExpenses(data || []);
  }

  const filteredSales = sales.filter((s) => {
    const date = s.sold_at.split("T")[0];
    if (view === "today") return date === todayStr;
    if (view === "yesterday") return date === yesterdayStr;
    return date < yesterdayStr;
  });

  const filteredExpenses = expenses.filter((e) => {
    const date = e.expense_date.split("T")[0];
    if (view === "today") return date === todayStr;
    if (view === "yesterday") return date === yesterdayStr;
    return date < yesterdayStr;
  });

  const totalSales = filteredSales.reduce((sum, s) => sum + Number(s.price), 0);
  const totalCashSales = filteredSales.reduce((sum, s) => (s.payment_mode === "Cash" ? sum + Number(s.price) : sum), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const cashOnHand = totalCashSales - totalExpenses;

  if (!activeAccount) return null; // already redirecting

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Transactions - {activeAccount.name}</h1>

        {/* ---------- SALE FORM ---------- */}
        <div className="form-container">
          <div className="form-group">
            <label>Item Name</label>
            <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Enter item name" />
          </div>

          <div className="form-group">
            <label>Price</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter sale price" />
          </div>

          <div className="form-group">
            <label>Payment Mode</label>
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option>Cash</option>
              <option>Airtel Money</option>
              <option>Mpamba</option>
              <option>Bank</option>
            </select>
          </div>

          <button className="btn" onClick={async () => {
            if (!item || !price) return alert("Fill all fields");
            const { data, error } = await supabase
              .from("sales")
              .insert([{ item_name: item, price, payment_mode: payment, account_id: activeAccount.id }])
              .select();
            if (error) return alert("Error saving sale");
            setSales([data[0], ...sales]);
            setItem(""); setPrice(""); setPayment("Cash");
          }}>Save Sale</button>
        </div>

        {/* ---------- EXPENSE FORM ---------- */}
        <div className="form-container" style={{ marginTop: 30 }}>
          <h2>Add Expense</h2>
          <ExpenseForm onSave={async (desc, amount) => {
            if (!desc || !amount) return alert("Fill all fields");
            const { data, error } = await supabase
              .from("expenses")
              .insert([{ description: desc, amount, account_id: activeAccount.id }])
              .select();
            if (error) return alert("Error saving expense");
            setExpenses([data[0], ...expenses]);
          }} />
        </div>

        {/* ---------- TRANSACTIONS LIST ---------- */}
        <div className="table-container" style={{ marginTop: 30 }}>
          <h2>Transactions</h2>
          <div className="form-group">
            <label>View</label>
            <select value={view} onChange={(e) => setView(e.target.value)}>
              <option value="today">Today's Transactions</option>
              <option value="yesterday">Yesterday</option>
              <option value="older">Older</option>
            </select>
          </div>

          <table className="transactions-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Item/Description</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s) => (
                <tr key={"s" + s.id}>
                  <td>Sale</td>
                  <td>{s.item_name}</td>
                  <td>{formatMoney(s.price)}</td>
                  <td>{s.payment_mode}</td>
                  <td>
                    <button className="btn btn-delete" onClick={async () => {
                      if (!confirm("Delete this sale?")) return;
                      const { error } = await supabase.from("sales").delete().eq("id", s.id);
                      if (error) return alert("Error deleting sale");
                      setSales(sales.filter((x) => x.id !== s.id));
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.map((e) => (
                <tr key={"e" + e.id}>
                  <td>Expense</td>
                  <td>{e.description}</td>
                  <td>{formatMoney(e.amount)}</td>
                  <td>—</td>
                  <td>
                    <button className="btn btn-delete" onClick={async () => {
                      if (!confirm("Delete this expense?")) return;
                      const { error } = await supabase.from("expenses").delete().eq("id", e.id);
                      if (error) return alert("Error deleting expense");
                      setExpenses(expenses.filter((x) => x.id !== e.id));
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && filteredExpenses.length === 0 && (
                <tr><td colSpan="5">No transactions found</td></tr>
              )}
            </tbody>
          </table>

          <div className="summary">
            <p>Total Cash Sales: {formatMoney(totalCashSales)}</p>
            <p>Total Expenses: {formatMoney(totalExpenses)}</p>
            <p>Cash On Hand: {formatMoney(cashOnHand)}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function ExpenseForm({ onSave }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <>
      <div className="form-group">
        <label>Description</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Expense description" />
      </div>

      <div className="form-group">
        <label>Amount</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Expense amount" />
      </div>

      <button className="btn" onClick={() => { onSave(desc, amount); setDesc(""); setAmount(""); }}>
        Save Expense
      </button>
    </>
  );
}
