import React from 'react'
import { LayoutDashboard, ReceiptText, Users, BarChart3, FileUp } from 'lucide-react'

const ITEMS = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'invoices', label: 'Invoices', icon: ReceiptText },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'upload', label: 'Upload', icon: FileUp },
]

export default function BottomNav({ tab, setTab, hasData }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-amoled-border2 bg-black/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {ITEMS.map((it) => {
          const Icon = it.icon
          const active = tab === it.id
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition ${
                active ? 'text-cyan-300' : 'text-amoled-dim'
              }`}
            >
              {active && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-cyan-400" />}
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span>{it.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
