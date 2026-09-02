import React, { useState } from 'react'
import { LayoutDashboard, ReceiptText, Users, ChefHat, MoreHorizontal, FileUp, BarChart3, UserRound, X } from 'lucide-react'

const PRIMARY = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'menu', label: 'Menu', icon: ChefHat },
  { id: 'invoices', label: 'Invoices', icon: ReceiptText },
  { id: 'customers', label: 'Customers', icon: Users },
]

const MORE = [
  { id: 'team', label: 'Workers', icon: UserRound, sub: 'Staff performance & revenue' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, sub: 'Deep breakdowns & trends' },
  { id: 'upload', label: 'Upload JSON', icon: FileUp, sub: 'Load a new dataset' },
]

export default function BottomNav({ tab, setTab, hasData }) {
  const [sheet, setSheet] = useState(false)

  function go(id) { setSheet(false); setTab(id) }

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-amoled-border2 bg-black/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {PRIMARY.map((it) => {
            const Icon = it.icon
            const active = tab === it.id
            return (
              <button key={it.id} onClick={() => setTab(it.id)}
                className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition ${active ? 'text-cyan-300' : 'text-amoled-dim'}`}>
                {active && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-cyan-400" />}
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                <span>{it.label}</span>
              </button>
            )
          })}
          <button onClick={() => setSheet(true)}
            className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition ${!PRIMARY.some((p) => p.id === tab) ? 'text-cyan-300' : 'text-amoled-dim'}`}>
            {!PRIMARY.some((p) => p.id === tab) && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-cyan-400" />}
            <MoreHorizontal size={20} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* more sheet */}
      {sheet && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSheet(false)} />
          <div className="relative w-full bg-amoled-surface border-t border-amoled-border rounded-t-2xl animate-slideup pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-amoled-border">
              <span className="text-sm font-bold">More</span>
              <button onClick={() => setSheet(false)} className="grid place-items-center w-8 h-8 rounded-lg border border-amoled-border2 text-amoled-muted"><X size={16} /></button>
            </div>
            <div className="p-3 space-y-1.5">
              {MORE.map((it) => {
                const Icon = it.icon
                return (
                  <button key={it.id} onClick={() => go(it.id)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-amoled-card border border-transparent hover:border-amoled-border text-left">
                    <div className="grid place-items-center w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-300"><Icon size={18} /></div>
                    <div>
                      <div className="text-sm font-medium">{it.label}</div>
                      <div className="text-[11px] text-amoled-dim">{it.sub}</div>
                    </div>
                    <span className="ml-auto text-amoled-dim">›</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
