import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bookmark, Boxes, CalendarDays, ChartNoAxesCombined, ChevronRight,
  CircleAlert, CircleCheck, Eye, EyeOff, Gem, LayoutDashboard, LockKeyhole,
  LogOut, Menu, Package, Plus, ReceiptIndianRupee, Settings, ShieldCheck,
  ShoppingBag, UserRound, Users, X,
} from 'lucide-react';
import { Billing } from './Billing';
import { Inventory, inventoryRequest, useInventorySummary } from './Inventory';
import { formatINR } from './format';

type LoginResponse = { accessToken: string };
type Session = { username: string; roles: string[]; accessToken: string };
type MetalRates = {
  gold24k: number;
  gold22kEstimated: number;
  gold18kEstimated: number;
  silver999: number;
  fetchedAt: string;
  source: string;
};

async function signIn(username: string, password: string): Promise<Session> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Invalid username or password.' : 'Unable to sign in. Please try again.');
  }

  const data: LoginResponse = await response.json();
  if (!data.accessToken) throw new Error('The authentication server returned no access token.');

  const me = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${data.accessToken}` } });
  if (!me.ok) throw new Error('Could not verify your account.');

  const profile: { username?: unknown; roles?: unknown } = await me.json();
  if (typeof profile?.username !== 'string' || !profile.username.trim() || !Array.isArray(profile.roles)) {
    throw new Error('The server returned an invalid staff profile.');
  }
  return { username: profile.username, roles: profile.roles.filter((role): role is string => typeof role === 'string'), accessToken: data.accessToken };
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><Gem size={22} strokeWidth={1.5} aria-hidden="true" /></span>
      <span className="brand-wordmark">Shree <em>Jewellers</em></span>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setBusy(true);
    try {
      const session = await signIn(username.trim(), password);
      onLogin(session);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError(error instanceof TypeError
        ? 'Cannot reach the authentication service. Check that the API server is running.'
        : error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <Brand />
        <div className="login-card">
          <span className="eyebrow">STAFF PORTAL</span>
          <h1 id="login-title">Welcome back.</h1>
          <p>Sign in to manage your jewellery store with confidence.</p>
          <form className="login-form" onSubmit={submit}>
            <label htmlFor="username">Username</label>
            <div className="field-with-icon">
              <UserRound size={18} aria-hidden="true" />
              <input id="username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <label htmlFor="password">Password</label>
            <div className="field-with-icon">
              <LockKeyhole size={18} aria-hidden="true" />
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
              <button className="icon-button" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            {error && <p className="alert alert-error" role="alert">{error}</p>}
            <button className="button button-primary login-submit" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>
        </div>
        <p className="login-footer"><ShieldCheck size={16} aria-hidden="true" /> Authorized staff access</p>
      </section>
      <div className="login-visual jewellery-art">
        <div className="login-visual-copy">
          <span className="eyebrow">MADE FOR THE DETAILS</span>
          <h2>Beautiful jewellery.<br />Better business.</h2>
          <p>A thoughtful workspace for every piece, every customer, every day.</p>
        </div>
      </div>
    </main>
  );
}

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Inventory', icon: Package },
  { label: 'Billing', icon: ReceiptIndianRupee },
  { label: 'Customers', icon: Users },
  { label: 'Reports', icon: ChartNoAxesCombined },
  { label: 'Settings', icon: Settings },
] as const;

type Section = typeof navItems[number]['label'];
type NavigationProps = {
  session: Session;
  section: Section;
  onSelect: (section: Section) => void;
  onLogout: () => void;
  onClose?: () => void;
};

function WorkspaceNavigation({ session, section, onSelect, onLogout, onClose }: NavigationProps) {
  const roleNames = session.roles.map(role => role.replace(/^ROLE_/, '').toLowerCase().replace(/_/g, ' '));
  return (
    <div className="sidebar-layout">
      <div className="sidebar-header">
        <Brand />
        {onClose && <button className="icon-button sidebar-button" aria-label="Close navigation" onClick={onClose}><X size={20} aria-hidden="true" /></button>}
      </div>
      <span className="sidebar-section-label">STORE MANAGEMENT</span>
      <nav className="workspace-nav" aria-label="Main navigation">
        {navItems.map(({ label, icon: Icon }) => (
          <button key={label} type="button" aria-current={section === label ? 'page' : undefined} onClick={() => onSelect(label)}>
            <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-support">
        <span className="sidebar-support-icon"><ShieldCheck size={19} aria-hidden="true" /></span>
        <div><strong>Staff workspace</strong><span>Manage with confidence</span></div>
      </div>
      <div className="sidebar-profile">
        <span className="avatar" aria-hidden="true">{session.username.slice(0, 1).toUpperCase()}</span>
        <div className="sidebar-account">
          <strong>{session.username}</strong>
          <span>{roleNames.join(', ') || 'Staff'}</span>
        </div>
        <button className="icon-button sidebar-button" type="button" aria-label="Sign out" title="Sign out" onClick={onLogout}>
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const countFormat = new Intl.NumberFormat('en-IN');
const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' });
const updateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function Overview({ session, onSelect, inventory, rates, ratesError }: {
  session: Session;
  onSelect: NavigationProps['onSelect'];
  inventory: ReturnType<typeof useInventorySummary>;
  rates: MetalRates | null;
  ratesError: string;
}) {
  const { summary, error: inventoryError, reload } = inventory;
  const metrics = [
    { label: 'Total products', value: summary?.totalProducts, icon: Boxes, tone: 'plum', detail: 'Items in your catalogue' },
    { label: 'Available', value: summary?.availableProducts, icon: CircleCheck, tone: 'green', detail: 'Ready to sell' },
    { label: 'Reserved', value: summary?.reservedProducts, icon: Bookmark, tone: 'gold', detail: 'On hold for customers' },
    { label: 'Sold', value: summary?.soldProducts, icon: ShoppingBag, tone: 'rose', detail: 'Marked as sold' },
  ];
  const prices = [
    { label: 'Gold 24K', value: rates?.gold24k },
    { label: 'Gold 22K', value: rates?.gold22kEstimated, estimate: true },
    { label: 'Gold 18K', value: rates?.gold18kEstimated, estimate: true },
    { label: 'Silver 999', value: rates?.silver999, silver: true },
  ];
  const rateDate = rates ? new Date(rates.fetchedAt) : null;
  const lastUpdated = rateDate && Number.isFinite(rateDate.getTime()) ? updateFormat.format(rateDate) : null;

  return (
    <>
      <div className="page-heading overview-heading">
        <div>
          <span className="eyebrow">YOUR STORE AT A GLANCE</span>
          <h1>Store overview</h1>
          <p>Everything you need to run your day, in one place.</p>
        </div>
        <button className="button button-primary" onClick={() => onSelect('Billing')}>
          <Plus size={18} aria-hidden="true" /> New draft invoice
        </button>
      </div>
      <section className="overview-hero jewellery-art" aria-labelledby="welcome-title">
        <div className="overview-hero-content">
          <span className="hero-eyebrow">WELCOME BACK, {session.username.toUpperCase()}</span>
          <h2 id="welcome-title">Every piece<br /><span>matters.</span></h2>
          <p>Your jewellery business, beautifully organized from inventory to estimates.</p>
          <button className="button hero-button" onClick={() => onSelect('Inventory')}>
            Explore inventory <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="quick-actions" aria-label="Quick actions">
        <button className="quick-action" type="button" onClick={() => onSelect('Inventory')}>
          <span className="quick-action-icon"><Package size={21} aria-hidden="true" /></span>
          <span><strong>Product catalogue</strong><small>View stock, purity and jewellery pricing</small></span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button className="quick-action" type="button" onClick={() => onSelect('Billing')}>
          <span className="quick-action-icon"><ReceiptIndianRupee size={21} aria-hidden="true" /></span>
          <span><strong>Create an estimate</strong><small>Prepare a draft for your customer</small></span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>

      <section className="overview-section" aria-labelledby="stock-heading">
        <div className="section-heading">
          <h2 id="stock-heading">Inventory summary</h2>
          {!inventoryError && !summary && <span className="muted" role="status">Loading inventory…</span>}
        </div>
        {inventoryError && (
          <div className="alert alert-error">
            <span role="alert">{inventoryError}</span>
            <button className="button button-secondary button-small" onClick={() => void reload()}>Try again</button>
          </div>
        )}
        <dl className="metric-grid">
          {metrics.map(({ label, value, icon: Icon, tone, detail }) => (
            <div className="metric-card surface" key={label}>
              <dt>
                {label}
                <span className={`metric-icon tone-${tone}`} aria-hidden="true"><Icon size={19} strokeWidth={1.7} /></span>
              </dt>
              <dd>{value == null ? '—' : countFormat.format(value)}</dd>
              <p className="metric-detail">{detail}</p>
            </div>
          ))}
        </dl>
      </section>

      <section className="surface rates-panel" aria-labelledby="rates-heading">
        <div className="section-heading rates-heading">
          <div>
            <span className="eyebrow">PRECIOUS METALS</span>
            <h2 id="rates-heading">Gold &amp; silver rates</h2>
            <p>Indicative INR per gram. Excludes GST, making charges and retail premiums.</p>
          </div>
          {rates && (
            <p className="rates-source">
              {lastUpdated && <time dateTime={rates.fetchedAt}>Updated {lastUpdated}</time>}
              <span>{rates.source}</span>
            </p>
          )}
          {!rates && !ratesError && <p role="status">Loading rates…</p>}
        </div>
        {ratesError && (
          <p className="alert alert-error" role="alert">
            <CircleAlert size={17} aria-hidden="true" />
            <span>{ratesError}{rates && ' Showing last available rates.'}</span>
          </p>
        )}
        <dl className="rates-grid">
          {prices.map(({ label, value, estimate, silver }) => (
            <div className="rate-card" key={label}>
              <dt><span className={silver ? 'rate-dot silver' : 'rate-dot'} aria-hidden="true" />{label}{estimate && <span className="rate-estimate">est.</span>}</dt>
              <dd>{value == null ? '—' : formatINR(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

function Workspace({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [section, setSection] = useState<Section>('Dashboard');
  const [rates, setRates] = useState<MetalRates | null>(null);
  const [ratesError, setRatesError] = useState('');
  const menu = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLElement>(null);
  const inventory = useInventorySummary(session.accessToken);

  useEffect(() => {
    let active = true;
    async function loadRates() {
      try {
        const data = await inventoryRequest<MetalRates>('/metal-rates', session.accessToken);
        if (active) {
          setRates(data);
          setRatesError('');
        }
      } catch (error) {
        if (active) setRatesError(error instanceof Error ? error.message : 'Unable to load metal rates.');
      }
    }
    void loadRates();
    const timer = window.setInterval(loadRates, 300_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [session.accessToken]);

  useEffect(() => {
    const desktop = window.matchMedia('(width > 960px)');
    const closeMenu = (event: MediaQueryListEvent) => {
      if (event.matches) menu.current?.close();
    };
    desktop.addEventListener('change', closeMenu);
    return () => desktop.removeEventListener('change', closeMenu);
  }, []);

  useEffect(() => {
    content.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [section]);

  function select(next: Section) {
    menu.current?.close();
    if (next === section) return;
    setSection(next);
  }

  function logout() {
    menu.current?.close();
    onLogout();
  }

  const navProps = { session, section, onSelect: select, onLogout: logout };
  const currentModule = navItems.find(item => item.label === section)!;
  const ModuleIcon = currentModule.icon;

  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-content">Skip to content</a>
      <aside className="workspace-sidebar"><WorkspaceNavigation {...navProps} /></aside>
      <dialog className="workspace-drawer" id="mobile-navigation" ref={menu} aria-label="Workspace navigation"
        onClick={e => { if (e.target === e.currentTarget) menu.current?.close(); }}>
        <WorkspaceNavigation {...navProps} onClose={() => menu.current?.close()} />
      </dialog>
      <div className="workspace-main">
        <header className="topbar">
          <div className="topbar-path">
            <button className="icon-button menu-toggle" aria-label="Open navigation" aria-haspopup="dialog" aria-controls="mobile-navigation" onClick={() => menu.current?.showModal()}>
              <Menu size={22} aria-hidden="true" />
            </button>
            <span className="breadcrumb-root">Workspace</span>
            <ChevronRight className="breadcrumb-root" size={15} aria-hidden="true" />
            <strong>{section}</strong>
          </div>
          <div className="topbar-meta">
            <span className="topbar-workspace-label"><Gem size={15} aria-hidden="true" /> Shree Jewellers</span>
            <span><CalendarDays size={16} aria-hidden="true" />{dateFormat.format(new Date())}</span>
            <span className="avatar" aria-hidden="true">{session.username.slice(0, 1).toUpperCase()}</span>
          </div>
        </header>

        <main className="workspace-content" id="workspace-content" ref={content} tabIndex={-1}>
          {section === 'Dashboard' ? <Overview session={session} onSelect={select} inventory={inventory} rates={rates} ratesError={ratesError} />
            : section === 'Inventory' ? <Inventory token={session.accessToken} roles={session.roles} onChanged={() => void inventory.reload()} />
            : section === 'Billing' ? <Billing token={session.accessToken} roles={session.roles} />
            : (
              <>
                <div className="page-heading"><h1>{section}</h1></div>
                <div className="surface empty-state module-empty">
                  <span className="empty-icon"><ModuleIcon size={26} aria-hidden="true" /></span>
                  <h2>{section} is coming soon</h2>
                  <button className="button button-secondary" onClick={() => select('Dashboard')}>Back to dashboard <ArrowRight size={16} aria-hidden="true" /></button>
                </div>
              </>
            )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login onLogin={setSession} />} />
      <Route path="/dashboard" element={session ? <Workspace session={session} onLogout={() => setSession(null)} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
