import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { formatMoney } from "../utils/formatMoney";
import { useAccount } from "../context/AccountContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Transactions() {

  const { activeAccount } = useAccount();
  const navigate = useNavigate();

  useEffect(()=>{
    if(!activeAccount) navigate("/accounts")
  },[activeAccount,navigate])

  // SALES FORM
  const [item,setItem] = useState("")
  const [price,setPrice] = useState("")
  const [payment,setPayment] = useState("Cash")

  // REMITTANCE FORM
  const [remitAmount,setRemitAmount] = useState("")
  const [remitNote,setRemitNote] = useState("Given to boss")

  // DATA STATES
  const [sales,setSales] = useState([])
  const [expenses,setExpenses] = useState([])
  const [remittances,setRemittances] = useState([])

  const [view,setView] = useState("today")

  const todayStr = new Date().toISOString().split("T")[0]
  const yesterdayStr = new Date(Date.now()-86400000).toISOString().split("T")[0]

  useEffect(()=>{
    if(activeAccount){
      fetchSales()
      fetchExpenses()
      fetchRemittances()
    }
  },[activeAccount])

  async function fetchSales(){
    const {data} = await supabase
    .from("sales")
    .select("*")
    .eq("account_id",activeAccount.id)
    .order("sold_at",{ascending:false})

    setSales(data || [])
  }

  async function fetchExpenses(){
    const {data} = await supabase
    .from("expenses")
    .select("*")
    .eq("account_id",activeAccount.id)
    .order("expense_date",{ascending:false})

    setExpenses(data || [])
  }

  async function fetchRemittances(){
    const {data} = await supabase
    .from("cash_remittances")
    .select("*")
    .eq("account_id",activeAccount.id)
    .order("created_at",{ascending:false})

    setRemittances(data || [])
  }

  // FILTER SALES
  const filteredSales = sales.filter((s)=>{
    const date = s.sold_at.split("T")[0]
    if(view==="today") return date===todayStr
    if(view==="yesterday") return date===yesterdayStr
    return date<yesterdayStr
  })

  const filteredExpenses = expenses.filter((e)=>{
    const date = e.expense_date.split("T")[0]
    if(view==="today") return date===todayStr
    if(view==="yesterday") return date===yesterdayStr
    return date<yesterdayStr
  })

  const filteredRemittances = remittances.filter((r)=>{
    const date = r.created_at.split("T")[0]
    if(view==="today") return date===todayStr
    if(view==="yesterday") return date===yesterdayStr
    return date<yesterdayStr
  })

  // TOTALS
  const totalCashSales = filteredSales.reduce(
    (sum,s)=> s.payment_mode==="Cash" ? sum + Number(s.price) : sum ,0
  )

  const totalExpenses = filteredExpenses.reduce(
    (sum,e)=> sum + Number(e.amount),0
  )

  const totalRemittances = filteredRemittances.reduce(
    (sum,r)=> sum + Number(r.amount),0
  )

  const cashOnHand = totalCashSales - totalExpenses - totalRemittances

  if(!activeAccount) return null

  return (
<>
<Navbar/>

<div className="page">

<h1>Transactions - {activeAccount.name}</h1>

{/* SALES FORM */}
<div className="form-container">

<div className="form-group">
<label>Item Name</label>
<input value={item} onChange={e=>setItem(e.target.value)} />
</div>

<div className="form-group">
<label>Price</label>
<input type="number" value={price} onChange={e=>setPrice(e.target.value)} />
</div>

<div className="form-group">
<label>Payment Mode</label>
<select value={payment} onChange={e=>setPayment(e.target.value)}>
<option>Cash</option>
<option>Airtel Money</option>
<option>Mpamba</option>
<option>Bank</option>
</select>
</div>

<button className="btn" onClick={async()=>{

if(!item || !price) return alert("Fill all fields")

const {data,error} = await supabase
.from("sales")
.insert([{
item_name:item,
price,
payment_mode:payment,
account_id:activeAccount.id
}])
.select()

if(error) return alert("Error saving sale")

setSales([data[0],...sales])

setItem("")
setPrice("")
setPayment("Cash")

}}>
Save Sale
</button>

</div>


{/* EXPENSE FORM */}
<div className="form-container" style={{marginTop:30}}>

<h2>Add Expense</h2>

<ExpenseForm onSave={async(desc,amount)=>{

if(!desc || !amount) return alert("Fill all fields")

const {data,error} = await supabase
.from("expenses")
.insert([{
description:desc,
amount,
account_id:activeAccount.id
}])
.select()

if(error) return alert("Error saving expense")

setExpenses([data[0],...expenses])

}}/>

</div>


{/* CASH REMITTANCE */}
<div className="form-container" style={{marginTop:30}}>

<h2>Give Cash to Boss</h2>

<div className="form-group">
<label>Amount</label>
<input
type="number"
value={remitAmount}
onChange={e=>setRemitAmount(e.target.value)}
/>
</div>

<div className="form-group">
<label>Note</label>
<input
value={remitNote}
onChange={e=>setRemitNote(e.target.value)}
/>
</div>

<button className="btn" onClick={async()=>{

if(!remitAmount) return alert("Enter amount")

const {data,error} = await supabase
.from("cash_remittances")
.insert([{
amount:remitAmount,
note:remitNote,
account_id:activeAccount.id
}])
.select()

if(error) return alert("Error saving remittance")

setRemittances([data[0],...remittances])

setRemitAmount("")

}}>
Record Cash Given
</button>

</div>


{/* TRANSACTIONS TABLE */}

<div className="table-container" style={{marginTop:30}}>

<h2>Transactions</h2>

<div className="form-group">
<label>View</label>
<select value={view} onChange={e=>setView(e.target.value)}>
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
</tr>
</thead>

<tbody>

{filteredSales.map(s=>(
<tr key={"s"+s.id}>
<td>Sale</td>
<td>{s.item_name}</td>
<td className="monofont faded-green">{formatMoney(s.price)}</td>
<td>{s.payment_mode}</td>
</tr>
))}

{filteredExpenses.map(e=>(
<tr key={"e"+e.id}>
<td>Expense</td>
<td>{e.description}</td>
<td className="monofont faded-red">{formatMoney(e.amount)}</td>
<td>—</td>
</tr>
))}

{filteredRemittances.map(r=>(
<tr key={"r"+r.id}>
<td>Remittance</td>
<td>{r.note}</td>
<td className="monofont faded-red">
-{formatMoney(r.amount)}
</td>
<td>Cash Out</td>
</tr>
))}

</tbody>

</table>


<div className="summary">

<p>Total Cash Sales: {formatMoney(totalCashSales)}</p>
<p>Total Expenses: {formatMoney(totalExpenses)}</p>
<p>Cash Given to Boss: {formatMoney(totalRemittances)}</p>

<p>
Cash On Hand:
<span className="monofont">
{formatMoney(cashOnHand)}
</span>
</p>

</div>

</div>

</div>
</>
)

}

function ExpenseForm({onSave}){

const [desc,setDesc] = useState("")
const [amount,setAmount] = useState("")

return (
<>
<div className="form-group">
<label>Description</label>
<input value={desc} onChange={e=>setDesc(e.target.value)} />
</div>

<div className="form-group">
<label>Amount</label>
<input type="number" value={amount} onChange={e=>setAmount(e.target.value)} />
</div>

<button className="btn" onClick={()=>{

onSave(desc,amount)

setDesc("")
setAmount("")

}}>
Save Expense
</button>
</>
)
}