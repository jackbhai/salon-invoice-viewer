import React, { useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, ReceiptText, Users, BarChart3, FileUp, Database, Trash2, Sparkles, ChefHat, UserRound, Plus } from 'lucide-react'
import Sidebar from './components/Sidebar.jsx'
import BottomNav from './components/BottomNav.jsx'
import Upload from './components/Upload.jsx'
import Dashboard from './components/Dashboard.jsx'
import Menu from './components/Menu.jsx'
import Invoices from './components/Invoices.jsx'
import Customers from './components/Customers.jsx'
import Team from './components/Team.jsx'
import Analytics from './components/Analytics.jsx'
import { normalizeData, dataQuality } from './lib/data.js'
import { dbPut, dbGet, dbDelete } from './lib/db.js'

const STORE_KEY = 'active-dataset'

export default function App() {
  const [dataset, setDataset] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('iv-theme') || 'pure')
  const [fabOpen, setFabOpen] = useState(false)

  const quality = useMemo(() => (dataset ? dataQuality(dataset.invoices) : null), [dataset])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('iv-theme', theme)
  }, [theme])

  useEffect(() => {
    dbGet(STORE_KEY).then((saved) => { if (saved && saved.invoices) setDataset(saved); setLoading(false) })
  }, [])

  async function onDataUploaded(result) {
    const next = { invoices: result.invoices, shop: result.shop, meta: result.meta, label: result.label || 'dataset', loadedAt: new Date().toISOString() }
    setDataset(next)
    setTab('dashboard')
    await dbPut(STORE_KEY, next)
  }

  async function clearData() {
    if (!dataset) return
    if (!confirm('This will remove the loaded dataset from your browser. Continue?')) return
    setDataset(null)
    setFabOpen(false)
    await dbDelete(STORE_KEY)
  }

  return (
    <div className="min-h-dvh app-bg text-amoled-text flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} tab={tab} setTab={setTab} dataset={dataset} onUpload={() => setTab('upload')} onClear={clearData} onTheme={() => setTheme(theme === 'pure' ? 'dim' : 'pure')} theme={theme} />

      <div className="flex-1 min-w-0 flex flex-col lg:ml-64">
        <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 lg:px-8 border-b border-amoled-border bg-black/80 backdrop-blur">
          <button onClick={() => setSidebarOpen((v) => !v)} className="lg:hidden grid place-items-center w-9 h-9 rounded-lg border border-amoled-border2 text-amoled-muted active:bg-amoled-card" aria-label="menu"><MenuIcon /></button>
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight truncate flex items-center gap-2">
              <Sparkles size={15} className="grad-text hidden sm:block" /> {tabLabel(tab)}
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">v3</span>
            </div>
            <p className="text-[11px] text-amoled-dim truncate">{dataset ? `${dataset.invoices.length.toLocaleString('en-IN')} invoices · ${dataset.shop?.name || dataset.label || 'dataset'}` : 'No dataset loaded'}</p>
          </div>
          <div className="ml-auto flex items-center gap-2"><StatusPill dataset={dataset} /></div>
        </header>

        <main className="flex-1 overflow-y-auto nice-scroll pb-24 lg:pb-8 px-4 lg:px-8 pt-4 lg:pt-6">
          {tab === 'upload' || !dataset ? (
            <Upload onLoaded={onDataUploaded} existing={dataset} quality={quality} />
          ) : (
            <>
              {tab === 'dashboard' && <Dashboard data={dataset} goTab={setTab} />}
              {tab === 'menu' && <Menu data={dataset} />}
              {tab === 'invoices' && <Invoices data={dataset} />}
              {tab === 'customers' && <Customers data={dataset} />}
              {tab === 'team' && <Team data={dataset} />}
              {tab === 'analytics' && <Analytics data={dataset} />}
            </>
          )}
        </main>
      </div>

      <BottomNav tab={tab} setTab={setTab} hasData={!!dataset} />

      {/* center FAB -> quick nav */}
      {dataset && (
        <div className="lg:hidden fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3">
          {fabOpen && (
            <div className="flex flex-col gap-2 animate-fade-up">
              <FabBtn icon="🧾" label="Invoices" onClick={() => { setTab('invoices'); setFabOpen(false) }} />
              <FabBtn icon="🪧" label="Menu" onClick={() => { setTab('menu'); setFabOpen(false) }} />
              <FabBtn icon="📊" label="Analytics" onClick={() => { setTab('analytics'); setFabOpen(false) }} />
            </div>
          )}
          <button onClick={() => setFabOpen((v) => !v)} className={`grid place-items-center w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-black shadow-glow-lg transition-transform ${fabOpen ? 'rotate-45' : ''}`} aria-label="quick actions">
            <Plus size={26} />
          </button>
        </div>
      )}
    </div>
  )
}

function FabBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-xl border border-amoled-border2 bg-amoled-surface/95 backdrop-blur px-3 py-2 text-xs font-medium text-amoled-text shadow-glow active:scale-95 transition">
      <span>{icon}</span> {label}
    </button>
  )
}

function tabLabel(t) {
  const map = { dashboard: 'Dashboard', menu: 'Menu Maker', invoices: 'Invoices', customers: 'Customers', team: 'Workers', analytics: 'Analytics', upload: 'Load Data' }
  return map[t] || 'Invoice Viewer'
}
function MenuIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="15" y2="18" /></svg>
}
function StatusPill({ dataset }) {
  return dataset
    ? <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live</span>
    : <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20"><FileUp size={12} /> Upload JSON</span>
}
