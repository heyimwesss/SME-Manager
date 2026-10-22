import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { formatMoney } from "../utils/formatMoney";
import { useAccount } from "../context/AccountContext";
import Navbar from "../components/Navbar";

const HISTORY_PAGE_SIZE = 20;

function NumericKeypad({ value, onChange, onEnter }) {
  const press = (key) => {
    if (key === "clear") {
      onChange("");
      return;
    }

    if (key === "back") {
      onChange(String(value || "").replace(/,/g, "").slice(0, -1));
      return;
    }

    if (key === ".") {
      if (String(value || "").includes(".")) return;
      onChange(`${value || ""}.`);
      return;
    }

    if (key === "enter") {
      onEnter?.();
      return;
    }

    const current = String(value || "").replace(/,/g, "");

    if (key === "0" && current === "0") return;

    onChange(current === "0" ? key : `${current}${key}`);
  };

  const keys = [
    "7",
    "8",
    "9",
    "4",
    "5",
    "6",
    "1",
    "2",
    "3",
    ".",
    "0",
    "back",
  ];

  return (
    <div className="numeric-keypad">
      {keys.map((key) => (
        <button
          type="button"
          key={key}
          className={`keypad-key ${
            key === "back" ? "keypad-back" : ""
          }`}
          onClick={() => press(key)}
        >
          {key === "back" ? "⌫" : key}
        </button>
      ))}

      <button
        type="button"
        className="keypad-clear"
        onClick={() => press("clear")}
      >
        Clear
      </button>

      <button
        type="button"
        className="keypad-enter"
        onClick={() => press("enter")}
      >
        Enter
      </button>
    </div>
  );
}

