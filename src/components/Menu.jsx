import React, { useMemo, useState } from 'react'
import { Search, ChefHat, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Clock, Package, Users, Tag } from 'lucide-react'
import { Card, SectionTitle } from './ui.jsx'
import { buildMenu, priceHistoryTrend, formatMoney, fmtDate } from '../lib/data.js'

export default function Menu({ data }) {
  const invoices = data.invoices
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [openService, setOpenService] = useState(null)

  const menu = useMemo(() => buildMenu(invoices), [invoices])

  const filterCats = useMemo(() => {
    if (cat !== 'all') return menu.categories.filter((c) => c.cat === cat)
    return menu.categories
  }, [menu, cat])

  const visible = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const out = {}
    for (const c of filterCats) {
      const items = ql ? c.items.filter((m) => m.name.toLowerCase().includes(ql)) : c.items
      if (items.length) out[c.cat] = items
    }
    return Object.entries(out).map(([name, items]) => ({ cat: name, items }))
  }, [filterCats, q])

  const totalItems = menu.totalItems
  const activeCount = useMemo(() => {
    let n = 0
    for (const it of menu.items) if (it.latestRate != null && it.change != null) n++
    return n
  }, [menu])

  return (
    <div className="space-y-4 animate-fadein">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amoled-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a service in the menu…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-amoled-card border border-amoled-border text-sm placeholder:text-amoled-dim outline-none focus:border-cyan-500/40"
          />
        </div>
      </div>

      {/* chips */}
      <div className="flex gap-2 overflow-x-auto nice-scroll pb-1 -mx-1 px-1">
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>All ({totalItems})</Chip>
        {menu.categories.map((c) => <Chip key={c.cat} active={cat === c.cat} onClick={() => setCat(c.cat)}>{c.cat} ({c.items.length})</Chip>)}
      </div>

      <SectionTitle
        title="Auto Menu Maker"
        sub={`${totalItems} services found across your invoices · ${activeCount} price changes tracked`}
      />

      {visible.length === 0 && <Card className="p-10 text-center text-amoled-dim text-sm">No services match.</Card>}

      {visible.map(({ cat, items }) => (
        <div key={cat} className="space-y-2">
          <div className="flex items-center gap-2 pt-1">
            <ChefHat size={15} className="text-cyan-300" />
            <h3 className="text-sm font-bold">{cat}</h3>
          </div>
          <div className="space-y-2">
            {items.map((m) => <MenuRow key={m.name} m={m} open={openService === m.name} toggle={() => setOpenService(openService === m.name ? null : m.name)} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${active ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-amoled-card text-amoled-muted border-amoled-border2'}`}>
      {children}
    </button>
  )
}

function MenuRow({ m, open, toggle }) {
  const changed = m.change != null && Math.abs(m.change) > 0.01
  const up = changed && m.change > 0
  return (
    <Card className="overflow-hidden">
      <button onClick={toggle} className="w-full text-left p-3.5 flex items-center gap-3">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-cyan-300 shrink-0">
          <Tag size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm leading-snug truncate">{m.name}</div>
          <div className="text-[11px] text-amoled-dim mt-1 flex items-center gap-2">
            <span><Package size={11} className="inline" /> {m.count} sold</span>
            <span>· <Users size={11} className="inline" /> {m.customers} customers</span>
          </div>
          {changed && (
            <div className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${up ? 'text-emerald-300' : 'text-rose-300'}`}>
              {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(m.change).toFixed(1)}% {up ? 'up' : 'down'} vs previous
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold num text-cyan-300">{formatMoney(m.latestRate)}</div>
          {m.prevRate != null && m.prevRate !== m.latestRate && (
            <div className="text-[11px] text-amoled-dim num line-through">{formatMoney(m.prevRate)}</div>
          )}
          {open ? <ChevronUp size={16} className="ml-auto mt-1 text-amoled-dim" /> : <ChevronDown size={16} className="ml-auto mt-1 text-amoled-dim" />}
        </div>
      </button>

      {open && <Detail m={m} />}
    </Card>
  )
}

function Detail({ m }) {
  const trend = priceHistoryTrend(m)
  const prices = m.rates.slice(0, 8)
  const row = (label, val, cls) => (
    <div className="flex justify-between items-center py-1.5 border-b border-amoled-border/60 last:border-0">
      <span className="text-xs text-amoled-muted">{label}</span>
      <span className={`text-sm font-semibold num ${cls || 'text-amoled-text'}`}>{val}</span>
    </div>
  )
  return (
    <div className="px-4 pb-4 pt-1 border-t border-amoled-border animate-slideup">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-amoled-card2 border border-amoled-border p-3">
          {row('Current rate', formatMoney(m.latestRate) || '—', 'text-cyan-300')}
          {m.prevRate != null && row('Previous rate', formatMoney(m.prevRate))}
          {row('Lowest seen', `${formatMoney(m.minRate)}`) }
          {row('Highest seen', `${formatMoney(m.maxRate)}`)}
          {row('Most common', `${formatMoney(m.modeRate)}`)}
        </div>
        <div className="rounded-xl bg-amoled-card2 border border-amoled-border p-3">
          {row('Total sold', m.qty, 'text-violet-300')}
          {row('Revenue', formatMoney(m.revenue), 'text-emerald-300')}
          {row('Billing count', m.count)}
          {row('First seen', m.timeline.length ? fmtDate(m.timeline[0].date) : '—')}
          {row('Last priced', m.timeline.length ? fmtDate(m.timeline[m.timeline.length - 1].date) : '—')}
        </div>
      </div>

      {/* price change highlight */}
      {m.change != null && (
        <div className={`mt-3 rounded-xl border p-3 text-xs flex items-center gap-2 ${m.change > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`}>
          {m.change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>Price {m.change > 0 ? 'increased' : 'decreased'} by {Math.abs(m.change).toFixed(1)}% (old {formatMoney(m.prevRate)} → new {formatMoney(m.latestRate)})</span>
        </div>
      )}

      {/* providers */}
      {m.providers.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-amoled-dim uppercase tracking-wide mb-1.5">Provided by</div>
          <div className="flex flex-wrap gap-1.5">
            {m.providers.map((p) => <span key={p} className="text-[11px] px-2 py-1 rounded-md bg-amoled-card2 border border-amoled-border2 text-amoled-muted">{p}</span>)}
          </div>
        </div>
      )}

      {/* price timeline */}
      {trend.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-amoled-dim uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Clock size={11} /> Price history</div>
          <div className="space-y-1 max-h-44 overflow-y-auto nice-scroll pr-1">
            {trend.map((t, i) => {
              const prev = i ? trend[i - 1].rate : null
              const delta = prev != null ? ((t.rate - prev) / prev) * 100 : null
              return (
                <div key={t.key} className="flex items-center justify-between text-xs border-b border-amoled-border/40 pb-1">
                  <span className="text-amoled-muted">{t.key}</span>
                  <span className="flex items-center gap-2 num">
                    <span className="font-semibold text-amoled-text">{formatMoney(t.rate)}</span>
                    {delta != null && Math.abs(delta) > 0.01 && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] ${delta > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {delta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{Math.abs(delta).toFixed(1)}%
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* all prices used */}
      {prices.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {prices.map((p) => <span key={p.rate} className="text-[11px] px-2 py-1 rounded-md bg-amoled-card2 border border-amoled-border2 text-amoled-muted num">{formatMoney(p.rate)} <span className="text-amoled-dim">×{p.count}</span></span>)}
        </div>
      )}
    </div>
  )
}
