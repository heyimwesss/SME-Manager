import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAccount } from "../context/AccountContext";
import Navbar from "../components/Navbar";

export default function Notes(){

const { activeAccount } = useAccount();

const [notes,setNotes] = useState([]);
const [showCompleted,setShowCompleted] = useState(false);

const [note,setNote] = useState("");
const [type,setType] = useState("Reminder");
const [priority,setPriority] = useState("Normal");
const [dueDate,setDueDate] = useState("");

const [editingId,setEditingId] = useState(null);


useEffect(()=>{
if(activeAccount){
fetchNotes();
}
},[activeAccount]);


async function fetchNotes(){

const { data, error } = await supabase
.from("business_notes")
.select("*")
.eq("account_id", activeAccount.id)
.order("created_at",{ascending:false});

if(error){
console.log(error);
return;
}

setNotes(data || []);

}


async function addNote(){

if(!note) return;

const { error } = await supabase
.from("business_notes")
.insert([
{
account_id:activeAccount.id,
note:note,
type:type,
priority:priority,
due_date:dueDate || null
}
]);

if(error){
console.log(error);
return;
}

setNote("");
setDueDate("");

fetchNotes();

}


async function markDone(id){

await supabase
.from("business_notes")
.update({status:"Done"})
.eq("id",id);

fetchNotes();

}


async function deleteNote(id){

await supabase
.from("business_notes")
.delete()
.eq("id",id);

fetchNotes();

}


function startEdit(n){

setEditingId(n.id);
setNote(n.note);
setType(n.type);
setPriority(n.priority);
setDueDate(n.due_date || "");

}


async function saveEdit(){

await supabase
.from("business_notes")
.update({
note:note,
type:type,
priority:priority,
due_date:dueDate || null
})
.eq("id",editingId);

setEditingId(null);
setNote("");
setDueDate("");

fetchNotes();

}


if(!activeAccount) return <p>Loading...</p>;


const activeNotes = notes.filter(n=>n.status==="Active");
const doneNotes = notes.filter(n=>n.status==="Done");


return(

<>
<Navbar/>

<div className="page">

<h1 className="notes-title">Business Notes</h1>


<div className="note-input">

<textarea
placeholder="Write a business note..."
value={note}
onChange={(e)=>setNote(e.target.value)}
/>


<select value={type} onChange={(e)=>setType(e.target.value)}>
<option>Reminder</option>
<option>Pending Pickup</option>
<option>Layby</option>
<option>Order Stock</option>
</select>


<select value={priority} onChange={(e)=>setPriority(e.target.value)}>
<option>Normal</option>
<option>Important</option>
<option>Urgent</option>
</select>


<input
type="date"
value={dueDate}
onChange={(e)=>setDueDate(e.target.value)}
/>


<button onClick={editingId ? saveEdit : addNote}>
{editingId ? "Update Note" : "Save Note"}
</button>

</div>


<h3>Active Notes</h3>


{activeNotes.map(n=>(

<div key={n.id} className="note-item">

<div className="note-header">

<span className="note-type">
{n.type}
</span>

<span className={`priority ${n.priority.toLowerCase()}`}>
{n.priority}
</span>

</div>


<p>{n.note}</p>


{n.due_date && (

<div className="due-date">

Due: {new Date(n.due_date).toLocaleDateString()}

</div>

)}


<div className="note-actions">

<button onClick={()=>startEdit(n)}>
Edit
</button>

<button onClick={()=>deleteNote(n.id)}>
Delete
</button>

<button onClick={()=>markDone(n.id)}>
Done
</button>

</div>

</div>

))}


<hr/>


<h3
style={{cursor:"pointer"}}
onClick={()=>setShowCompleted(!showCompleted)}
>
Show Completed ({doneNotes.length}) {showCompleted ? "▲":"▼"}
</h3>


{showCompleted && doneNotes.map(n=>(

<div key={n.id} className="note-item done">

<div className="note-header">

<span>{n.type}</span>

<span>Completed</span>

</div>

<p>{n.note}</p>

</div>

))}


</div>
</>

);

}