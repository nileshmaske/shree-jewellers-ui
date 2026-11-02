import {Inventory,useInventorySummary,inventoryRequest} from './Inventory';
import {useEffect} from 'react';
import { useState, type FormEvent } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Gem, LockKeyhole, LogOut, ShieldCheck, UserRound, Sparkles, LayoutDashboard, Package, ShoppingBag, Users, ChartNoAxesCombined, Settings, Menu, X, Search, AlertTriangle, CalendarDays, ChevronRight, Plus, ReceiptIndianRupee } from 'lucide-react';

type LoginResponse = { accessToken: string; tokenType: string; expiresIn: number };
type Session = { username: string; roles: string[]; accessToken: string };

async function signIn(username: string, password: string): Promise<Session> {
 const response = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) });
 if(!response.ok) throw new Error(response.status === 401 ? 'Invalid username or password.' : 'Unable to sign in. Please try again.');
 const data: LoginResponse = await response.json();
 if(!data.accessToken) throw new Error('The authentication server returned no access token.');
 const me = await fetch('/api/auth/me', {headers:{Authorization:`Bearer ${data.accessToken}`}});
 if(!me.ok) throw new Error('Could not verify your account.');
 const profile: {username:string;roles:string[]} = await me.json();
 return {username:profile.username,roles:profile.roles ?? [],accessToken:data.accessToken};
}

