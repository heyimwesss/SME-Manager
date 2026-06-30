import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { formatMoney } from "../utils/formatMoney";
import { useAccount } from "../context/AccountContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useMemo } from "react";

  function MoneyInput({ value, onChange, placeholder = "0" }) {
  const formatNumber = (val) => {
    if (!val) return "";

    const cleaned = val.toString().replace(/,/g, "");

    if (isNaN(cleaned)) return "";

    return Number(cleaned).toLocaleString();
  };

  return (
    <div className="currency-input">
      <span>MWK</span>

      <input
        type="text"
        placeholder={placeholder}
        value={formatNumber(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(/,/g, "");
          if (/^\d*$/.test(raw)) {
            onChange(raw);
          }
        }}
      />
    </div>
  );
}
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
const [searchText, setSearchText] = useState("");
const [searchType, setSearchType] = useState("All");
const [selectedTx, setSelectedTx] = useState(null);
const [debouncedSearch, setDebouncedSearch] = useState("");
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");

useEffect(() => {
  const t = setTimeout(() => {
    setDebouncedSearch(searchText);
  }, 300); // 300ms is smoother

  return () => clearTimeout(t);
}, [searchText]);


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


const allTransactions = useMemo(() => {
  const txs = [
    ...sales.map((s) => ({
      id: "s" + s.id,
      type: "Sale",
      description: s.item_name,
      amount: Number(s.price),
      payment: s.payment_mode,
      date: s.sold_at,
      isExpense: false,
    })),

    ...expenses.map((e) => ({
      id: "e" + e.id,
      type: "Expense",
      description: e.description,
      amount: Number(e.amount),
      payment: "Cash",
      date: e.expense_date,
      isExpense: true,
    })),

    ...bankExpenses.map((b) => ({
      id: "b" + b.id,
      type: "Bank Expense",
      description: b.description,
      amount: Number(b.amount),
      payment: "Bank",
      date: b.created_at,
      isExpense: true,
    })),

    ...remittances.map((r) => ({
      id: "r" + r.id,
      type: "Remittance",
      description: r.note,
      amount: Number(r.amount),
      payment: "Cash Out",
      date: r.created_at,
      isExpense: true,
    })),
  ];

  return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
}, [sales, expenses, bankExpenses, remittances]);

