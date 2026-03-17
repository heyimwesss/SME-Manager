import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { formatMoney } from "../utils/formatMoney";
import { useAccount } from "../context/AccountContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Transactions() {

  const { activeAccount } = useAccount();
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeAccount) navigate("/accounts");
  }, [activeAccount, navigate]);

  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [payment, setPayment] = useState("Cash");

  const [remitAmount, setRemitAmount] = useState("");
  const [remitNote, setRemitNote] = useState("Given to boss");

  const [bankDesc, setBankDesc] = useState("");
  const [bankAmount, setBankAmount] = useState("");

  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [remittances, setRemittances] = useState([]);
  const [bankExpenses, setBankExpenses] = useState([]);

  const [view, setView] = useState("today");

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  useEffect(() => {
    if (activeAccount) fetchAll();
  }, [activeAccount]);

  async function fetchAll() {
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
  const isToday = (date) => date === todayStr;
  const isYesterday = (date) => date === yesterdayStr;
  const isBeforeYesterday = (date) => date < yesterdayStr;

  const filter = (date) => {
    if (view === "today") return isToday(date);
    if (view === "yesterday") return isYesterday(date);
    return isBeforeYesterday(date);
  };

  const isBeforeToday = (date) => date < todayStr;

  /* ---------- FILTERED DATA ---------- */
  const filteredSales = sales.filter(s => filter(s.sold_at.split("T")[0]));
  const filteredExpenses = expenses.filter(e => filter(e.expense_date.split("T")[0]));
  const filteredRemittances = remittances.filter(r => filter(r.created_at.split("T")[0]));
  const filteredBankExpenses = bankExpenses.filter(b => filter(b.created_at.split("T")[0]));

  /* ---------- PREVIOUS DATA ---------- */
  const prevSales = sales.filter(s => isBeforeToday(s.sold_at.split("T")[0]));
  const prevExpenses = expenses.filter(e => isBeforeToday(e.expense_date.split("T")[0]));
  const prevRemittances = remittances.filter(r => isBeforeToday(r.created_at.split("T")[0]));
  const prevBankSales = sales.filter(s => isBeforeToday(s.sold_at.split("T")[0]));
  const prevBankExpenses = bankExpenses.filter(b => isBeforeToday(b.created_at.split("T")[0]));

  /* ---------- OPENING BALANCES ---------- */
  const openingCash =
    prevSales.reduce(
      (sum, s) => s.payment_mode === "Cash" ? sum + Number(s.price) : sum,
      0
    )
    - prevExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
    - prevRemittances.reduce((sum, r) => sum + Number(r.amount), 0);

  const openingBank =
    prevBankSales.reduce(
      (sum, s) => s.payment_mode === "Bank" ? sum + Number(s.price) : sum,
      0
    )
    - prevBankExpenses.reduce((sum, b) => sum + Number(b.amount), 0);

  /* ---------- TODAY TOTALS ---------- */
  const totalCashSales = filteredSales.reduce(
    (sum, s) => s.payment_mode === "Cash" ? sum + Number(s.price) : sum,
    0
  );

  const totalBankSales = filteredSales.reduce(
    (sum, s) => s.payment_mode === "Bank" ? sum + Number(s.price) : sum,
    0
  );

  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const totalRemittances = filteredRemittances.reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  const totalBankExpenses = filteredBankExpenses.reduce(
    (sum, b) => sum + Number(b.amount),
    0
  );

  /* ---------- FINAL BALANCES ---------- */
  const cashOnHand =
    openingCash + totalCashSales - totalExpenses - totalRemittances;

  const bankBalance =
    openingBank + totalBankSales - totalBankExpenses;

  const totalBalance =
    cashOnHand + bankBalance;

  if (!activeAccount) return null;

  return (
    <>
      <Navbar />

      <div className="page">
        <h1>Transactions - {activeAccount.name}</h1>

        {/* OPENING DISPLAY */}
        <div className="summary" style={{ marginBottom: 20 }}>
          <p>Opening Cash: {formatMoney(openingCash)}</p>
          <p>Opening Bank: {formatMoney(openingBank)}</p>
        </div>

        {/* SALE FORM */}
        <div className="form-container">
          <div className="form-group">
            <label>Item Name</label>
            <input value={item} onChange={(e) => setItem(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Price</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
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

          <button
            className="btn"
            onClick={async () => {
              if (!item || !price) return alert("Fill all fields");

              const { data } = await supabase
                .from("sales")
                .insert([{ item_name: item, price, payment_mode: payment, account_id: activeAccount.id }])
                .select();

              setSales([...sales, data[0]]);
              setItem("");
              setPrice("");
            }}
          >
            Save Sale
          </button>
        </div>

        {/* CASH REMITTANCE */}
        <div className="form-container" style={{ marginTop: 30 }}>
          <h2>Give Cash to Boss</h2>

          <p>
            Available Cash:
            <span className="monofont faded-green">
              {formatMoney(cashOnHand)}
            </span>
          </p>

          <input
            type="number"
            value={remitAmount}
            max={cashOnHand}
            onChange={(e) => setRemitAmount(e.target.value)}
          />

          <button
            className="btn"
            disabled={cashOnHand <= 0 || !remitAmount}
            onClick={async () => {

              if (Number(remitAmount) > cashOnHand) {
                return alert("Not enough cash available");
              }

              const { data } = await supabase
                .from("cash_remittances")
                .insert([{ amount: remitAmount, note: remitNote, account_id: activeAccount.id }])
                .select();

              setRemittances([...remittances, data[0]]);
              setRemitAmount("");
            }}
          >
            Record Cash Given
          </button>
        </div>

        {/* SUMMARY */}
        <div className="summary" style={{ marginTop: 30 }}>
          <p>Cash On Hand: {formatMoney(cashOnHand)}</p>
          <p>Bank Balance: {formatMoney(bankBalance)}</p>
          <p>Total Balance: {formatMoney(totalBalance)}</p>
        </div>

      </div>
    </>
  );
      } 