function Login({onLogin}:{onLogin:(session:Session)=>void}) {
 const [username,setUsername]=useState(''); const [password,setPassword]=useState('');
 const [showPassword,setShowPassword]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 const navigate=useNavigate();
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError('');
  if(!username.trim() || !password){setError('Enter your username and password.');return;}
  setBusy(true);
  try { const session=await signIn(username.trim(),password);onLogin(session);navigate('/dashboard',{replace:true}); }
  catch(e){setError(e instanceof Error?e.message:'Something went wrong.');}
  finally{setBusy(false);}
 }
 return <main className="page"><section className="intro"><div className="intro-inner"><div className="brand"><span className="brand-mark"><Gem size={25}/></span><span>SHREE <strong>JEWELLERS</strong><small>ERP SYSTEM</small></span></div><div className="intro-copy"><span className="eyebrow"><Sparkles size={15}/> A smarter way to manage brilliance</span><h1>Every detail.<br/><em>Beautifully</em><br/>managed.</h1><p>One elegant workspace for your jewellery business, from precious inventory to every customer moment.</p></div><div className="intro-bottom"><span className="line"/><p>Crafted for the business behind the brilliance.</p></div></div><div className="ornament ornament-one"/><div className="ornament ornament-two"/></section><section className="login-panel"><div className="login-wrap"><div className="mobile-brand"><Gem size={24}/> SHREE JEWELLERS</div><div className="login-head"><span className="overline">WELCOME BACK</span><h2>Sign in to your account</h2><p>Enter your credentials to access your workspace.</p></div><form onSubmit={submit}><label htmlFor="username">Username</label><div className="input-wrap"><UserRound size={18}/><input id="username" type="text" placeholder="Enter your username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required/></div><label htmlFor="password">Password</label><div className="input-wrap"><LockKeyhole size={18}/><input id="password" type={showPassword?'text':'password'} placeholder="Enter your password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="reveal" type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{error&&<div className="error" role="alert">{error}</div>}<button className="submit" type="submit" disabled={busy}>{busy?'Signing in…':'Sign in'}<ArrowRight size={18}/></button></form><div className="secure"><ShieldCheck size={17}/><span>Secure access for authorized staff only</span></div></div><p className="footer">© {new Date().getFullYear()} Shree Jewellers. All rights reserved.</p></section></main>;
}
type Section = 'Dashboard' | 'Inventory' | 'Sales' | 'Customers' | 'Reports' | 'Settings';
const navItems = [
 {label:'Dashboard', icon:LayoutDashboard},
 {label:'Inventory', icon:Package},
 {label:'Sales', icon:ShoppingBag},
 {label:'Customers', icon:Users},
 {label:'Reports', icon:ChartNoAxesCombined},
 {label:'Settings', icon:Settings}
] as const;
function Dashboard({session,onLogout}:{session:Session;onLogout:()=>void}) {
 const [section,setSection]=useState<Section>('Dashboard');
 const [sidebarOpen,setSidebarOpen]=useState(false);
 const [search,setSearch]=useState('');
 const {summary,error:inventoryError,reload:reloadInventory}=useInventorySummary(session.accessToken);
 const [rates,setRates]=useState<{gold24k:number;gold22kEstimated:number;gold18kEstimated:number;silver999:number;fetchedAt:string;source:string}|null>(null);
 const [ratesError,setRatesError]=useState('');
 useEffect(()=>{let active=true;const fetchRates=async()=>{try{const data=await inventoryRequest<{gold24k:number;gold22kEstimated:number;gold18kEstimated:number;silver999:number;fetchedAt:string;source:string}>('/metal-rates',session.accessToken);if(active){setRates(data);setRatesError('')}}catch(e){if(active)setRatesError(e instanceof Error?e.message:'Unable to fetch rates')}};void fetchRates();const timer=window.setInterval(()=>void fetchRates(),300000);return()=>{active=false;window.clearInterval(timer)}},[session.accessToken]);
 const rupees=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(value);
 const select=(next:Section)=>{setSection(next);setSidebarOpen(false);};
 const metrics=[
  {label:"Today's sales",value:'₹0',hint:'Sales service not connected',icon:ReceiptIndianRupee},
  {label:'Total products',value:summary?String(summary.totalProducts):'—',hint:inventoryError||'From Inventory Service',icon:Gem},
  {label:'Total customers',value:'0',hint:'Customer service not connected',icon:Users},
  {label:'Available products',value:summary?String(summary.availableProducts):'—',hint:inventoryError||'From Inventory Service',icon:Package}
 ];
 return <div className="erp-shell">
  {sidebarOpen&&<button className="sidebar-overlay" aria-label="Close navigation" onClick={()=>setSidebarOpen(false)}/>}
  <aside className={`erp-sidebar ${sidebarOpen?'sidebar-open':''}`}>
   <div className="erp-brand"><span className="erp-brand-icon"><Gem size={23}/></span><span>SHREE <b>JEWELLERS</b><small>MANAGEMENT SYSTEM</small></span><button className="sidebar-close" aria-label="Close menu" onClick={()=>setSidebarOpen(false)}><X size={18}/></button></div>
   <div className="nav-caption">WORKSPACE</div>
   <nav className="erp-nav" aria-label="Main navigation">{navItems.map(item=><button key={item.label} className={section===item.label?'active':''} onClick={()=>select(item.label)}><item.icon size={19}/><span>{item.label}</span>{section===item.label&&<ChevronRight size={15} className="nav-chevron"/>}</button>)}</nav>
   <div className="sidebar-bottom"><div className="sidebar-user"><span className="user-avatar">{session.username.slice(0,1).toUpperCase()}</span><span><strong>{session.username}</strong><small>{session.roles.join(', ')||'Staff'}</small></span></div><button className="sidebar-logout" onClick={onLogout}><LogOut size={18}/> Sign out</button></div>
  </aside>
  <div className="erp-main">
   <header className="erp-topbar"><div className="topbar-left"><button className="menu-toggle" aria-label="Open navigation" onClick={()=>setSidebarOpen(true)}><Menu size={22}/></button><span className="breadcrumb">Workspace</span><ChevronRight size={15}/><strong>{section}</strong></div><div className="topbar-actions"><label className="erp-search"><Search size={17}/><input aria-label="Search" placeholder="Search workspace..." value={search} onChange={e=>setSearch(e.target.value)}/></label><span className="topbar-date"><CalendarDays size={16}/>{new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span><span className="topbar-avatar">{session.username.slice(0,1).toUpperCase()}</span></div></header>
   <main className="erp-content">
    {section==='Inventory'?<Inventory token={session.accessToken} roles={session.roles} onChanged={()=>void reloadInventory()}/>:section==='Dashboard'?<>
     <div className="welcome-row"><div><span className="overline">BUSINESS OVERVIEW</span><h1>Good to see you, {session.username} <span className="wave">✦</span></h1><p>Here's your jewellery store at a glance.</p></div><span className="live-label"><span/> Live inventory</span></div>
     <section className="metal-rates-panel"><div className="metal-rates-heading"><div><span className="overline">MARKET SPOT PRICES</span><h2>Gold & Silver Rates</h2><p>INR per gram · Indicative spot rates, excluding GST, making charges and retail premiums</p></div><span className="metal-rate-source">{rates?`Updated ${new Date(rates.fetchedAt).toLocaleString("en-IN")} · ${rates.source}`:"Waiting for provider"}</span></div>{ratesError&&<p className="inventory-error" role="alert">{ratesError}{rates?" · Displaying last available rates.":""}</p>}<div className="metal-rate-grid">{[{name:"Gold 24K",value:rates?.gold24k,kind:"gold"},{name:"Gold 22K (est.)",value:rates?.gold22kEstimated,kind:"gold"},{name:"Gold 18K (est.)",value:rates?.gold18kEstimated,kind:"gold"},{name:"Silver 999",value:rates?.silver999,kind:"silver"}].map(item=><div className={`metal-rate-card ${item.kind}`} key={item.name}><span>{item.name}</span><strong>{item.value===undefined?"Unavailable":rupees(item.value)}</strong><small>per gram</small></div>)}</div></section><div className="metrics-grid">{metrics.map(metric=><article className="metric-card" key={metric.label}><div className="metric-top"><span>{metric.label}</span><span className="metric-icon"><metric.icon size={20}/></span></div><strong>{metric.value}</strong><small>{metric.hint}</small></article>)}</div>
     <div className="dashboard-columns"><section className="erp-panel"><div className="panel-heading"><div><h2>Sales overview</h2><p>Revenue and transactions</p></div><span className="panel-chip">Coming soon</span></div><div className="chart-empty"><span className="chart-symbol"><ChartNoAxesCombined size={30}/></span><strong>Sales analytics will appear here</strong><p>Connect the Sales Service to display revenue trends and transactions.</p><button onClick={()=>select('Sales')}>Explore sales <ArrowRight size={15}/></button></div></section><section className="erp-panel quick-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Get things done faster</p></div></div><button onClick={()=>select('Inventory')}><span className="quick-icon"><Plus size={20}/></span><span><strong>Add jewellery product</strong><small>Open inventory workspace</small></span><ChevronRight size={17}/></button><button onClick={()=>select('Sales')}><span className="quick-icon"><ShoppingBag size={20}/></span><span><strong>Create new sale</strong><small>Open billing workspace</small></span><ChevronRight size={17}/></button><button onClick={()=>select('Customers')}><span className="quick-icon"><Users size={20}/></span><span><strong>Manage customers</strong><small>Open customer workspace</small></span><ChevronRight size={17}/></button></section></div>
     <section className="erp-panel recent-panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Latest sales activity</p></div><button className="text-link" onClick={()=>select('Sales')}>View all <ArrowRight size={16}/></button></div><div className="empty-transactions"><ReceiptIndianRupee size={26}/><strong>No transactions to display</strong><p>Transactions will appear here after the Sales Service is integrated.</p></div></section>
    </>:<><div className="welcome-row"><div><span className="overline">SHREE JEWELLERS ERP</span><h1>{section}</h1><p>Your {section.toLowerCase()} workspace</p></div></div><section className="erp-panel module-placeholder"><span className="module-icon">{section==='Inventory'?<Package/>:section==='Sales'?<ShoppingBag/>:section==='Customers'?<Users/>:section==='Reports'?<ChartNoAxesCombined/>:<Settings/>}</span><h2>{section} module is coming next</h2><p>We'll connect this page to its dedicated backend service as we build the ERP.</p><button className="module-back" onClick={()=>select('Dashboard')}>Back to dashboard <ArrowRight size={17}/></button></section></>}
   </main>
  </div>
 </div>;
}
export default function App(){const [session,setSession]=useState<Session|null>(null);return <Routes><Route path="/login" element={session?<Navigate to="/dashboard" replace/>:<Login onLogin={setSession}/>}/><Route path="/dashboard" element={session?<Dashboard session={session} onLogout={()=>setSession(null)}/>:<Navigate to="/login" replace/>}/><Route path="*" element={<Navigate to={session?'/dashboard':'/login'} replace/>}/></Routes>}
