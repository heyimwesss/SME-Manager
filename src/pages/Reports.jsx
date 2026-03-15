import { useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabase";
import { formatMoney } from "../utils/formatMoney";
import { toPng } from "html-to-image";
import download from "downloadjs";
import { useAccount } from "../context/AccountContext";
import Navbar from "../components/Navbar";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function Reports() {

  const { activeAccount } = useAccount();

  const [sales,setSales] = useState([]);
  const [expenses,setExpenses] = useState([]);
  const [bankExpenses,setBankExpenses] = useState([]);
  const [remittances,setRemittances] = useState([]);

  const [view,setView] = useState("daily");

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
      fetchSales();
      fetchExpenses();
      fetchBankExpenses();
      fetchRemittances();
    }
  },[activeAccount]);


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


  function filterByDate(date){

    if(view==="daily") return date===todayStr;
    if(view==="weekly") return date>=weekStartStr && date<=weekEndStr;
    if(view==="monthly") return date>=monthStartStr && date<=monthEndStr;

    return true;
  }


  const filteredSales = sales.filter(s=>filterByDate(s.sold_at.split("T")[0]));
  const filteredExpenses = expenses.filter(e=>filterByDate(e.expense_date.split("T")[0]));
  const filteredBankExpenses = bankExpenses.filter(e=>filterByDate(e.created_at.split("T")[0]));
  const filteredRemittances = remittances.filter(r=>filterByDate(r.created_at.split("T")[0]));


  const totalSales = filteredSales.reduce((sum,s)=>sum+Number(s.price),0);

  const cashSales = filteredSales.reduce(
    (sum,s)=> s.payment_mode==="Cash" ? sum+Number(s.price):sum,0
  );

  const bankSales = filteredSales.reduce(
    (sum,s)=> s.payment_mode==="Bank" ? sum+Number(s.price):sum,0
  );

  const cashExpenses = filteredExpenses.reduce((sum,e)=>sum+Number(e.amount),0);

  const bankExpensesTotal = filteredBankExpenses.reduce(
    (sum,e)=>sum+Number(e.amount),0
  );

  const cashRemitted = filteredRemittances.reduce(
    (sum,r)=>sum+Number(r.amount),0
  );

  const cashBalance = cashSales - cashExpenses - cashRemitted;

  const bankBalance = bankSales - bankExpensesTotal;

  const totalBalance = cashBalance + bankBalance;


  const financeData = [
    {name:"Cash Sales",value:cashSales},
    {name:"Bank Sales",value:bankSales},
    {name:"Cash Expenses",value:cashExpenses},
    {name:"Bank Expenses",value:bankExpensesTotal}
  ];

  const balanceData = [
    {name:"Cash Balance",value:cashBalance},
    {name:"Bank Balance",value:bankBalance}
  ];


  let reportRange="";

  if(view==="daily") reportRange=new Date(todayStr).toLocaleDateString();

  if(view==="weekly")
    reportRange=`${new Date(weekStartStr).toLocaleDateString()} - ${new Date(weekEndStr).toLocaleDateString()}`;

  if(view==="monthly")
    reportRange=`${today.toLocaleString("default",{month:"long"})} ${today.getFullYear()}`;


  const saveImage=()=>{
    if(reportRef.current){
      toPng(reportRef.current)
      .then((dataUrl)=>{
        download(dataUrl,`report-${view}.png`);
      });
    }
  };


  if(!activeAccount) return <p>Loading account...</p>;

  return(

    <>
    <Navbar/>

    <div className="page">

      <h1>Financial Reports</h1>

      <div className="form-group">
        <label>Report Period</label>
        <select value={view} onChange={(e)=>setView(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>


      <div ref={reportRef} className="report-card">

        <h2>{activeAccount.name}</h2>
        <p><strong>Period:</strong> {reportRange}</p>


        {/* SUMMARY CARDS */}

        <div className="report-grid">

          <div className="report-box">
            <h4>Total Sales</h4>
            <p className="monofont faded-green">{formatMoney(totalSales)}</p>
          </div>

          <div className="report-box">
            <h4>Cash Sales</h4>
            <p className="monofont">{formatMoney(cashSales)}</p>
          </div>

          <div className="report-box">
            <h4>Bank Sales</h4>
            <p className="monofont">{formatMoney(bankSales)}</p>
          </div>

          <div className="report-box">
            <h4>Cash Expenses</h4>
            <p className="monofont faded-red">{formatMoney(cashExpenses)}</p>
          </div>

          <div className="report-box">
            <h4>Bank Expenses</h4>
            <p className="monofont faded-red">{formatMoney(bankExpensesTotal)}</p>
          </div>

          <div className="report-box">
            <h4>Cash Given to Boss</h4>
            <p className="monofont faded-red">{formatMoney(cashRemitted)}</p>
          </div>

          <div className="report-box highlight-green">
            <h4>Cash Balance</h4>
            <p className="monofont">{formatMoney(cashBalance)}</p>
          </div>

          <div className="report-box highlight-green">
            <h4>Bank Balance</h4>
            <p className="monofont">{formatMoney(bankBalance)}</p>
          </div>

          <div className="report-box highlight-total">
            <h4>Total Business Balance</h4>
            <p className="monofont">{formatMoney(totalBalance)}</p>
          </div>

        </div>


        {/* CHARTS */}

        <div className="charts-grid">

          <div className="chart-card">

            <h3>Sales vs Expenses</h3>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={financeData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="name"/>
                <YAxis/>
                <Tooltip formatter={(v)=>formatMoney(v)}/>
                <Bar dataKey="value"/>
              </BarChart>
            </ResponsiveContainer>

          </div>


          <div className="chart-card">

            <h3>Balance Distribution</h3>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>

                <Pie
                  data={balanceData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                >
                  <Cell/>
                  <Cell/>
                </Pie>

                <Tooltip formatter={(v)=>formatMoney(v)}/>

              </PieChart>
            </ResponsiveContainer>

          </div>

        </div>



        {/* TRANSACTIONS */}

        <h3 style={{marginTop:"30px"}}>Transactions</h3>

        <div className="report-table-container">

          <table className="report-table">

            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Payment</th>
                <th>Amount</th>
              </tr>
            </thead>

            <tbody>

              {filteredSales.map(s=>(
                <tr key={"s"+s.id}>
                  <td>Sale</td>
                  <td>{s.item_name}</td>
                  <td>{s.payment_mode}</td>
                  <td className="monofont faded-green">
                    {formatMoney(s.price)}
                  </td>
                </tr>
              ))}

              {filteredExpenses.map(e=>(
                <tr key={"e"+e.id}>
                  <td>Expense</td>
                  <td>{e.description}</td>
                  <td>Cash</td>
                  <td className="monofont faded-red">
                    -{formatMoney(e.amount)}
                  </td>
                </tr>
              ))}

              {filteredBankExpenses.map(e=>(
                <tr key={"b"+e.id}>
                  <td>Bank Expense</td>
                  <td>{e.description}</td>
                  <td>Bank</td>
                  <td className="monofont faded-red">
                    -{formatMoney(e.amount)}
                  </td>
                </tr>
              ))}

              {filteredRemittances.map(r=>(
                <tr key={"r"+r.id}>
                  <td>Remittance</td>
                  <td>{r.note}</td>
                  <td>Cash Out</td>
                  <td className="monofont faded-red">
                    -{formatMoney(r.amount)}
                  </td>
                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>


      <button
        className="btn"
        style={{marginTop:"20px"}}
        onClick={saveImage}
      >
        Download Report
      </button>

    </div>

    </>
  );
}