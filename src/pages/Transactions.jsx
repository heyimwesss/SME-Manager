<<<<<<< HEAD
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

  // SALE FORM
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [payment, setPayment] = useState("Cash");

  // REMITTANCE FORM
  const [remitAmount, setRemitAmount] = useState("");
  const [remitNote, setRemitNote] = useState("Given to boss");

  // BANK EXPENSE FORM
  const [bankDesc, setBankDesc] = useState("");
  const [bankAmount, setBankAmount] = useState("");

  // DATA STATES
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [remittances, setRemittances] = useState([]);
  const [bankExpenses, setBankExpenses] = useState([]);

  const [view, setView] = useState("today");
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  useEffect(() => {
    if (activeAccount) {
      fetchSales();
      fetchExpenses();
      fetchRemittances();
      fetchBankExpenses();
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

  async function fetchRemittances() {
    const { data } = await supabase
      .from("cash_remittances")
      .select("*")
      .eq("account_id", activeAccount.id)
      .order("created_at", { ascending: false });
    setRemittances(data || []);
  }

  async function fetchBankExpenses() {
    const { data } = await supabase
      .from("bank_expenses")
      .select("*")
      .eq("account_id", activeAccount.id)
      .order("created_at", { ascending: false });
    setBankExpenses(data || []);
  }

  // DELETE HANDLERS
  async function deleteSale(id) {
    await supabase.from("sales").delete().eq("id", id);
    setSales(sales.filter((s) => s.id !== id));
  }

  async function deleteExpense(id) {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(expenses.filter((e) => e.id !== id));
  }

  async function deleteRemittance(id) {
    await supabase.from("cash_remittances").delete().eq("id", id);
    setRemittances(remittances.filter((r) => r.id !== id));
  }

  async function deleteBankExpense(id) {
    await supabase.from("bank_expenses").delete().eq("id", id);
    setBankExpenses(bankExpenses.filter((b) => b.id !== id));
  }

  // FILTERS
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

  const filteredRemittances = remittances.filter((r) => {
    const date = r.created_at.split("T")[0];
    if (view === "today") return date === todayStr;
    if (view === "yesterday") return date === yesterdayStr;
    return date < yesterdayStr;
  });

  const filteredBankExpenses = bankExpenses.filter((b) => {
    const date = b.created_at.split("T")[0];
    if (view === "today") return date === todayStr;
    if (view === "yesterday") return date === yesterdayStr;
    return date < yesterdayStr;
  });

  /* ---------- PREVIOUS DATA (OPENING CASH) ---------- */
  const previousSales = sales.filter((s) => {
    const date = s.sold_at.split("T")[0];
    if (view === "today") return date < todayStr;
    if (view === "yesterday") return date < yesterdayStr;
    return false;
  });

  const previousExpenses = expenses.filter((e) => {
    const date = e.expense_date.split("T")[0];
    if (view === "today") return date < todayStr;
    if (view === "yesterday") return date < yesterdayStr;
    return false;
  });

  const previousRemittances = remittances.filter((r) => {
    const date = r.created_at.split("T")[0];
    if (view === "today") return date < todayStr;
    if (view === "yesterday") return date < yesterdayStr;
    return false;
  });

  const openingCash =
    previousSales.reduce(
      (sum, s) => (s.payment_mode === "Cash" ? sum + Number(s.price) : sum),
      0
    ) -
    previousExpenses.reduce((sum, e) => sum + Number(e.amount), 0) -
    previousRemittances.reduce((sum, r) => sum + Number(r.amount), 0);

  // TOTALS
  const totalCashSales = filteredSales.reduce(
    (sum, s) => (s.payment_mode === "Cash" ? sum + Number(s.price) : sum),
    0
  );

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const totalRemittances = filteredRemittances.reduce((sum, r) => sum + Number(r.amount), 0);

  const cashOnHand =
    openingCash + totalCashSales - totalExpenses - totalRemittances;

  if (!activeAccount) return null;

  return (
    <>
      <Navbar />

      <div className="page">
        <h1>Transactions - {activeAccount.name}</h1>

        {/* ALL YOUR UI REMAINS EXACTLY THE SAME BELOW */}

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
              const { data, error } = await supabase
                .from("sales")
                .insert([{ item_name: item, price, payment_mode: payment, account_id: activeAccount.id }])
                .select();
              if (error) return alert("Error saving sale");
              setSales([data[0], ...sales]);
              setItem("");
              setPrice("");
              setPayment("Cash");
            }}
          >
            Save Sale
          </button>
        </div>

        {/* EXPENSE FORM */}
        <div className="form-container" style={{ marginTop: 30 }}>
          <h2>Add Expense</h2>
          <ExpenseForm
            onSave={async (desc, amount) => {
              if (!desc || !amount) return alert("Fill all fields");
              const { data, error } = await supabase
                .from("expenses")
                .insert([{ description: desc, amount, account_id: activeAccount.id }])
                .select();
              if (error) return alert("Error saving expense");
              setExpenses([data[0], ...expenses]);
            }}
          />
        </div>

=======
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
    
  // ✅ OPENING CASH (ADDED)
  const openingCash = Number(activeAccount?.opening_cash || 0);
    
  // SALE FORM    
  const [item, setItem] = useState("");    
  const [price, setPrice] = useState("");    
  const [payment, setPayment] = useState("Cash");    
    
  // REMITTANCE FORM    
  const [remitAmount, setRemitAmount] = useState("");    
  const [remitNote, setRemitNote] = useState("Given to boss");    
    
  // BANK EXPENSE FORM    
  const [bankDesc, setBankDesc] = useState("");    
  const [bankAmount, setBankAmount] = useState("");    
    
  // DATA STATES    
  const [sales, setSales] = useState([]);    
  const [expenses, setExpenses] = useState([]);    
  const [remittances, setRemittances] = useState([]);    
  const [bankExpenses, setBankExpenses] = useState([]);    
    
  const [view, setView] = useState("today");    
  const todayStr = new Date().toISOString().split("T")[0];    
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];    
    
  useEffect(() => {    
    if (activeAccount) {    
      fetchSales();    
      fetchExpenses();    
      fetchRemittances();    
      fetchBankExpenses();    
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
    
  async function fetchRemittances() {    
    const { data } = await supabase    
      .from("cash_remittances")    
      .select("*")    
      .eq("account_id", activeAccount.id)    
      .order("created_at", { ascending: false });    
    setRemittances(data || []);    
  }    
    
  async function fetchBankExpenses() {    
    const { data } = await supabase    
      .from("bank_expenses")    
      .select("*")    
      .eq("account_id", activeAccount.id)    
      .order("created_at", { ascending: false });    
    setBankExpenses(data || []);    
  }    
    
  // DELETE HANDLERS    
  async function deleteSale(id) {    
    await supabase.from("sales").delete().eq("id", id);    
    setSales(sales.filter((s) => s.id !== id));    
  }    
    
  async function deleteExpense(id) {    
    await supabase.from("expenses").delete().eq("id", id);    
    setExpenses(expenses.filter((e) => e.id !== id));    
  }    
    
  async function deleteRemittance(id) {    
    await supabase.from("cash_remittances").delete().eq("id", id);    
    setRemittances(remittances.filter((r) => r.id !== id));    
  }    
    
  async function deleteBankExpense(id) {    
    await supabase.from("bank_expenses").delete().eq("id", id);    
    setBankExpenses(bankExpenses.filter((b) => b.id !== id));    
  }    
    
  // FILTERS    
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
    
  const filteredRemittances = remittances.filter((r) => {    
    const date = r.created_at.split("T")[0];    
    if (view === "today") return date === todayStr;    
    if (view === "yesterday") return date === yesterdayStr;    
    return date < yesterdayStr;    
  });    
    
  const filteredBankExpenses = bankExpenses.filter((b) => {    
    const date = b.created_at.split("T")[0];    
    if (view === "today") return date === todayStr;    
    if (view === "yesterday") return date === yesterdayStr;    
    return date < yesterdayStr;    
  });    
    
  // TOTALS    
  const totalCashSales = filteredSales.reduce(    
    (sum, s) => (s.payment_mode === "Cash" ? sum + Number(s.price) : sum),    
    0    
  );    
    
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);    
  const totalRemittances = filteredRemittances.reduce((sum, r) => sum + Number(r.amount), 0);    
    
  // ✅ UPDATED CASH LOGIC (ONLY CHANGE THAT MATTERS)
  const cashOnHand = openingCash + totalCashSales - totalExpenses - totalRemittances;    
    
  if (!activeAccount) return null;    
    
  return (    
    <>    
      <Navbar />    
    
      <div className="page">    
        <h1>Transactions - {activeAccount.name}</h1>    
    
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
              const { data, error } = await supabase    
                .from("sales")    
                .insert([{ item_name: item, price, payment_mode: payment, account_id: activeAccount.id }])    
                .select();    
              if (error) return alert("Error saving sale");    
              setSales([data[0], ...sales]);    
              setItem("");    
              setPrice("");    
              setPayment("Cash");    
            }}    
          >    
            Save Sale    
          </button>    
        </div>    
    
        {/* EXPENSE FORM */}    
        <div className="form-container" style={{ marginTop: 30 }}>    
          <h2>Add Expense</h2>    
          <ExpenseForm    
            onSave={async (desc, amount) => {    
              if (!desc || !amount) return alert("Fill all fields");    
              const { data, error } = await supabase    
                .from("expenses")    
                .insert([{ description: desc, amount, account_id: activeAccount.id }])    
                .select();    
              if (error) return alert("Error saving expense");    
              setExpenses([data[0], ...expenses]);    
            }}    
          />    
        </div>    
    
>>>>>>> ab761d0fb4789494880ad5b937ea8b2080f28112
        {/* BANK EXPENSE FORM */}
        {/* (UNCHANGED BELOW) */}
