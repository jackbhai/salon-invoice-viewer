import React, { useMemo, useState } from 'react'
import { Search, Users, Phone, MapPin } from 'lucide-react'
import { Card, SectionTitle } from './ui.jsx'
import { formatMoney } from '../lib/data.js'
import CustomerDetail from './CustomerDetail.jsx'

export default function Customers({ data }) {
  const invoices = data.invoices
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('revenue')
  const [openName, setOpenName] = useState(null)

  const customers = useMemo(() => {
    const map = new Map()
    for (const i of invoices) {
      const key = (i.customer_name || '—').trim() || '—'
      let c = map.get(key)
      if (!c) { c = { name: key, mobile: '', pos: '', count: 0, revenue: 0, paid: 0, due: 0 }; map.set(key, c) }
      c.count += 1
      c.revenue += i.total
      c.paid += i.amount_paid
      c.due += i.amount_due
      if (!c.mobile && i.mobile) c.mobile = i.mobile
      if (!c.pos && i.place_of_supply) c.pos = i.place_of_supply
    }
    let list = [...map.values()]
    list.sort((a, b) => {
      if (sort === 'count') return b.count - a.count
      if (sort === 'name') return a.name.localeCompare(b.name)
      return b.revenue - a.revenue
    })
    const ql = q.trim().toLowerCase()
    if (ql) list = list.filter((c) => c.name.toLowerCase().includes(ql) || c.mobile.includes(ql))
    return list
  }, [invoices, q, sort])

  return (
    <div className="space-y-4 animate-fadein">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amoled-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customers…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-amoled-card border border-amoled-border text-sm placeholder:text-amoled-dim outline-none focus:border-cyan-500/40"
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="ipt w-36">
          <option value="revenue">Top spend</option>
          <option value="count">Most visits</option>
          <option value="name">A–Z</option>
        </select>
      </div>

      <SectionTitle title="Customers" sub={`${customers.length.toLocaleString('en-IN')} unique customers`} />

      <div className="space-y-2">
        {customers.map((c, idx) => (
          <button key={c.name + idx} onClick={() => setOpenName(c.name)} className="w-full text-left rounded-xl border border-amoled-border bg-amoled-card p-3.5 flex items-center gap-3 hover:border-cyan-500/30 hover:bg-amoled-card2 transition">
            <div className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-300 font-bold shrink-0">
              {c.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate flex items-center gap-2">
                <span className="truncate">{c.name}</span>
                {c.due > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-300 shrink-0">due</span>}
              </div>
              <div className="text-[11px] text-amoled-dim mt-0.5 flex items-center gap-3">
                {c.mobile && <span className="inline-flex items-center gap-1"><Phone size={10} />{c.mobile}</span>}
                {c.pos && <span className="inline-flex items-center gap-1"><MapPin size={10} />{c.pos}</span>}
                <span>{c.count} visit{c.count > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold num text-cyan-300">{formatMoney(c.revenue)}</div>
              <div className="text-[10px] text-amoled-dim num">{formatMoney(c.due)} due</div>
            </div>
          </button>
        ))}
        {customers.length === 0 && <Card className="p-10 text-center text-amoled-dim">No customers found.</Card>}
      </div>

      {openName && <CustomerDetail invoices={invoices} name={openName} onClose={() => setOpenName(null)} />}
    </div>
  )
}
