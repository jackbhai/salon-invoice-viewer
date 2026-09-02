import React, { useMemo, useState } from 'react'
import { Search, Users, Phone, MapPin, TrendingUp, TrendingDown, AlarmClock, UserCheck, Ghost } from 'lucide-react'
import { Card, SectionTitle } from './ui.jsx'
import { formatMoney, customerSegments, segmentSummary } from '../lib/data.js'
import CustomerDetail from './CustomerDetail.jsx'

const SEG_TONE = {
  Loyal: ['text-emerald-300 bg-emerald-500/10 border-emerald-500/20', 'Loyal'],
  Active: ['text-cyan-300 bg-cyan-500/10 border-cyan-500/20', 'Active'],
  New: ['text-violet-300 bg-violet-500/10 border-violet-500/20', 'New'],
  'At-Risk': ['text-amber-300 bg-amber-500/10 border-amber-500/20', 'At-Risk'],
  Churned: ['text-rose-300 bg-rose-500/10 border-rose-500/20', 'Churned'],
}

export default function Customers({ data }) {
  const invoices = data.invoices
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('revenue')
  const [openName, setOpenName] = useState(null)
  const [segFilter, setSegFilter] = useState('all')

  const customers = useMemo(() => {
    const segs = customerSegments(invoices)
    let list = segs
    const ql = q.trim().toLowerCase()
    if (ql) list = list.filter((c) => c.name.toLowerCase().includes(ql))
    if (segFilter !== 'all') list = list.filter((c) => c.segment === segFilter)
    list.sort((a, b) => {
      if (sort === 'count') return b.count - a.count
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'recent') return (b.last || 0) - (a.last || 0)
      if (sort === 'due') return b.due - a.due
      return b.revenue - a.revenue
    })
    return list
  }, [invoices, q, sort, segFilter])

  const segSummary = useMemo(() => segmentSummary(customerSegments(invoices)), [invoices])

  return (
    <div className="space-y-4 animate-fadein">
      {/* segment summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {segSummary.map((s) => (
          <button key={s.name} onClick={() => setSegFilter(segFilter === s.name ? 'all' : s.name)}
            className={`rounded-xl border p-3 text-left transition ${segFilter === s.name ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-amoled-border bg-amoled-card hover:border-cyan-500/30'} ${SEG_TONE[s.name][0]}`}>
            <div className="text-[10px] font-medium uppercase tracking-wide">{s.name}</div>
            <div className="mt-1 text-lg font-extrabold num">{s.count}</div>
            <div className="text-[11px] opacity-80 num">{formatMoney(s.value)}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amoled-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-amoled-card border border-amoled-border text-sm placeholder:text-amoled-dim outline-none focus:border-cyan-500/40" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="ipt w-36">
          <option value="revenue">Top spend</option>
          <option value="count">Most visits</option>
          <option value="recent">Recently active</option>
          <option value="due">Max due</option>
          <option value="name">A–Z</option>
        </select>
      </div>

      <SectionTitle title="Customers" sub={`${customers.length.toLocaleString('en-IN')} customers · tap a card for full detail`} />

      <div className="space-y-2 stagger">
        {customers.map((c, idx) => {
          const segTone = SEG_TONE[c.segment] || SEG_TONE.New
          return (
            <button key={c.name + idx} onClick={() => setOpenName(c.name)} className="w-full text-left rounded-xl border border-amoled-border bg-amoled-card p-3.5 flex items-center gap-3 hover:border-cyan-500/30 hover:bg-amoled-card2 transition active:scale-[.99]">
              <div className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-300 font-bold shrink-0">{c.name.slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate flex items-center gap-2">
                  <span className="truncate">{c.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${segTone[0]} shrink-0`}>{c.segment}</span>
                  {c.due > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-300 shrink-0">due</span>}
                </div>
                <div className="text-[11px] text-amoled-dim mt-0.5 flex items-center gap-3">
                  <span>{c.count} visit{c.count > 1 ? 's' : ''}</span>
                  {c.last && <span className="inline-flex items-center gap-1"><AlarmClock size={10} /> last {c.daysSince}d ago</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold num text-cyan-300">{formatMoney(c.revenue)}</div>
                <div className="text-[10px] text-amoled-dim num">{formatMoney(c.due)} due</div>
              </div>
            </button>
          )
        })}
        {customers.length === 0 && <Card className="p-10 text-center text-amoled-dim">No customers found.</Card>}
      </div>

      {openName && <CustomerDetail invoices={invoices} name={openName} onClose={() => setOpenName(null)} />}
    </div>
  )
}
