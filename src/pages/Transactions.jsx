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

  // OPENING BALANCES
  const openingCash = Number(activeAccount?.opening_cash || 0);
  const openingBank = Number(activeAccount?.opening_bank || 0);

  // SALE FORM
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [payment, setPayment] = useState("Cash");

  // REMITTANCE
  const [remitAmount, setRemitAmount] = useState("");
  const [remitNote, setRemitNote] = useState("Given to boss");

  // BANK EXPENSE
  const [bankDesc, setBankDesc] = useState("");
  const [bankAmount, setBankAmount] = useState("");

  // DATA
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [remittances, setRemittances] = useState([]);
  const [bankExpenses, setBankExpenses] = useState([]);

  const [view, setView] = useState("today");

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  useEffect(() => {
    if (activeAccount) {
      fetchAll();
    }
  }, [activeAccount]);

  async function fetchAll() {
    const { data: s } = await supabase.from("sales").select("*").eq("account_id", activeAccount.id);
    const { data: e } = await supabase.from("expenses").select("*").eq("account_id", activeAccount.id);
    const { data: r } = await supabase.from("cash_remittances").select("*").eq("account_id", activeAccount.id);
    const { data: b } = await supabase.from("bank_expenses").select("*").eq("account_id", activeAccount.id);

    setSales(s || []);
    setExpenses(e || []);
    setRemittances(r || []);
    setBankExpenses(b || []);
  }

  // FILTER
  const filterByDate = (arr, field) =>
    arr.filter((x) => {
      const date = x[field].split("T")[0];
      if (view === "today") return date === todayStr;
      if (view === "yesterday") return date === yesterdayStr;
      return date < yesterdayStr;
    });

  const filteredSales = filterByDate(sales, "sold_at");
  const filteredExpenses = filterByDate(expenses, "expense_date");
  const filteredRemittances = filterByDate(remittances, "created_at");
  const filteredBankExpenses = filterByDate(bankExpenses, "created_at");

  // TOTALS
  const cashSales = filteredSales
    .filter((s) => s.payment_mode === "Cash")
    .reduce((sum, s) => sum + Number(s.price), 0);

  const bankSales = filteredSales
    .filter((s) => s.payment_mode !== "Cash")
    .reduce((sum, s) => sum + Number(s.price), 0);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBankExpenses = filteredBankExpenses.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalRemittances = filteredRemittances.reduce((sum, r) => sum + Number(r.amount), 0);

  // FINAL BALANCES
  const cashOnHand = openingCash + cashSales - totalExpenses - totalRemittances;
  const bankBalance = openingBank + bankSales - totalBankExpenses;

  if (!activeAccount) return null;

  return (
    <>
      <Navbar />

      <div className="page">
        <h1>Transactions - {activeAccount.name}</h1>

        {/* SALE */}
        <div className="form-container">
          <h2>Add Sale</h2>

          <input placeholder="Item" value={item} onChange={(e) => setItem(e.target.value)} />
          <input type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />

          <select value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option>Cash</option>
            <option>Airtel Money</option>
            <option>Mpamba</option>
            <option>Bank</option>
          </select>

          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!item || !price) return alert("Fill all fields");

              const { data } = await supabase
                .from("sales")
                .insert([{ item_name: item, price, payment_mode: payment, account_id: activeAccount.id }])
                .select();

              setSales([data[0], ...sales]);
              setItem("");
              setPrice("");
              setPayment("Cash");
            }}
          >
            Save Sale
          </button>
        </div>

        {/* EXPENSE */}
        <div className="form-container">
          <h2>Add Expense</h2>
          <ExpenseForm
            onSave={async (desc, amount) => {
              const { data } = await supabase
                .from("expenses")
                .insert([{ description: desc, amount, account_id: activeAccount.id }])
                .select();

              setExpenses([data[0], ...expenses]);
            }}
          />
        </div>

        {/* BANK EXPENSE */}
        <div className="form-container">
          <h2>Bank Expense</h2>

          <input placeholder="Description" value={bankDesc} onChange={(e) => setBankDesc(e.target.value)} />
          <input type="number" placeholder="Amount" value={bankAmount} onChange={(e) => setBankAmount(e.target.value)} />

          <button
            className="btn btn-warning"
            onClick={async () => {
              const { data } = await supabase
                .from("bank_expenses")
                .insert([{ description: bankDesc, amount: bankAmount, account_id: activeAccount.id }])
                .select();

              setBankExpenses([data[0], ...bankExpenses]);
              setBankDesc("");
              setBankAmount("");
            }}
          >
            Save Bank Expense
          </button>
        </div>

        {/* REMITTANCE */}
        <div className="form-container">
          <h2>Give Cash</h2>

          <p>Available: {formatMoney(cashOnHand)}</p>

          <input type="number" value={remitAmount} onChange={(e) => setRemitAmount(e.target.value)} />
          <input value={remitNote} onChange={(e) => setRemitNote(e.target.value)} />

          <button
            className="btn btn-danger"
            onClick={async () => {
              if (Number(remitAmount) > cashOnHand) return alert("Too much");

              const { data } = await supabase
                .from("cash_remittances")
                .insert([{ amount: remitAmount, note: remitNote, account_id: activeAccount.id }])
                .select();

              setRemittances([data[0], ...remittances]);
              setRemitAmount("");
            }}
          >
            Send Cash
          </button>
        </div>

        {/* SUMMARY */}
        <div className="summary">
          <p>Cash: {formatMoney(cashOnHand)}</p>
          <p>Bank: {formatMoney(bankBalance)}</p>
          <p>Total: {formatMoney(cashOnHand + bankBalance)}</p>
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
      <input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />

      <button
        className="btn btn-primary"
        onClick={() => {
          if (!desc || !amount) return alert("Fill all fields");
          onSave(desc, amount);
          setDesc("");
          setAmount("");
        }}
      >
        Save Expense
      </button>
    </>
  );
}
