import { useState, type FormEvent } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Gem, LockKeyhole, LogOut, ShieldCheck, UserRound, Sparkles } from 'lucide-react';

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
function Dashboard({session,onLogout}:{session:Session;onLogout:()=>void}) {return <main className="dashboard"><div className="dashboard-card"><div className="dashboard-logo"><Gem/> SHREE JEWELLERS</div><span className="overline">WORKSPACE</span><h1>Welcome back, {session.username}</h1><p>You are signed in successfully. Your ERP dashboard will be built here.</p><p className="roles">Roles: {session.roles.length?session.roles.join(', '):'No roles assigned'}</p><button className="submit" onClick={onLogout}>Sign out <LogOut size={18}/></button></div></main>}
export default function App(){const [session,setSession]=useState<Session|null>(null);return <Routes><Route path="/login" element={session?<Navigate to="/dashboard" replace/>:<Login onLogin={setSession}/>}/><Route path="/dashboard" element={session?<Dashboard session={session} onLogout={()=>setSession(null)}/>:<Navigate to="/login" replace/>}/><Route path="*" element={<Navigate to={session?'/dashboard':'/login'} replace/>}/></Routes>}
