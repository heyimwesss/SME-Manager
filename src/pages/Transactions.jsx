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

  // CASH IN FORM
  const [cashInAmount, setCashInAmount] = useState("");
  const [cashInNote, setCashInNote] = useState("Cash Added");

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
    await Promise.all([
      fetchSales(),
      fetchExpenses(),
      fetchRemittances(),
      fetchBankExpenses(),
    ]);
  }

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

  // FILTER
  const filter = (date) => {
    if (view === "today") return date === todayStr;
    if (view === "yesterday") return date === yesterdayStr;
    return date < yesterdayStr;
  };

  const before = (date) => {
    if (view === "today") return date < todayStr;
    if (view === "yesterday") return date < yesterdayStr;
    return false;
  };

  const filteredSales = sales.filter((s) => filter(s.sold_at.split("T")[0]));
  const filteredExpenses = expenses.filter((e) => filter(e.expense_date.split("T")[0]));
  const filteredRemittances = remittances.filter((r) => filter(r.created_at.split("T")[0]));

  // OPENING CASH
  const openingCash =
    sales.filter((s) => before(s.sold_at.split("T")[0]))
      .reduce((sum, s) => s.payment_mode === "Cash" ? sum + Number(s.price) : sum, 0)
    -
    expenses.filter((e) => before(e.expense_date.split("T")[0]))
      .reduce((sum, e) => sum + Number(e.amount), 0)
    -
    remittances.filter((r) => before(r.created_at.split("T")[0]))
      .reduce((sum, r) => sum + Number(r.amount), 0);

  // TOTALS
  const totalCashSales = filteredSales.reduce(
    (sum, s) => s.payment_mode === "Cash" ? sum + Number(s.price) : sum,
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

        {/* CASH IN */}
        <div className="form-container">
          <h2>Add Cash</h2>
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              value={cashInAmount}
              onChange={(e) => setCashInAmount(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Note</label>
            <input
              value={cashInNote}
              onChange={(e) => setCashInNote(e.target.value)}
            />
          </div>

          <button
            className="btn"
            onClick={async () => {
              if (!cashInAmount) return alert("Enter amount");

              const { data, error } = await supabase
                .from("sales")
                .insert([
                  {
                    item_name: cashInNote,
                    price: cashInAmount,
                    payment_mode: "Cash",
                    account_id: activeAccount.id,
                  },
                ])
                .select();

              if (error) return alert(error.message);

              setSales([data[0], ...sales]);
              setCashInAmount("");
            }}
          >
            Add Cash
          </button>
        </div>

        {/* EVERYTHING ELSE REMAINS SAME */}


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

        {/* BANK EXPENSE FORM */}
        <div className="form-container" style={{ marginTop: 30 }}>
          <h2>Bank Expense</h2>
          <div className="form-group">
            <label>Description</label>
            <input value={bankDesc} onChange={(e) => setBankDesc(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input type="number" value={bankAmount} onChange={(e) => setBankAmount(e.target.value)} />
          </div>
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
            <input
              type="number"
              value={remitAmount}
              max={cashOnHand}
              onChange={(e) => setRemitAmount(e.target.value)}
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

        {/* TRANSACTIONS TABLE */}
        <div className="table-container" style={{ marginTop: 30 }}>
          <h2>Transactions</h2>

          <div className="form-group">
            <label>View</label>
            <select value={view} onChange={(e) => setView(e.target.value)}>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="older">Older</option>
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
  );
}

function ExpenseForm({ onSave }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <>
      <div className="form-group">
        <label>Description</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Amount</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
}