export default function Transactions() {
  const { activeAccount } = useAccount();

  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [remittances, setRemittances] = useState([]);
  const [bankExpenses, setBankExpenses] = useState([]);

  const [loading, setLoading] = useState(false);

  const [posMode, setPosMode] = useState("sale");

  const [itemName, setItemName] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");

  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const [bankExpenseDescription, setBankExpenseDescription] = useState("");
  const [bankExpenseAmount, setBankExpenseAmount] = useState("");

  const [remittanceAmount, setRemittanceAmount] = useState("");
  const [remittanceNote, setRemittanceNote] = useState("Given to boss");

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  function showAlert(message, type = "danger") {
    setNotice({ message: String(message), type, visible: true });
  }

  useEffect(() => {
    if (!notice) return undefined;

    const fadeTimer = window.setTimeout(() => {
      setNotice((current) =>
        current ? { ...current, visible: false } : current
      );
    }, 4500);

    const removeTimer = window.setTimeout(() => {
      setNotice(null);
    }, 5000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [notice?.message, notice?.type]);

  const [search, setSearch] = useState("");
  const [historyType, setHistoryType] = useState("All");
  const [historyRange, setHistoryRange] = useState("today");

  const [historyPage, setHistoryPage] = useState(1);
  const [pageDirection, setPageDirection] = useState("next");

  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [editingTransaction, setEditingTransaction] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    // The account context may still be restoring the selected account on refresh.
    // Stay on /transactions while that happens; fetch once an account is available.
    if (!activeAccount) return;

    fetchAllData();
  }, [activeAccount]);

  useEffect(() => {
    setHistoryPage(1);
    setPageDirection("next");
  }, [search, historyType, historyRange]);

  async function fetchAllData() {
    if (!activeAccount) return;

    setLoading(true);

    try {
      await Promise.all([
        fetchSales(),
        fetchExpenses(),
        fetchRemittances(),
        fetchBankExpenses(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSales() {
    let allSales = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("account_id", activeAccount.id)
        .order("sold_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Fetch sales error:", error);
        showAlert(error.message);
        return;
      }

      if (!data || data.length === 0) break;

      allSales = [...allSales, ...data];

      if (data.length < pageSize) break;

      from += pageSize;
    }

    setSales(allSales);
  }

  async function fetchExpenses() {
    let all = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("account_id", activeAccount.id)
        .order("expense_date", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Fetch expenses error:", error);
        showAlert(error.message);
        return;
      }

      if (!data || data.length === 0) break;

      all = [...all, ...data];

      if (data.length < pageSize) break;

      from += pageSize;
    }

    setExpenses(all);
  }

  async function fetchRemittances() {
    const { data, error } = await supabase
      .from("cash_remittances")
      .select("*")
      .eq("account_id", activeAccount.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch remittances error:", error);
      showAlert(error.message);
      return;
    }

    setRemittances(data || []);
  }

  async function fetchBankExpenses() {
    const { data, error } = await supabase
      .from("bank_expenses")
      .select("*")
      .eq("account_id", activeAccount.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch bank expenses error:", error);
      showAlert(error.message);
      return;
    }

    setBankExpenses(data || []);
  }

  async function refreshTransactions() {
    await fetchAllData();
  }

  function getDateKey(date) {
    if (!date) return "";

    return String(date).split("T")[0];
  }

  function formatDate(date) {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /*
   * ============================================================
   * DASHBOARD CASH LOGIC
   * ============================================================
   */

  const todaySales = useMemo(
    () =>
      sales.filter(
        (s) => getDateKey(s.sold_at) === today
      ),
    [sales, today]
  );

  const todayExpenses = useMemo(
    () =>
      expenses.filter(
        (e) => getDateKey(e.expense_date) === today
      ),
    [expenses, today]
  );

  const todayRemittances = useMemo(
    () =>
      remittances.filter(
        (r) => getDateKey(r.created_at) === today
      ),
    [remittances, today]
  );

  const todayBankExpenses = useMemo(
    () =>
      bankExpenses.filter(
        (b) => getDateKey(b.created_at) === today
      ),
    [bankExpenses, today]
  );

  const prevSales = useMemo(
    () =>
      sales.filter(
        (s) => getDateKey(s.sold_at) < today
      ),
    [sales, today]
  );

  const prevExpenses = useMemo(
    () =>
      expenses.filter(
        (e) => getDateKey(e.expense_date) < today
      ),
    [expenses, today]
  );

  const prevRemittances = useMemo(
    () =>
      remittances.filter(
        (r) => getDateKey(r.created_at) < today
      ),
    [remittances, today]
  );

  const openingCash = useMemo(
    () =>
      prevSales.reduce(
        (sum, s) =>
          s.payment_mode === "Cash"
            ? sum + Number(s.price)
            : sum,
        0
      ) -
      prevExpenses.reduce(
        (sum, e) => sum + Number(e.amount),
        0
      ) -
      prevRemittances.reduce(
        (sum, r) => sum + Number(r.amount),
        0
      ),
    [prevSales, prevExpenses, prevRemittances]
  );

  const cashSales = useMemo(
    () =>
      todaySales.reduce(
        (sum, s) =>
          s.payment_mode === "Cash"
            ? sum + Number(s.price)
            : sum,
        0
      ),
    [todaySales]
  );

  const bankSales = useMemo(
    () =>
      todaySales.reduce(
        (sum, s) =>
          s.payment_mode === "Bank"
            ? sum + Number(s.price)
            : sum,
        0
      ),
    [todaySales]
  );

  const cashExpenses = useMemo(
    () =>
      todayExpenses.reduce(
        (sum, e) => sum + Number(e.amount),
        0
      ),
    [todayExpenses]
  );

  const bankExpensesTotal = useMemo(
    () =>
      todayBankExpenses.reduce(
        (sum, b) => sum + Number(b.amount),
        0
      ),
    [todayBankExpenses]
  );

  const cashRemitted = useMemo(
    () =>
      todayRemittances.reduce(
        (sum, r) => sum + Number(r.amount),
        0
      ),
    [todayRemittances]
  );

  const cashOnHand =
    openingCash +
    cashSales -
    cashExpenses -
    cashRemitted;

  const bankBalance =
    bankSales - bankExpensesTotal;

  const totalBalance =
    cashOnHand + bankBalance;

  /*
   * ============================================================
   * UNIFIED TRANSACTIONS
   * ============================================================
   */

  const allTransactions = useMemo(() => {
    const rows = [];

    sales.forEach((sale) => {
      rows.push({
        id: `s${sale.id}`,
        originalId: sale.id,
        type: "Sale",
        description: sale.item_name,
        amount: Number(sale.price),
        payment: sale.payment_mode,
        date: sale.sold_at,
        isExpense: false,
        table: "sales",
        raw: sale,
      });
    });

    expenses.forEach((expense) => {
      rows.push({
        id: `e${expense.id}`,
        originalId: expense.id,
        type: "Expense",
        description: expense.description,
        amount: Number(expense.amount),
        payment: "Cash",
        date: expense.expense_date,
        isExpense: true,
        table: "expenses",
        raw: expense,
      });
    });

    bankExpenses.forEach((expense) => {
      rows.push({
        id: `b${expense.id}`,
        originalId: expense.id,
        type: "Bank Expense",
        description: expense.description,
        amount: Number(expense.amount),
        payment: "Bank",
        date: expense.created_at,
        isExpense: true,
        table: "bank_expenses",
        raw: expense,
      });
    });

    remittances.forEach((remittance) => {
      rows.push({
        id: `r${remittance.id}`,
        originalId: remittance.id,
        type: "Cash Out",
        description: remittance.note || "Cash remittance",
        amount: Number(remittance.amount),
        payment: "Cash",
        date: remittance.created_at,
        isExpense: true,
        table: "cash_remittances",
        raw: remittance,
      });
    });

    return rows.sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );
  }, [sales, expenses, bankExpenses, remittances]);

  /*
   * ============================================================
   * HISTORY FILTERING
   * ============================================================
   */

  const filteredTransactions = useMemo(() => {
    const now = new Date();

    const sevenDayCutoff = new Date(now);
    sevenDayCutoff.setHours(0, 0, 0, 0);
    sevenDayCutoff.setDate(
      sevenDayCutoff.getDate() - 6
    );

    const thirtyDayCutoff = new Date(now);
    thirtyDayCutoff.setHours(0, 0, 0, 0);
    thirtyDayCutoff.setDate(
      thirtyDayCutoff.getDate() - 29
    );

    return allTransactions.filter((transaction) => {
      const dateKey = getDateKey(transaction.date);

      if (
        historyType !== "All" &&
        transaction.type !== historyType
      ) {
        return false;
      }

      if (
        historyRange === "today" &&
        dateKey !== today
      ) {
        return false;
      }

      if (historyRange === "7") {
        const transactionDate = new Date(
          `${dateKey}T00:00:00`
        );

        if (transactionDate < sevenDayCutoff) {
          return false;
        }
      }

      if (historyRange === "30") {
        const transactionDate = new Date(
          `${dateKey}T00:00:00`
        );

        if (transactionDate < thirtyDayCutoff) {
          return false;
        }
      }

      const searchTerm = search.trim().toLowerCase();

      if (searchTerm) {
        const searchableText = [
          transaction.description,
          transaction.type,
          transaction.payment,
          transaction.amount,
          formatDate(transaction.date),
        ]
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }, [
    allTransactions,
    search,
    historyType,
    historyRange,
    today,
  ]);

  const totalHistoryPages = Math.max(
    1,
    Math.ceil(
      filteredTransactions.length /
        HISTORY_PAGE_SIZE
    )
  );

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  const paginatedTransactions = useMemo(() => {
    const start =
      (historyPage - 1) * HISTORY_PAGE_SIZE;

    return filteredTransactions.slice(
      start,
      start + HISTORY_PAGE_SIZE
    );
  }, [
    filteredTransactions,
    historyPage,
  ]);

  const firstDisplayed =
    filteredTransactions.length === 0
      ? 0
      : (historyPage - 1) *
          HISTORY_PAGE_SIZE +
        1;

  const lastDisplayed = Math.min(
    historyPage * HISTORY_PAGE_SIZE,
    filteredTransactions.length
  );

  /*
   * ============================================================
   * POS ACTIONS
   * ============================================================
   */

  function clearForm() {
    setItemName("");
    setSaleAmount("");

    setExpenseDescription("");
    setExpenseAmount("");

    setBankExpenseDescription("");
    setBankExpenseAmount("");

    setRemittanceAmount("");
    setRemittanceNote("Given to boss");

    setEditingTransaction(null);
  }

  function switchMode(mode) {
    clearForm();
    setPosMode(mode);
  }

  async function handleSale() {
    if (!itemName.trim()) {
      showAlert("Please enter the item name.");
      return;
    }

const amount = Number(saleAmount.replace(/,/g, ""));
    if (!amount || amount <= 0) {
      showAlert("Please enter a valid sale amount.");
      return;
    }

    setSaving(true);

    try {
      if (editingTransaction) {
        const { error } = await supabase
          .from("sales")
          .update({
            item_name: itemName.trim(),
            price: amount,
            payment_mode: paymentMode,
          })
          .eq("id", editingTransaction.originalId)
          .eq("account_id", activeAccount.id);

        if (error) throw error;

        showAlert("Sale updated successfully.", "success");
      } else {
        const { error } = await supabase
          .from("sales")
          .insert({
            account_id: activeAccount.id,
            item_name: itemName.trim(),
            price: amount,
            payment_mode: paymentMode,
          });

        if (error) throw error;

        showAlert("Sale recorded successfully.", "success");
      }

      clearForm();
      await refreshTransactions();
    } catch (error) {
      console.error(error);
      showAlert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExpense() {
    if (!expenseDescription.trim()) {
      showAlert("Please enter the expense description.");
      return;
    }

const amount = Number(expenseAmount.replace(/,/g, ""));
    if (!amount || amount <= 0) {
      showAlert("Please enter a valid expense amount.");
      return;
    }

    if (!editingTransaction && amount > cashOnHand) {
      showAlert(
        `Insufficient cash on hand.\n\nAvailable: ${formatMoney(
          cashOnHand
        )}`
      );
      return;
    }

    if (
      editingTransaction &&
      editingTransaction.table === "expenses"
    ) {
      const oldAmount = Number(
        editingTransaction.amount
      );

      const availableBeforeEdit =
        cashOnHand + oldAmount;

      if (amount > availableBeforeEdit) {
        showAlert(
          `Insufficient cash on hand.\n\nAvailable: ${formatMoney(
            availableBeforeEdit
          )}`
        );
        return;
      }
    }

    setSaving(true);

    try {
      if (editingTransaction) {
        const { error } = await supabase
          .from("expenses")
          .update({
            description: expenseDescription.trim(),
            amount,
          })
          .eq("id", editingTransaction.originalId)
          .eq("account_id", activeAccount.id);

        if (error) throw error;

        showAlert("Expense updated successfully.", "success");
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert({
            account_id: activeAccount.id,
            description: expenseDescription.trim(),
            amount,
          });

        if (error) throw error;

        showAlert("Expense recorded successfully.", "success");
      }

      clearForm();
      await refreshTransactions();
    } catch (error) {
      console.error(error);
      showAlert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBankExpense() {
    if (!bankExpenseDescription.trim()) {
      showAlert("Please enter the bank expense description.");
      return;
    }

const amount = Number(bankExpenseAmount.replace(/,/g, ""));
    if (!amount || amount <= 0) {
      showAlert("Please enter a valid bank expense amount.");
      return;
    }

    setSaving(true);

    try {
      if (editingTransaction) {
        const { error } = await supabase
          .from("bank_expenses")
          .update({
            description:
              bankExpenseDescription.trim(),
            amount,
          })
          .eq("id", editingTransaction.originalId)
          .eq("account_id", activeAccount.id);

        if (error) throw error;

        showAlert("Bank expense updated successfully.", "success");
      } else {
        const { error } = await supabase
          .from("bank_expenses")
          .insert({
            account_id: activeAccount.id,
            description:
              bankExpenseDescription.trim(),
            amount,
          });

        if (error) throw error;

        showAlert("Bank expense recorded successfully.", "success");
      }

      clearForm();
      await refreshTransactions();
    } catch (error) {
      console.error(error);
      showAlert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemittance() {
const amount = Number(remittanceAmount.replace(/,/g, ""));
    if (!amount || amount <= 0) {
      showAlert("Please enter a valid cash-out amount.");
      return;
    }

    let availableCash = cashOnHand;

    if (
      editingTransaction &&
      editingTransaction.table ===
        "cash_remittances"
    ) {
      availableCash += Number(
        editingTransaction.amount
      );
    }

    if (amount > availableCash) {
      showAlert(
        `Insufficient cash on hand.\n\nAvailable: ${formatMoney(
          availableCash
        )}`
      );
      return;
    }

    setSaving(true);

    try {
      if (editingTransaction) {
        const { error } = await supabase
          .from("cash_remittances")
          .update({
            amount,
            note:
              remittanceNote.trim() ||
              "Given to boss",
          })
          .eq("id", editingTransaction.originalId)
          .eq("account_id", activeAccount.id);

        if (error) throw error;

        showAlert("Cash out updated successfully.", "success");
      } else {
        const { error } = await supabase
          .from("cash_remittances")
          .insert({
            account_id: activeAccount.id,
            amount,
            note:
              remittanceNote.trim() ||
              "Given to boss",
          });

        if (error) throw error;

        showAlert("Cash out recorded successfully.", "success");
      }

      clearForm();
      await refreshTransactions();
    } catch (error) {
      console.error(error);
      showAlert(error.message);
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit() {
    if (posMode === "sale") {
      handleSale();
      return;
    }

    if (posMode === "expense") {
      handleExpense();
      return;
    }

    if (posMode === "bank-expense") {
      handleBankExpense();
      return;
    }

    if (posMode === "remittance") {
      handleRemittance();
    }
  }

  /*
   * ============================================================
   * EDIT
   * ============================================================
   */

  function startEdit(transaction) {
    if (
      getDateKey(transaction.date) !== today
    ) {
      showAlert(
        "Only today's transactions can be edited."
      );
      return;
    }

    setEditingTransaction(transaction);

    if (transaction.table === "sales") {
      setPosMode("sale");
      setItemName(transaction.raw.item_name || "");
      setSaleAmount(String(transaction.raw.price));
      setPaymentMode(
        transaction.raw.payment_mode || "Cash"
      );
    }

    if (transaction.table === "expenses") {
      setPosMode("expense");
      setExpenseDescription(
        transaction.raw.description || ""
      );
      setExpenseAmount(
        String(transaction.raw.amount)
      );
    }

    if (transaction.table === "bank_expenses") {
      setPosMode("bank-expense");
      setBankExpenseDescription(
        transaction.raw.description || ""
      );
      setBankExpenseAmount(
        String(transaction.raw.amount)
      );
    }

    if (
      transaction.table === "cash_remittances"
    ) {
      setPosMode("remittance");
      setRemittanceAmount(
        String(transaction.raw.amount)
      );
      setRemittanceNote(
        transaction.raw.note || "Given to boss"
      );
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * ============================================================
   * DELETE
   * ============================================================
   */

  async function deleteTransaction(transaction) {
    if (
      !window.confirm(
        `Delete this ${transaction.type.toLowerCase()}?\n\n${
          transaction.description
        } — ${formatMoney(transaction.amount)}`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from(transaction.table)
        .delete()
        .eq("id", transaction.originalId)
        .eq("account_id", activeAccount.id);

      if (error) throw error;

      setSelectedTransaction(null);

      if (
        editingTransaction &&
        editingTransaction.id === transaction.id
      ) {
        clearForm();
      }

      await refreshTransactions();
    } catch (error) {
      console.error(error);
      showAlert(error.message);
    }
  }

  /*
   * ============================================================
   * PAGINATION
   * ============================================================
   */

  function goNext() {
    if (historyPage >= totalHistoryPages) return;

    setPageDirection("next");
    setHistoryPage((page) => page + 1);
  }

  function goPrevious() {
    if (historyPage <= 1) return;

    setPageDirection("previous");
    setHistoryPage((page) => page - 1);
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

function formatInputAmount(value) {
  // Keep only numbers and one decimal point
  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "");

  // Prevent multiple decimal points
  const parts = cleaned.split(".");
  const integerPart = parts[0];
  const decimalPart = parts.slice(1).join("");

  // Add commas
  const formattedInteger = integerPart
    ? Number(integerPart).toLocaleString("en-US")
    : "";

  return decimalPart !== undefined && cleaned.includes(".")
    ? `${formattedInteger}.${decimalPart.slice(0, 2)}`
    : formattedInteger;
}

  return (
    <>
      <Navbar />

      <div className="transactions-page">
        {notice && (
          <div
            className={`alert alert-${notice.type} transaction-notice ${
              notice.visible ? "show" : "hide"
            }`}
            role={notice.type === "danger" ? "alert" : "status"}
            aria-live="polite"
          >
            {notice.message}
          </div>
        )}

        <section className="pos-terminal">
          <div className="pos-mode-tabs">
            <button
              type="button"
              className={posMode === "sale" ? "active" : ""}
              onClick={() => switchMode("sale")}
            >
              <span>＋</span>
              Sale
            </button>

            <button
              type="button"
              className={posMode === "expense" ? "active" : ""}
              onClick={() => switchMode("expense")}
            >
              <span>−</span>
              Expense
            </button>

            <button
              type="button"
              className={
                posMode === "bank-expense" ? "active" : ""
              }
              onClick={() => switchMode("bank-expense")}
            >
              <span>⌁</span>
              Bank Expense
            </button>

            <button
              type="button"
              className={
                posMode === "remittance" ? "active" : ""
              }
              onClick={() => switchMode("remittance")}
            >
              <span>↗</span>
              Cash Out
            </button>
          </div>

          <div className="pos-body">
            <div className="pos-form-panel">
              {editingTransaction && (
                <div className="editing-banner">
                  <div>
                    <strong>
                      Editing today's transaction
                    </strong>
                    <span>
                      Make your changes and save them.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      clearForm();
                      setPosMode("sale");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {posMode === "sale" && (
                <>
                  <div className="form-heading">
                    <div>
                      <h2>Record Sale</h2>
                      <p>
                        Enter the item and payment details.
                      </p>
                    </div>

                    <span className="form-badge sale-badge">
                      SALE
                    </span>
                  </div>

                  <label>Item / Description</label>

                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) =>
                      setItemName(e.target.value)
                    }
                    placeholder="What have we sold now?"
                    autoFocus
                  />

                  <label>Amount</label>

<input
  className="amount-input"
  type="text"
  inputMode="decimal"
  value={saleAmount}
  onChange={(e) =>
    setSaleAmount(formatInputAmount(e.target.value))
  }
  placeholder="0.00"
/>

                  <label>Payment Method</label>

                  <div className="payment-options">
                    <button
                      type="button"
                      className={
                        paymentMode === "Cash"
                          ? "selected"
                          : ""
                      }
                      onClick={() => setPaymentMode("Cash")}
                    >
                      <span>💵</span>
                      Cash
                    </button>

                    <button
                      type="button"
                      className={
                        paymentMode === "Bank"
                          ? "selected"
                          : ""
                      }
                      onClick={() => setPaymentMode("Bank")}
                    >
                      <span>🏦</span>
                      Bank
                    </button>
                  </div>

                  <button
                    type="button"
                    className="primary-action"
                    onClick={handleSale}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingTransaction
                      ? "Update Sale"
                      : "Record Sale"}
                  </button>
                </>
              )}

              {posMode === "expense" && (
                <>
                  <div className="form-heading">
                    <div>
                      <h2>Record Expense</h2>
                      <p>
                        This will reduce your cash balance.
                      </p>
                    </div>

                    <span className="form-badge expense-badge">
                      CASH
                    </span>
                  </div>

                  <label>Description</label>

                  <input
                    type="text"
                    value={expenseDescription}
                    onChange={(e) =>
                      setExpenseDescription(e.target.value)
                    }
                    placeholder="e.g. Transport"
                    autoFocus
                  />

                  <label>Amount</label>

<input
  className="amount-input"
  type="text"
  inputMode="decimal"
  value={expenseAmount}
  onChange={(e) =>
    setExpenseAmount(formatInputAmount(e.target.value))
  }
  placeholder="0.00"
/>

                  <div className="available-inline">
                    <span>Available cash</span>

                    <strong>
                      {formatMoney(cashOnHand)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="primary-action expense-action"
                    onClick={handleExpense}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingTransaction
                      ? "Update Expense"
                      : "Record Expense"}
                  </button>
                </>
              )}

              {posMode === "bank-expense" && (
                <>
                  <div className="form-heading">
                    <div>
                      <h2>Bank Expense</h2>
                      <p>
                        Record an expense paid from the bank.
                      </p>
                    </div>

                    <span className="form-badge bank-badge">
                      BANK
                    </span>
                  </div>

                  <label>Description</label>

                  <input
                    type="text"
                    value={bankExpenseDescription}
                    onChange={(e) =>
                      setBankExpenseDescription(e.target.value)
                    }
                    placeholder="e.g. Supplier payment"
                    autoFocus
                  />

                  <label>Amount</label>

<input
  className="amount-input"
  type="text"
  inputMode="decimal"
  value={bankExpenseAmount}
  onChange={(e) =>
    setBankExpenseAmount(formatInputAmount(e.target.value))
  }
  placeholder="0.00"
/>

                  <div className="available-inline">
                    <span>Current bank balance</span>

                    <strong>
                      {formatMoney(bankBalance)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="primary-action bank-action"
                    onClick={handleBankExpense}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingTransaction
                      ? "Update Bank Expense"
                      : "Record Bank Expense"}
                  </button>
                </>
              )}

              {posMode === "remittance" && (
                <>
                  <div className="form-heading">
                    <div>
                      <h2>Cash Out</h2>
                      <p>
                        Record cash removed from the business.
                      </p>
                    </div>

                    <span className="form-badge cashout-badge">
                      CASH OUT
                    </span>
                  </div>

                  <label>Amount</label>

<input
  className="amount-input"
  type="text"
  inputMode="decimal"
  value={remittanceAmount}
  onChange={(e) =>
    setRemittanceAmount(formatInputAmount(e.target.value))
  }
  placeholder="0.00"
  autoFocus
/>

                  <label>Note</label>

                  <input
                    type="text"
                    value={remittanceNote}
                    onChange={(e) =>
                      setRemittanceNote(e.target.value)
                    }
                    placeholder="Given to boss"
                  />

                  <div className="available-inline">
                    <span>
                      Available before cash out
                    </span>

                    <strong>
                      {formatMoney(
                        editingTransaction &&
                        editingTransaction.table ===
                          "cash_remittances"
                          ? cashOnHand +
                              Number(
                                editingTransaction.amount
                              )
                          : cashOnHand
                      )}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="primary-action cashout-action"
                    onClick={handleRemittance}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingTransaction
                      ? "Update Cash Out"
                      : "Record Cash Out"}
                  </button>
                </>
              )}
            </div>

            <div className="keypad-panel">
              <div className="keypad-header">
                <div>
                  <span>NUMERIC KEYPAD</span>

                  <strong>
                    {posMode === "sale"
                      ? saleAmount || "0.00"
                      : posMode === "expense"
                      ? expenseAmount || "0.00"
                      : posMode === "bank-expense"
                      ? bankExpenseAmount || "0.00"
                      : remittanceAmount || "0.00"}
                  </strong>
                </div>
              </div>

              <NumericKeypad
                value={
                  posMode === "sale"
                    ? saleAmount
                    : posMode === "expense"
                    ? expenseAmount
                    : posMode === "bank-expense"
                    ? bankExpenseAmount
                    : remittanceAmount
                }
                onChange={(value) => {
                  if (posMode === "sale") {
                    setSaleAmount(formatInputAmount(value));
                  } else if (posMode === "expense") {
                    setExpenseAmount(formatInputAmount(value));
                  } else if (posMode === "bank-expense") {
                    setBankExpenseAmount(formatInputAmount(value));
                  } else {
                    setRemittanceAmount(formatInputAmount(value));
                  }
                }}
                onEnter={handleSubmit}
              />

              <div className="cash-on-hand-card">
                <div className="cash-on-hand-label">
                  <span className="cash-icon">💵</span>

                  <div>
                    <span>Cash On Hand</span>
                    <small>Available cash balance</small>
                  </div>
                </div>

                <strong>
                  {formatMoney(cashOnHand)}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className="balance-bar">
          <div>
            <span>Today's Cash Sales</span>
            <strong>{formatMoney(cashSales)}</strong>
          </div>

          <div>
            <span>Today's Bank Sales</span>
            <strong>{formatMoney(bankSales)}</strong>
          </div>

          <div>
            <span>Today's Expenses</span>
            <strong>{formatMoney(cashExpenses)}</strong>
          </div>

          <div>
            <span>Bank Expenses</span>
            <strong>
              {formatMoney(bankExpensesTotal)}
            </strong>
          </div>

          <div>
            <span>Cash Out</span>
            <strong>{formatMoney(cashRemitted)}</strong>
          </div>

          <div className="total-balance">
            <span>Total Balance</span>
            <strong>{formatMoney(totalBalance)}</strong>
          </div>
        </section>

        <section className="history-section">
          <div className="history-header">
            <div>
              <h2>Transaction History</h2>

              <p>
                {filteredTransactions.length === 0
                  ? "No transactions found."
                  : `Showing ${firstDisplayed}–${lastDisplayed} of ${filteredTransactions.length}`}
              </p>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={refreshTransactions}
              disabled={loading}
            >
              ↻ {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="history-filters">
            <div className="search-box">
              <span>⌕</span>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions..."
              />
            </div>

            <select
              value={historyType}
              onChange={(e) =>
                setHistoryType(e.target.value)
              }
            >
              <option value="All">All Types</option>
              <option value="Sale">Sales</option>
              <option value="Expense">Expenses</option>
              <option value="Bank Expense">
                Bank Expenses
              </option>
              <option value="Cash Out">Cash Out</option>
            </select>

            <select
              value={historyRange}
              onChange={(e) =>
                setHistoryRange(e.target.value)
              }
            >
              <option value="today">Today</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="empty-history">
              <div className="empty-icon">✓</div>

              <h3>No transactions found</h3>

              <p>
                There are no transactions matching
                your current filters.
              </p>
            </div>
          ) : (
            <>
              <div className="history-page-window">
                <div
                  key={`${historyPage}-${pageDirection}`}
                  className={`history-page-slide ${pageDirection}`}
                >
                  <div className="history-table-wrap">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Description</th>
                          <th>Payment</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th></th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedTransactions.map(
                          (transaction) => {
                            const isToday =
                              getDateKey(transaction.date) ===
                              today;

                            return (
                              <tr key={transaction.id}>
                                <td>
                                  <span
                                    className={`transaction-type ${transaction.type
                                      .toLowerCase()
                                      .replace(/\s+/g, "-")}`}
                                  >
                                    {transaction.type}
                                  </span>
                                </td>

                                <td>
                                  <div className="description-cell">
                                    <strong>
                                      {
                                        transaction.description
                                      }
                                    </strong>
                                  </div>
                                </td>

                                <td>
                                  <span className="payment-tag">
                                    {transaction.payment}
                                  </span>
                                </td>

                                <td>
                                  <span className="date-cell">
                                    {formatDate(
                                      transaction.date
                                    )}
                                  </span>
                                </td>

                                <td>
                                  <strong
                                    className={
                                      transaction.isExpense
                                        ? "amount-negative"
                                        : "amount-positive"
                                    }
                                  >
                                    {transaction.isExpense
                                      ? "-"
                                      : "+"}
                                    {formatMoney(
                                      transaction.amount
                                    )}
                                  </strong>
                                </td>

                                <td>
                                  <div className="row-actions">
                                    <button
                                      type="button"
                                      className="view-button"
                                      onClick={() =>
                                        setSelectedTransaction(
                                          transaction
                                        )
                                      }
                                    >
                                      View
                                    </button>

                                    {isToday && (
                                      <button
                                        type="button"
                                        className="edit-button"
                                        onClick={() =>
                                          startEdit(
                                            transaction
                                          )
                                        }
                                      >
                                        Edit
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      className="delete-button"
                                      onClick={() =>
                                        deleteTransaction(
                                          transaction
                                        )
                                      }
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="pagination-bar">
                <button
                  type="button"
                  className="pagination-button"
                  onClick={goPrevious}
                  disabled={historyPage === 1}
                >
                  ← Previous
                </button>

                <div className="pagination-center">
                  <span>Page</span>

                  <strong>{historyPage}</strong>

                  <span>
                    of {totalHistoryPages}
                  </span>
                </div>

                <button
                  type="button"
                  className="pagination-button"
                  onClick={goNext}
                  disabled={
                    historyPage >= totalHistoryPages
                  }
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {selectedTransaction && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedTransaction(null)
          }
        >
          <div
            className="transaction-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span>Transaction Details</span>

                <h2>
                  {selectedTransaction.type}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setSelectedTransaction(null)
                }
              >
                ×
              </button>
            </div>

            <div className="modal-details">
              <div>
                <span>Description</span>

                <strong>
                  {selectedTransaction.description}
                </strong>
              </div>

              <div>
                <span>Amount</span>

                <strong
                  className={
                    selectedTransaction.isExpense
                      ? "amount-negative"
                      : "amount-positive"
                  }
                >
                  {selectedTransaction.isExpense
                    ? "-"
                    : "+"}
                  {formatMoney(
                    selectedTransaction.amount
                  )}
                </strong>
              </div>

              <div>
                <span>Payment Method</span>

                <strong>
                  {selectedTransaction.payment}
                </strong>
              </div>

              <div>
                <span>Date</span>

                <strong>
                  {formatDate(
                    selectedTransaction.date
                  )}
                </strong>
              </div>

              <div>
                <span>Transaction Type</span>

                <strong>
                  {selectedTransaction.type}
                </strong>
              </div>
            </div>

            <div className="modal-actions">
              {getDateKey(
                selectedTransaction.date
              ) === today && (
                <button
                  type="button"
                  className="modal-edit"
                  onClick={() => {
                    startEdit(selectedTransaction);
                    setSelectedTransaction(null);
                  }}
                >
                  Edit Transaction
                </button>
              )}

              <button
                type="button"
                className="modal-delete"
                onClick={() =>
                  deleteTransaction(
                    selectedTransaction
                  )
                }
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* =====================================================
           TRANSACTIONS PAGE CSS
           Everything is scoped to this page.
           ===================================================== */

        .transactions-page,
        .transactions-page *,
        .transactions-page *::before,
        .transactions-page *::after {
          box-sizing: border-box;
        }

        .transactions-page {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          padding: 18px;
          color: #111827;
        }

        /* =====================================================
           POS TERMINAL
           ===================================================== */

        .pos-terminal {
          width: 100%;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05);
        }

        .pos-mode-tabs {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          width: 100%;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
        }

        .pos-mode-tabs button {
          min-width: 0;
          min-height: 52px;
          padding: 10px 14px;
          border: 0;
          border-right: 1px solid #e5e7eb;
          background: transparent;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s ease,
                      color 0.18s ease;
        }

        .pos-mode-tabs button:last-child {
          border-right: 0;
        }

        .pos-mode-tabs button:hover {
          background: #f1f5f9;
          color: #111827;
        }

        .pos-mode-tabs button.active {
          background: #111827;
          color: #ffffff;
        }

        .pos-mode-tabs button span {
          margin-right: 7px;
          font-size: 16px;
        }

        .pos-body {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          width: 100%;
          min-height: 330px;
        }

        /* =====================================================
           FORM
           ===================================================== */

        .pos-form-panel {
          min-width: 0;
          padding: 22px;
          border-right: 1px solid #e5e7eb;
        }

        .form-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 20px;
        }

        .form-heading h2 {
          margin: 0 0 3px;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .form-heading p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .form-badge {
          flex-shrink: 0;
          padding: 5px 8px;
          border-radius: 5px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
        }

        .sale-badge {
          background: #dcfce7;
          color: #166534;
        }

        .expense-badge {
          background: #fee2e2;
          color: #991b1b;
        }

        .bank-badge {
          background: #dbeafe;
          color: #1e40af;
        }

        .cashout-badge {
          background: #fef3c7;
          color: #92400e;
        }

        .pos-form-panel label {
          display: block;
          margin: 0 0 6px;
          color: #475569;
          font-size: 11px;
          font-weight: 800;
        }

        .pos-form-panel input {
          display: block;
          width: 100%;
          height: 42px;
          margin: 0 0 15px;
          padding: 0 12px;
          border: 1px solid #dbe2ea;
          border-radius: 7px;
          outline: none;
          background: #ffffff;
          color: #111827;
          font-size: 13px;
          transition: border-color 0.15s ease,
                      box-shadow 0.15s ease;
        }

        .pos-form-panel input:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.06);
        }

        .pos-form-panel .amount-input {
          height: 52px;
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .payment-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 18px;
        }

        .payment-options button {
          min-width: 0;
          height: 42px;
          border: 1px solid #dbe2ea;
          border-radius: 7px;
          background: #3CB4DD;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .payment-options button:hover {
          background: #f8fafc;
        }

        .payment-options button.selected {
          border-color: #111827;
          background: #032734;
          color: #ffffff;
        }

        .payment-options span {
          margin-right: 5px;
        }

        .primary-action {
          width: 100%;
          height: 44px;
          border: 0;
          border-radius: 7px;
          background: #031A34;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.18s ease,
                      opacity 0.18s ease;
        }

        .primary-action:hover:not(:disabled) {
          background: #000000;
        }

        .primary-action:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .expense-action {
          background: #b91c1c;
        }

        .expense-action:hover:not(:disabled) {
          background: #991b1b;
        }

        .bank-action {
          background: #1d4ed8;
        }

        .bank-action:hover:not(:disabled) {
          background: #1e40af;
        }

        .cashout-action {
          background: #b45309;
        }

        .cashout-action:hover:not(:disabled) {
          background: #92400e;
        }

        .available-inline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          min-height: 38px;
          margin: -2px 0 15px;
          padding: 9px 11px;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          background: #f8fafc;
        }

        .available-inline span {
          color: #64748b;
          font-size: 10px;
        }

        .available-inline strong {
          flex-shrink: 0;
          color: #111827;
          font-size: 13px;
        }

        /* =====================================================
           EDITING BANNER
           ===================================================== */

        .editing-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 15px;
          padding: 9px 11px;
          border: 1px solid #bfdbfe;
          border-radius: 7px;
          background: #eff6ff;
        }

        .editing-banner div {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .editing-banner strong {
          color: #1e40af;
          font-size: 11px;
        }

        .editing-banner span {
          color: #64748b;
          font-size: 10px;
        }

        .editing-banner button {
          flex-shrink: 0;
          border: 0;
          background: transparent;
          color: #1d4ed8;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        /* =====================================================
           KEYPAD
           ===================================================== */

        .keypad-panel {
          min-width: 0;
          padding: 17px;
          background: #f8fafc;
        }

        .keypad-header {
          width: 100%;
          margin-bottom: 9px;
        }

        .keypad-header > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
        }

        .keypad-header span {
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .keypad-header strong {
          color: #111827;
          font-size: 17px;
          white-space: nowrap;
        }

        .numeric-keypad {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          width: 100%;
        }

        .keypad-key,
        .keypad-clear,
        .keypad-enter {
          min-width: 0;
          height: 42px;
          border: 1px solid #dbe2ea;
          border-radius: 6px;
          background: #ffffff;
          color: #111827;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.12s ease,
                      transform 0.12s ease;
        }

        .keypad-key:hover {
          background: #f1f5f9;
          transform: translateY(-1px);
        }

        .keypad-key:active,
        .keypad-clear:active,
        .keypad-enter:active {
          transform: translateY(0);
        }

        .keypad-back {
          color: #b91c1c;
        }

        .keypad-clear {
          grid-column: span 1;
          border-color: #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 11px;
        }

        .keypad-enter {
          grid-column: span 2;
          border-color: #111827;
          background: #111827;
          color: #ffffff;
          font-size: 11px;
        }

        .keypad-enter:hover {
          background: #000000;
        }

        /* =====================================================
           CASH ON HAND
           ===================================================== */

        .cash-on-hand-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          min-height: 76px;
          margin-top: 10px;
          padding: 12px 14px;
          border-radius: 9px;
          background: #E6AF00;
          color: #ffffff;
          box-shadow: 0 5px 14px rgba(15, 23, 42, 0.16);
        }

        .cash-on-hand-label {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .cash-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.12);
          font-size: 16px;
        }

        .cash-on-hand-label div {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .cash-on-hand-label > div > span {
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
        }

        .cash-on-hand-label small {
          margin-top: 2px;
          color: Black;
          font-size: 9px;
        }

        .cash-on-hand-card > strong {
          flex-shrink: 0;
          color: black;
          font-size: 24px;
          line-height: 1;
          letter-spacing: -0.03em;
          white-space: nowrap;
        }

        /* =====================================================
           BALANCE BAR
           ===================================================== */

        .balance-bar {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          width: 100%;
          margin-top: 10px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #ffffff;
        }

        .balance-bar > div {
          min-width: 0;
          padding: 10px 12px;
          border-right: 1px solid #e5e7eb;
        }

        .balance-bar > div:last-child {
          border-right: 0;
        }

        .balance-bar span {
          display: block;
          margin-bottom: 3px;
          overflow: hidden;
          color: #64748b;
          font-size: 9px;
          font-weight: 700;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .balance-bar strong {
          display: block;
          overflow: hidden;
          color: #111827;
          font-size: 13px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .total-balance {
          background: #f8fafc;
        }

        /* =====================================================
           HISTORY
           ===================================================== */

        .history-section {
          width: 100%;
          margin-top: 18px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
        }

        .history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 15px 17px;
          border-bottom: 1px solid #e5e7eb;
        }

        .history-header > div {
          min-width: 0;
        }

        .history-header h2 {
          margin: 0 0 3px;
          color: #111827;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .history-header p {
          margin: 0;
          color: #64748b;
          font-size: 10px;
        }

        .refresh-button {
          flex-shrink: 0;
          height: 34px;
          padding: 0 12px;
          border: 1px solid #dbe2ea;
          border-radius: 6px;
          background: #ffffff;
          color: #334155;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .refresh-button:hover {
          background: #f8fafc;
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* =====================================================
           FILTERS
           ===================================================== */

        .history-filters {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) 150px 150px;
          gap: 8px;
          padding: 11px 17px;
          border-bottom: 1px solid #e5e7eb;
          background: #f8fafc;
        }

        .search-box {
          display: flex;
          align-items: center;
          min-width: 0;
          height: 35px;
          padding: 0 10px;
          border: 1px solid #dbe2ea;
          border-radius: 6px;
          background: #ffffff;
        }

        .search-box span {
          flex-shrink: 0;
          margin-right: 7px;
          color: #64748b;
          font-size: 16px;
        }

        .search-box input {
          width: 100%;
          min-width: 0;
          height: 100%;
          padding: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #111827;
          font-size: 11px;
        }

        .history-filters select {
          width: 100%;
          min-width: 0;
          height: 35px;
          padding: 0 8px;
          border: 1px solid #dbe2ea;
          border-radius: 6px;
          outline: none;
          background: #ffffff;
          color: #334155;
          font-size: 10px;
          font-weight: 700;
        }

        /* =====================================================
           HISTORY TABLE
           ===================================================== */

        .history-page-window {
          width: 100%;
          overflow: hidden;
        }

        .history-page-slide {
          width: 100%;
        }

        .history-page-slide.next {
          animation: historySlideFromRight 0.25s ease;
        }

        .history-page-slide.previous {
          animation: historySlideFromLeft 0.25s ease;
        }

        @keyframes historySlideFromRight {
          from {
            opacity: 0.35;
            transform: translateX(42px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes historySlideFromLeft {
          from {
            opacity: 0.35;
            transform: translateX(-42px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .history-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .history-table {
          width: 100%;
          min-width: 850px;
          border-collapse: collapse;
        }

        .history-table th {
          padding: 9px 12px;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          text-align: left;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .history-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .history-table tbody tr:hover {
          background: #fafafa;
        }

        .history-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .transaction-type {
          display: inline-block;
          padding: 4px 7px;
          border-radius: 5px;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .transaction-type.sale {
          background: #dcfce7;
          color: #166534;
        }

        .transaction-type.expense {
          background: #fee2e2;
          color: #991b1b;
        }

        .transaction-type.bank-expense {
          background: #dbeafe;
          color: #1e40af;
        }

        .transaction-type.cash-out {
          background: #fef3c7;
          color: #92400e;
        }

        .description-cell {
          min-width: 150px;
          max-width: 300px;
        }

        .description-cell strong {
          display: block;
          overflow: hidden;
          color: #111827;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .payment-tag {
          color: #475569;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .date-cell {
          color: #64748b;
          font-size: 10px;
          white-space: nowrap;
        }

        .amount-positive {
          color: #15803d !important;
        }

        .amount-negative {
          color: #b91c1c !important;
        }

        .history-table td > strong {
          font-size: 11px;
          white-space: nowrap;
        }

        .row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
          white-space: nowrap;
        }

        .row-actions button {
          padding: 5px 7px;
          border: 1px solid #e2e8f0;
          border-radius: 5px;
          background: #ffffff;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .view-button {
          color: #475569;
        }

        .edit-button {
          color: #1d4ed8;
        }

        .delete-button {
          color: #b91c1c;
        }

        .row-actions button:hover {
          background: #f8fafc;
        }

        /* =====================================================
           PAGINATION
           ===================================================== */

        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 17px;
          border-top: 1px solid #e5e7eb;
          background: #f8fafc;
        }

        .pagination-button {
          height: 34px;
          padding: 0 12px;
          border: 1px solid #dbe2ea;
          border-radius: 6px;
          background: #ffffff;
          color: #334155;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .pagination-button:hover:not(:disabled) {
          border-color: #111827;
          background: #111827;
          color: #ffffff;
        }

        .pagination-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-center {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #64748b;
          font-size: 10px;
        }

        .pagination-center strong {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          border-radius: 5px;
          background: #111827;
          color: #ffffff;
          font-size: 10px;
        }

        /* =====================================================
           EMPTY STATE
           ===================================================== */

        .empty-history {
          padding: 55px 20px;
          text-align: center;
        }

        .empty-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          margin: 0 auto 10px;
          border-radius: 50%;
          background: #f1f5f9;
          color: #64748b;
          font-weight: 800;
        }

        .empty-history h3 {
          margin: 0 0 5px;
          color: #111827;
          font-size: 14px;
        }

        .empty-history p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
        }

        /* =====================================================
           MODAL
           ===================================================== */

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          padding: 20px;
          background: rgba(15, 23, 42, 0.55);
        }

        .transaction-modal {
          width: 100%;
          max-width: 430px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 17px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header > div {
          min-width: 0;
        }

        .modal-header span {
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .modal-header h2 {
          margin: 4px 0 0;
          color: #111827;
          font-size: 18px;
        }

        .modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          border: 0;
          border-radius: 5px;
          background: #f1f5f9;
          color: #475569;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }

        .modal-details {
          padding: 5px 17px;
        }

        .modal-details > div {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 11px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .modal-details > div:last-child {
          border-bottom: 0;
        }

        .modal-details span {
          flex-shrink: 0;
          color: #64748b;
          font-size: 10px;
        }

        .modal-details strong {
          max-width: 60%;
          color: #111827;
          font-size: 11px;
          text-align: right;
          word-break: break-word;
        }

        .modal-actions {
          display: flex;
          gap: 7px;
          padding: 14px 17px;
          background: #f8fafc;
        }

        .modal-actions button {
          flex: 1;
          min-width: 0;
          height: 36px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .modal-edit {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .modal-delete {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
        }

        /* =====================================================
           TABLET
           ===================================================== */

        @media (max-width: 1050px) {
          .pos-body {
            grid-template-columns: minmax(0, 1fr) 320px;
          }

          .balance-bar {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .balance-bar > div:nth-child(3n) {
            border-right: 0;
          }

          .balance-bar > div:nth-child(-n + 3) {
            border-bottom: 1px solid #e5e7eb;
          }

          .history-filters {
            grid-template-columns: minmax(180px, 1fr) 140px 140px;
          }
        }

        /* =====================================================
           SMALL TABLET / MOBILE
           ===================================================== */

        @media (max-width: 800px) {
          .transactions-page {
            padding: 10px;
          }

          .pos-mode-tabs {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pos-mode-tabs button:nth-child(2) {
            border-right: 0;
          }

          .pos-mode-tabs button:nth-child(-n + 2) {
            border-bottom: 1px solid #e5e7eb;
          }

          .pos-body {
            grid-template-columns: 1fr;
          }

          .pos-form-panel {
            border-right: 0;
            border-bottom: 1px solid #e5e7eb;
          }

          .keypad-panel {
            padding: 15px;
          }

          .balance-bar {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .balance-bar > div {
            border-right: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
          }

          .balance-bar > div:nth-child(2n) {
            border-right: 0;
          }

          .balance-bar > div:nth-child(5),
          .balance-bar > div:nth-child(6) {
            border-bottom: 0;
          }

          .history-header {
            align-items: flex-start;
          }

          .history-filters {
            grid-template-columns: 1fr;
          }

          .search-box {
            width: 100%;
          }
        }

        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 520px) {
          .transactions-page {
            padding: 7px;
          }

          .pos-mode-tabs button {
            min-height: 48px;
            padding: 8px;
            font-size: 11px;
          }

          .pos-form-panel {
            padding: 15px;
          }

          .form-heading {
            gap: 8px;
          }

          .form-heading h2 {
            font-size: 17px;
          }

          .keypad-panel {
            padding: 12px;
          }

          .cash-on-hand-card {
            min-height: 70px;
            padding: 10px 12px;
          }

          .cash-on-hand-card > strong {
            font-size: 20px;
          }

          .cash-on-hand-label small {
            display: none;
          }

          .balance-bar {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .balance-bar > div {
            padding: 9px 10px;
          }

          .history-header {
            flex-direction: column;
            align-items: stretch;
          }

          .refresh-button {
            width: 100%;
          }

          .pagination-bar {
            padding: 10px;
          }

          .pagination-button {
            padding: 0 9px;
          }

          .modal-overlay {
            padding: 10px;
          }

          .transaction-modal {
            max-height: calc(100vh - 20px);
          }

          .modal-details > div {
            flex-direction: column;
            gap: 4px;
          }

          .modal-details strong {
            max-width: 100%;
            text-align: left;
          }
        }

        /* =====================================================
           ACCESSIBILITY
           ===================================================== */

        .transactions-page button:focus-visible,
        .transactions-page input:focus-visible,
        .transactions-page select:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        .transaction-notice {
          position: sticky;
          top: 12px;
          z-index: 1100;
          margin: 0 0 14px;
          padding: 12px 16px;
          border: 1px solid transparent;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .transaction-notice.alert-success {
          color: #0f5132;
          background-color: #d1e7dd;
          border-color: #badbcc;
        }

        .transaction-notice.alert-danger {
          color: #842029;
          background-color: #f8d7da;
          border-color: #f5c2c7;
        }

        .transaction-notice.hide {
          opacity: 0;
          transform: translateY(-6px);
          pointer-events: none;
        }

        /* =====================================================
           REDUCED MOTION
           ===================================================== */

        @media (prefers-reduced-motion: reduce) {
          .transactions-page *,
          .transactions-page *::before,
          .transactions-page *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  );
}