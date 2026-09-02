import React from 'react'
import { LayoutDashboard, ReceiptText, Users, BarChart3, FileUp, Database, Trash2, X, Sparkles, ChefHat, UserRound, Sun, Moon } from 'lucide-react'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'menu', label: 'Menu Maker', icon: ChefHat },
  { id: 'invoices', label: 'Invoices', icon: ReceiptText },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'team', label: 'Workers', icon: UserRound },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

export default function Sidebar({ open, onClose, tab, setTab, dataset, onUpload, onClear, onTheme, theme }) {
  const body = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-amoled-border">
        <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-black">
          <Sparkles size={18} />
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-tight leading-none">Invoice Viewer</div>
          <div className="text-[10px] text-amoled-dim mt-1">AMOLED · Analytics</div>
        </div>
        <button onClick={onClose} className="ml-auto lg:hidden grid place-items-center w-8 h-8 rounded-lg text-amoled-muted">
          <X size={18} />
        </button>
      </div>

      <nav className="p-3 space-y-1">
        {NAV.map((n) => {
          const Icon = n.icon
          const active = tab === n.id
          return (
            <button
              key={n.id}
              onClick={() => { setTab(n.id); onClose?.() }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                  : 'text-amoled-muted hover:text-amoled-text hover:bg-amoled-card border border-transparent'
              }`}
            >
              <Icon size={18} className={active ? 'text-cyan-300' : ''} />
              {n.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
            </button>
          )
        })}
        <button
          onClick={() => { setTab('upload'); onClose?.() }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amoled-muted hover:text-amoled-text hover:bg-amoled-card border border-transparent"
        >
          <FileUp size={18} /> Upload JSON
        </button>
      </nav>

      <div className="mt-auto p-3 space-y-2">
        <button onClick={onTheme} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-amoled-muted hover:text-amoled-text hover:bg-amoled-card border border-amoled-border">
          {theme === 'pure' ? <Sun size={15} /> : <Moon size={15} />}
          OLED Intensity: {theme === 'pure' ? 'Pure black' : 'Dim'}
        </button>
        <div className="rounded-xl border border-amoled-border bg-amoled-card p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amoled-text">
            <Database size={14} className="text-cyan-300" />
            {dataset ? dataset.label : 'No data'}
          </div>
          {dataset ? (
            <>
              <div className="mt-1 text-[11px] text-amoled-dim">
                {dataset.invoices.length.toLocaleString('en-IN')} invoices
              </div>
              <button
                onClick={onClear}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-rose-300 hover:text-rose-200 px-2 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10"
              >
                <Trash2 size={12} /> Clear data
              </button>
            </>
          ) : (
            <div className="mt-1 text-[11px] text-amoled-dim">Upload a JSON file to begin</div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* overlay (mobile) */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-dvh w-64 bg-amoled-surface border-r border-amoled-border transform transition-transform lg:translate-x-0 lg:z-30 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {body}
      </aside>
    </>
  )
}
