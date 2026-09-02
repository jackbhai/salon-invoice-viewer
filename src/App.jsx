import React, { useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, ReceiptText, Users, BarChart3, FileUp, Database, Trash2 } from 'lucide-react'
import Sidebar from './components/Sidebar.jsx'
import BottomNav from './components/BottomNav.jsx'
import Upload from './components/Upload.jsx'
import Dashboard from './components/Dashboard.jsx'
import Invoices from './components/Invoices.jsx'
import Customers from './components/Customers.jsx'
import Analytics from './components/Analytics.jsx'
import { normalizeData } from './lib/data.js'
import { dbPut, dbGet, dbDelete } from './lib/db.js'

const STORE_KEY = 'active-dataset'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'invoices', label: 'Invoices', icon: ReceiptText },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

export default function App() {
  const [dataset, setDataset] = useState(null) // { invoices, shop, meta, label, loadedAt }
  const [tab, setTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    dbGet(STORE_KEY).then((saved) => {
      if (saved && saved.invoices) setDataset(saved)
      setLoading(false)
    })
  }, [])

  async function onDataUploaded(result) {
    const next = {
      invoices: result.invoices,
      shop: result.shop,
      meta: result.meta,
      label: result.label || 'dataset',
      loadedAt: new Date().toISOString(),
    }
    setDataset(next)
    setError(null)
    setTab('dashboard')
    await dbPut(STORE_KEY, next)
  }

  async function clearData() {
    if (!dataset) return
    if (!confirm('This will remove the loaded dataset from your browser. Continue?')) return
    setDataset(null)
    await dbDelete(STORE_KEY)
  }

  const activeNav = NAV.find((n) => n.id === tab)

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-dvh bg-amoled-bg text-amoled-text flex">
      {/* Desktop sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tab={tab}
        setTab={setTab}
        dataset={dataset}
        onUpload={() => setTab('upload')}
        onClear={clearData}
      />

      <div className="flex-1 min-w-0 flex flex-col lg:ml-64">
        {/* top bar */}
        <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 lg:px-8 border-b border-amoled-border bg-black/80 backdrop-blur">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden grid place-items-center w-9 h-9 rounded-lg border border-amoled-border2 text-amoled-muted active:bg-amoled-card"
            aria-label="menu"
          >
            <MenuIcon />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight truncate">
                {activeNav ? activeNav.label : 'Invoice Viewer'}
              </h1>
            </div>
            <p className="text-[11px] text-amoled-dim truncate">
              {dataset
                ? `${dataset.invoices.length.toLocaleString('en-IN')} invoices · ${dataset.shop?.name || dataset.label || 'dataset'}`
                : 'No dataset loaded'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <StatusPill dataset={dataset} />
          </div>
        </header>

        {/* main content */}
        <main className="flex-1 overflow-y-auto nice-scroll pb-20 lg:pb-8 px-4 lg:px-8 pt-4 lg:pt-6">
          {tab === 'upload' || !dataset ? (
            <Upload onLoaded={onDataUploaded} existing={dataset} />
          ) : (
            <>
              {tab === 'dashboard' && <Dashboard data={dataset} goTab={setTab} />}
              {tab === 'invoices' && <Invoices data={dataset} />}
              {tab === 'customers' && <Customers data={dataset} />}
              {tab === 'analytics' && <Analytics data={dataset} />}
            </>
          )}
        </main>
      </div>

      {/* mobile bottom nav */}
      <BottomNav tab={tab} setTab={setTab} hasData={!!dataset} />
    </div>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="15" y2="18" />
    </svg>
  )
}

function StatusPill({ dataset }) {
  return dataset ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
      <FileUp size={12} /> Upload JSON
    </span>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-amoled-bg grid place-items-center">
      <div className="text-center">
        <div className="mx-auto w-10 h-10 rounded-full border-2 border-amoled-border2 border-t-cyan-400 animate-spin" />
        <p className="mt-4 text-sm text-amoled-muted">Loading…</p>
      </div>
    </div>
  )
}
