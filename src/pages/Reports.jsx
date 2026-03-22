import { useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabase";
import { formatMoney } from "../utils/formatMoney";
import { toPng } from "html-to-image";
import download from "downloadjs";
import { useAccount } from "../context/AccountContext";
import Navbar from "../components/Navbar";

export default function Reports() {

const { activeAccount } = useAccount();

const [sales,setSales] = useState([]);
const [expenses,setExpenses] = useState([]);
const [bankExpenses,setBankExpenses] = useState([]);
const [remittances,setRemittances] = useState([]);

const [view,setView] = useState("daily");
const [showTransactions,setShowTransactions] = useState(false);

const reportRef = useRef();

const today = new Date();
const todayStr = today.toISOString().split("T")[0];

const weekStart = new Date(today);
weekStart.setDate(today.getDate() - today.getDay());

const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6);

const weekStartStr = weekStart.toISOString().split("T")[0];
const weekEndStr = weekEnd.toISOString().split("T")[0];

const monthStart = new Date(today.getFullYear(),today.getMonth(),1);
const monthEnd = new Date(today.getFullYear(),today.getMonth()+1,0);

const monthStartStr = monthStart.toISOString().split("T")[0];
const monthEndStr = monthEnd.toISOString().split("T")[0];

useEffect(()=>{
if(activeAccount){
fetchAll();
}
},[activeAccount]);

async function fetchAll(){
await Promise.all([
fetchSales(),
fetchExpenses(),
fetchBankExpenses(),
fetchRemittances()
]);
}

async function fetchSales(){
const {data} = await supabase
.from("sales")
.select("*")
.eq("account_id",activeAccount.id)
.order("sold_at",{ascending:true});

setSales(data || []);
}

async function fetchExpenses(){
const {data} = await supabase
.from("expenses")
.select("*")
.eq("account_id",activeAccount.id)
.order("expense_date",{ascending:true});

setExpenses(data || []);
}

async function fetchBankExpenses(){
const {data} = await supabase
.from("bank_expenses")
.select("*")
.eq("account_id",activeAccount.id)
.order("created_at",{ascending:true});

setBankExpenses(data || []);
}

async function fetchRemittances(){
const {data} = await supabase
.from("cash_remittances")
.select("*")
.eq("account_id",activeAccount.id)
.order("created_at",{ascending:true});

setRemittances(data || []);
}

/* ---------- FILTERS ---------- */
function filterByDate(date){
if(view==="daily") return date===todayStr;
if(view==="weekly") return date>=weekStartStr && date<=weekEndStr;
if(view==="monthly") return date>=monthStartStr && date<=monthEndStr;
return true;
}

function isBeforePeriod(date){
if(view==="daily") return date < todayStr;
if(view==="weekly") return date < weekStartStr;
if(view==="monthly") return date < monthStartStr;
return false;
}

/* ---------- CURRENT DATA ---------- */
const filteredSales = sales.filter(s=>filterByDate(s.sold_at.split("T")[0]));
const filteredExpenses = expenses.filter(e=>filterByDate(e.expense_date.split("T")[0]));
const filteredBankExpenses = bankExpenses.filter(e=>filterByDate(e.created_at.split("T")[0]));
const filteredRemittances = remittances.filter(r=>filterByDate(r.created_at.split("T")[0]));

/* ---------- PREVIOUS DATA ---------- */
const previousSales = sales.filter(s=>isBeforePeriod(s.sold_at.split("T")[0]));
const previousExpenses = expenses.filter(e=>isBeforePeriod(e.expense_date.split("T")[0]));
const previousRemittances = remittances.filter(r=>isBeforePeriod(r.created_at.split("T")[0]));

const previousBankSales = sales.filter(s=>isBeforePeriod(s.sold_at.split("T")[0]));
const previousBankExpenses = bankExpenses.filter(e=>isBeforePeriod(e.created_at.split("T")[0]));

/* ---------- OPENING BALANCES ---------- */
const openingCash =
previousSales.reduce(
(sum,s)=> s.payment_mode==="Cash" ? sum+Number(s.price):sum,0
)
- previousExpenses.reduce((sum,e)=>sum+Number(e.amount),0)
- previousRemittances.reduce((sum,r)=>sum+Number(r.amount),0);

const openingBank =
previousBankSales.reduce(
(sum,s)=> s.payment_mode==="Bank" ? sum+Number(s.price):sum,0
)
- previousBankExpenses.reduce((sum,e)=>sum+Number(e.amount),0);

/* ---------- CURRENT TOTALS ---------- */
const totalSales = filteredSales.reduce((sum,s)=>sum+Number(s.price),0);

const cashSales = filteredSales.reduce(
(sum,s)=> s.payment_mode==="Cash" ? sum+Number(s.price):sum,0
);

const bankSales = filteredSales.reduce(
(sum,s)=> s.payment_mode==="Bank" ? sum+Number(s.price):sum,0
);

const cashExpenses = filteredExpenses.reduce(
(sum,e)=>sum+Number(e.amount),0
);

const bankExpensesTotal = filteredBankExpenses.reduce(
(sum,e)=>sum+Number(e.amount),0
);

const cashRemitted = filteredRemittances.reduce(
(sum,r)=>sum+Number(r.amount),0
);

/* ---------- FINAL BALANCES ---------- */
const cashBalance =
openingCash + cashSales - cashExpenses - cashRemitted;

const bankBalance =
openingBank + bankSales - bankExpensesTotal;

const totalBalance =
cashBalance + bankBalance;

/* ---------- REPORT RANGE ---------- */
let reportRange="";

if(view==="daily") reportRange=new Date(todayStr).toLocaleDateString();

if(view==="weekly")
reportRange=`${new Date(weekStartStr).toLocaleDateString()} - ${new Date(weekEndStr).toLocaleDateString()}`;

if(view==="monthly")
reportRange=`${today.toLocaleString("default",{month:"long"})} ${today.getFullYear()}`;

/* ---------- DOWNLOAD ---------- */
const saveImage = async ()=>{
const prev = showTransactions;
setShowTransactions(true);

setTimeout(()=>{
if(reportRef.current){
toPng(reportRef.current).then((dataUrl)=>{
download(dataUrl,`report-${view}.png`);
setShowTransactions(prev);
});
}
},300);
};

if(!activeAccount) return <p>Loading...</p>;

return(
<>
<Navbar/>

<div className="page">

<h1>Financial Report</h1>

<select value={view} onChange={(e)=>setView(e.target.value)}>
<option value="daily">Daily</option>
<option value="weekly">Weekly</option>
<option value="monthly">Monthly</option>
</select>

<div ref={reportRef} className="receipt-report">

<h2 style={{textAlign:"center",textTransform:"uppercase"}}>
{activeAccount.name}
</h2>

<p>{reportRange}</p>

<hr/>

<h3>Opening Balances</h3>

<div className="line">
<span>Opening Cash</span>
<span>{formatMoney(openingCash)}</span>
</div>

<div className="line">
<span>Opening Bank</span>
<span>{formatMoney(openingBank)}</span>
</div>

<hr/>

<h3>Sales</h3>

<div className="line">
<span>Cash Sales</span>
<span>{formatMoney(cashSales)}</span>
</div>

<div className="line">
<span>Bank Sales</span>
<span>{formatMoney(bankSales)}</span>
</div>

<div className="line total">
<span>Total Sales</span>
<span>{formatMoney(totalSales)}</span>
</div>

<hr/>

<h3>Expenses</h3>

<div className="line red">
<span>Cash Expenses</span>
<span>-{formatMoney(cashExpenses)}</span>
</div>

<div className="line red">
<span>Bank Expenses</span>
<span>-{formatMoney(bankExpensesTotal)}</span>
</div>

<hr/>

<h3>Cash Movement</h3>

<div className="line red">
<span>Cash Given To Boss</span>
<span>-{formatMoney(cashRemitted)}</span>
</div>

<hr/>

<div className="cash-highlight">
<div>CASH ON HAND</div>
<div className="cash-amount">
{formatMoney(cashBalance)}
</div>
</div>

<hr/>

<div className="line">
<span>Bank Balance</span>
<span>{formatMoney(bankBalance)}</span>
</div>

<div className="line total">
<span>Total Balance</span>
<span>{formatMoney(totalBalance)}</span>
</div>

<hr/>

<h3 onClick={()=>setShowTransactions(!showTransactions)} style={{cursor:"pointer"}}>
Transactions {showTransactions ? "▲":"▼"}
</h3>

{showTransactions && (
<table className="receipt-table">

<thead>
<tr>
<th>Type</th>
<th>Item</th>
<th>Pay</th>
<th>Amt</th>
</tr>
</thead>

<tbody>

{filteredSales.map(s=>(
<tr key={"s"+s.id}>
<td>Sale</td>
<td>{s.item_name}</td>
<td>{s.payment_mode}</td>
<td className="green">{formatMoney(s.price)}</td>
</tr>
))}

{filteredExpenses.map(e=>(
<tr key={"e"+e.id}>
<td>Expense</td>
<td>{e.description}</td>
<td>Cash</td>
<td className="red">-{formatMoney(e.amount)}</td>
</tr>
))}

{filteredBankExpenses.map(e=>(
<tr key={"b"+e.id}>
<td>Expense</td>
<td>{e.description}</td>
<td>Bank</td>
<td className="red">-{formatMoney(e.amount)}</td>
</tr>
))}

{filteredRemittances.map(r=>(
<tr key={"r"+r.id}>
<td>Remit</td>
<td>{r.note}</td>
<td>Cash</td>
<td className="red">-{formatMoney(r.amount)}</td>
</tr>
))}

</tbody>
</table>
)}

</div>

<button onClick={saveImage}>
Download Report
</button>

</div>
</>
);
}