// sort newest first
const filteredSearchResults = useMemo(() => {
  const q = debouncedSearch.toLowerCase().trim();

  const hasDateFilter = startDate || endDate;

  return allTransactions.filter((tx) => {
    const txDate = tx.date ? new Date(tx.date) : null;

    // TEXT MATCH
    const matchesText =
      !q ||
      tx.description.toLowerCase().includes(q) ||
      String(tx.amount).includes(q);

    // TYPE MATCH
    const matchesType =
      searchType === "All" || tx.type === searchType;

    // DATE RANGE MATCH
    let matchesDate = true;

    if (hasDateFilter && txDate) {
      const txDay = txDate.toISOString().split("T")[0];

      if (startDate && txDay < startDate) matchesDate = false;
      if (endDate && txDay > endDate) matchesDate = false;
    }

    return matchesText && matchesType && matchesDate;
  });
}, [debouncedSearch, searchType, startDate, endDate, allTransactions]);


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
    {/* ---------- TRANSACTION MODAL ---------- */}
    {selectedTx && (
      <div className="modal-overlay" onClick={() => setSelectedTx(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Transaction Details</h2>

          <div className="modal-row">
            <strong>Type:</strong>
            <span>{selectedTx.type}</span>
          </div>

          <div className="modal-row">
            <strong>Description:</strong>
            <span>{selectedTx.description}</span>
          </div>

          <div className="modal-row">
            <strong>Amount:</strong>
            <span className={selectedTx.isExpense ? "text-red" : "text-green"}>
              {selectedTx.isExpense ? "-" : ""}
              {formatMoney(selectedTx.amount)}
            </span>
          </div>

          <div className="modal-row">
            <strong>Payment:</strong>
            <span>{selectedTx.payment}</span>
          </div>

          <div className="modal-row">
            <strong>Date:</strong>
            <span>
              {new Date(selectedTx.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="modal-row">
            <strong>Time:</strong>
            <span>
              {new Date(selectedTx.date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <button className="btn" onClick={() => setSelectedTx(null)}>
            Close
          </button>
        </div>
      </div>
    )}

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
<MoneyInput
  value={price}
  onChange={setPrice}
/>          </div>
          <div className="form-group">
            <label>Payment Mode</label>
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option>Cash</option>
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

        {/* BANK EXPENSE FORM */}
        <div className="form-container" style={{ marginTop: 30 }}>
          <h2>Bank Expense</h2>
          <div className="form-group">
            <label>Description</label>
                        <input value={bankDesc} onChange={(e) => setBankDesc(e.target.value)} />

       </div>
          <div className="form-group">
            <label>Amount</label>
<MoneyInput
  value={bankAmount}
  onChange={setBankAmount}
/>             </div>
          <button
            className="btn"
            onClick={async () => {
              if (!bankDesc || !bankAmount) return alert("Fill all fields");

              const { data, error } = await supabase
                .from("bank_expenses")
                .insert([{ description: bankDesc, amount: bankAmount, account_id: activeAccount.id }])
                .select();

              if (error) return alert("Error saving bank expense");

              setBankExpenses([data[0], ...bankExpenses]);
              setBankDesc("");
              setBankAmount("");
            }}
          >
            Save Bank Expense
          </button>
        </div>

        {/* CASH REMITTANCE */}
        <div className="form-container" style={{ marginTop: 30 }}>
          <h2>Give Cash to Boss</h2>
          <p>
            Available Cash:{" "}
            <span className="monofont faded-green">{formatMoney(cashOnHand)}</span>
          </p>
          <div className="form-group">
            <label>Amount</label>
<MoneyInput
  value={remitAmount}
  onChange={setRemitAmount}
/>
          </div>
          <div className="form-group">
            <label>Note</label>
            <input value={remitNote} onChange={(e) => setRemitNote(e.target.value)} />
          </div>
          <button
            className="btn"
            disabled={cashOnHand <= 0 || !remitAmount}
            onClick={async () => {
              if (Number(remitAmount) > cashOnHand) {
                return alert("Cannot give more cash than available.");
              }

              const { data, error } = await supabase
                .from("cash_remittances")
                .insert([{ amount: remitAmount, note: remitNote, account_id: activeAccount.id }])
                .select();

              if (error) return alert(error.message);

              setRemittances([data[0], ...remittances]);
              setRemitAmount("");
            }}
          >
            Record Cash Given
          </button>
        </div>

{/* ---------- TRANSACTION SEARCH ---------- */}
<div className="table-container" style={{ marginTop: 30 }}>
  <h2>Search Transactions</h2>

  {/* SEARCH INPUT */}
  <div className="form-group">
    <label>Search</label>
    <input
      type="text"
      placeholder="Search by item, description, amount..."
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
    />
  </div>

<div className="form-group">
  <label>Quick Range</label>
  <select
    onChange={(e) => {
      const today = new Date();

      if (e.target.value === "7") {
        const d = new Date();
        d.setDate(today.getDate() - 7);
        setStartDate(d.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
      }

      if (e.target.value === "30") {
        const d = new Date();
        d.setDate(today.getDate() - 30);
        setStartDate(d.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
      }

      if (e.target.value === "all") {
        setStartDate("");
        setEndDate("");
      }
    }}
  >
    <option value="all">All Time</option>
    <option value="7">Last 7 Days</option>
    <option value="30">Last 30 Days</option>
  </select>
</div>

<div className="form-group">
  <label>Filter Type</label>
  <select
    value={searchType}
    onChange={(e) => setSearchType(e.target.value)}
  >
    <option value="All">All</option>
    <option value="Sale">Sale</option>
    <option value="Expense">Expense</option>
    <option value="Bank Expense">Bank Expense</option>
    <option value="Remittance">Remittance</option>
  </select>
</div>
</div>

{/* ---------- SEARCH RESULTS ---------- */}
{(searchText.trim() !== "" || searchType !== "All") && (
  <div className="table-container" style={{ marginTop: 30 }}>
    <h2>Search Results</h2>

    {filteredSearchResults.length === 0 ? (
      <p>No matching transactions found.</p>
    ) : (
      <div className="search-results-list">
{filteredSearchResults.map((tx) => {
  const dateObj = new Date(tx.date);

  return (
    <div
      key={tx.id}
      className="search-card"
      onClick={() => setSelectedTx(tx)}
      style={{ cursor: "pointer" }}
    >
      <div className="search-row top">
        <span className="search-type">{tx.type}</span>

        <span
          className={`search-amount mono ${
            tx.isExpense ? "text-red" : "text-green"
          }`}
        >
          {tx.isExpense ? "-" : "+"}
          {formatMoney(tx.amount)}
        </span>
      </div>

      <div className="search-row">
        <span className="search-label">Description</span>
        <span className="search-value mono">{tx.description}</span>
      </div>

      <div className="search-row">
        <span className="search-label">Payment</span>
        <span className="search-value mono">{tx.payment}</span>
      </div>

      <div className="search-row">
        <span className="search-label">Date</span>
        <span className="search-value mono">
          {dateObj.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="search-row">
        <span className="search-label">Time</span>
        <span className="search-value mono">
          {dateObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
})}
      </div>
    )}
  </div>
)}



        {/* TRANSACTIONS TABLE */}
        <div className="table-container" style={{ marginTop: 30 }}>
          <h2>Transactions</h2>

          <div className="form-group">
            <label>View</label>
            <select value={view} onChange={(e) => setView(e.target.value)}>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
            </select>
          </div>

          <table className="transactions-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
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
                  <td className="monofont faded-green">{formatMoney(s.price)}</td>
                  <td>{s.payment_mode}</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => deleteSale(s.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredExpenses.map((e) => (
                <tr key={"e" + e.id}>
                  <td>Expense</td>
                  <td>{e.description}</td>
                  <td className="monofont faded-red">{formatMoney(e.amount)}</td>
                  <td>—</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => deleteExpense(e.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredBankExpenses.map((b) => (
                <tr key={"b" + b.id}>
                  <td>Bank Expense</td>
                  <td>{b.description}</td>
                  <td className="monofont faded-red">{formatMoney(b.amount)}</td>
                  <td>Bank</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => deleteBankExpense(b.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredRemittances.map((r) => (
                <tr key={"r" + r.id}>
                  <td>Remittance</td>
                  <td>{r.note}</td>
                  <td className="monofont faded-red">-{formatMoney(r.amount)}</td>
                  <td>Cash Out</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => deleteRemittance(r.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 &&
                filteredExpenses.length === 0 &&
                filteredRemittances.length === 0 &&
                filteredBankExpenses.length === 0 && (
                  <tr>
                    <td colSpan="5">No transactions found</td>
                  </tr>
                )}
            </tbody>
          </table>

          <div className="summary">
            <p>Total Cash Sales: {formatMoney(totalCashSales)}</p>
            <p>Total Expenses: {formatMoney(totalExpenses)}</p>
            <p>Cash Given to Boss: {formatMoney(totalRemittances)}</p>
            <p>
              Cash On Hand:{" "}
              <span className={`monofont ${cashOnHand >= 0 ? "faded-green" : "faded-red"}`}>
                {formatMoney(cashOnHand)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  
)

function ExpenseForm({ onSave }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <>
      <div className="form-group">
        <label>Description</label>
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Amount</label>

        <MoneyInput
          value={amount}
          onChange={setAmount}
        />
      </div>

      <button
        className="btn"
        onClick={() => {
          onSave(desc, amount);
          setDesc("");
          setAmount("");
        }}
      >
        Save Expense
      </button>
    </>
  );
}}
