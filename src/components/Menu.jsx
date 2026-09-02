import React, { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Search, ChefHat, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Clock, Package, Users, Tag, Printer, Download, Share2, FileJson, FileSpreadsheet } from 'lucide-react'
import { Card, SectionTitle, chartTheme } from './ui.jsx'
import { buildMenu, priceHistoryTrend, formatMoney, fmtDate, fmtMonth, buildCSV } from '../lib/data.js'

export default function Menu({ data }) {
  const invoices = data.invoices
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [openService, setOpenService] = useState(null)
  const [printMode, setPrintMode] = useState(false)
  const [showCat, setShowCat] = useState('all')

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

  function exportCSV() {
    const rows = menu.items.map((m) => [
      m.name, m.latestRate, m.prevRate ?? '', m.change?.toFixed(1) ?? '', m.modeRate, m.minRate, m.maxRate,
      m.qty, m.customers, m.revenue, m.providers.join('; '),
    ])
    const csv = buildCSV(rows, ['Service', 'Current Price', 'Old Price', '% Change', 'Most Common', 'Min', 'Max', 'Times Sold', 'Customers', 'Revenue', 'Providers'])
    download(new Blob(['\ufeff' + csv], { type: 'text/csv' }), 'menu.csv')
  }
  function exportJSON() {
    download(new Blob([JSON.stringify(menu.items, null, 2)], { type: 'application/json' }), 'menu.json')
  }
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
  }
  function printMenu() {
    setPrintMode(true)
    setTimeout(() => { window.print(); setPrintMode(false) }, 300)
  }

  return (
    <div className="space-y-4 animate-fadein">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amoled-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a service in the menu…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-amoled-card border border-amoled-border text-sm placeholder:text-amoled-dim outline-none focus:border-cyan-500/40" />
        </div>
      </div>

      {/* chips */}
      <div className="flex gap-2 overflow-x-auto nice-scroll pb-1 -mx-1 px-1">
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>All ({menu.totalItems})</Chip>
        {menu.categories.map((c) => <Chip key={c.cat} active={cat === c.cat} onClick={() => setCat(c.cat)}>{c.cat} ({c.items.length})</Chip>)}
      </div>

      <SectionTitle
        title="Menu Maker"
        sub={`${menu.totalItems} services · ${formatMoney(menu.totalMenuRevenue)} lifetime revenue`}
        right={
          <div className="flex items-center gap-1.5">
            <button onClick={exportCSV} className="icon-btn"><FileSpreadsheet size={14} /></button>
            <button onClick={exportJSON} className="icon-btn"><FileJson size={14} /></button>
            <button onClick={printMenu} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"><Printer size={13} /> Print / Share</button>
          </div>
        }
      />

      {visible.length === 0 && <Card className="p-10 text-center text-amoled-dim text-sm">No services match.</Card>}

      {visible.map(({ cat, items }) => (
        <div key={cat} className="space-y-2 fade-up">
          <div className="flex items-center gap-2 pt-1">
            <ChefHat size={15} className="text-cyan-300" />
            <h3 className="text-sm font-bold">{cat}</h3>
          </div>
          <div className="space-y-2">
            {items.map((m) => <MenuRow key={m.name} m={m} open={openService === m.name} toggle={() => setOpenService(openService === m.name ? null : m.name)} />)}
          </div>
        </div>
      ))}

      {printMode && <PrintMenu menu={menu} onDone={() => setPrintMode(false)} />}
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
    <Card className={`overflow-hidden transition-all ${open ? 'border-cyan-500/30 shadow-glow' : ''}`}>
      <button onClick={toggle} className="w-full text-left p-3.5 flex items-center gap-3">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-cyan-300 shrink-0"><Tag size={17} /></div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm leading-snug truncate">{m.name}</div>
          <div className="text-[11px] text-amoled-dim mt-1 flex items-center gap-2">
            <span><Package size={11} className="inline" /> {m.count} sold</span>
            <span>· <Users size={11} className="inline" /> {m.customers} customers</span>
          </div>
          {changed && (
            <div className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${up ? 'text-emerald-300' : 'text-rose-300'}`}>
              {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{Math.abs(m.change).toFixed(1)}% {up ? 'up' : 'down'} vs previous
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold num text-cyan-300">{formatMoney(m.latestRate)}</div>
          {m.prevRate != null && m.prevRate !== m.latestRate && <div className="text-[11px] text-amoled-dim num line-through">{formatMoney(m.prevRate)}</div>}
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
  return (
    <div className="px-4 pb-4 pt-1 border-t border-amoled-border animate-slideup">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-amoled-card2 border border-amoled-border p-3">
          {row('Current rate', formatMoney(m.latestRate) || '—', 'text-cyan-300')}
          {m.prevRate != null && row('Previous rate', formatMoney(m.prevRate))}
          {row('Lowest seen', formatMoney(m.minRate))}
          {row('Highest seen', formatMoney(m.maxRate))}
          {row('Most common', formatMoney(m.modeRate))}
        </div>
        <div className="rounded-xl bg-amoled-card2 border border-amoled-border p-3">
          {row('Total sold', m.qty, 'text-violet-300')}
          {row('Revenue', formatMoney(m.revenue), 'text-emerald-300')}
          {row('Billing count', m.count)}
          {row('First seen', m.timeline.length ? fmtDate(m.timeline[0].date) : '—')}
          {row('Last priced', m.timeline.length ? fmtDate(m.timeline[m.timeline.length - 1].date) : '—')}
        </div>
      </div>

      {m.change != null && (
        <div className={`mt-3 rounded-xl border p-3 text-xs flex items-center gap-2 ${m.change > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`}>
          {m.change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>Price {m.change > 0 ? 'increased' : 'decreased'} by {Math.abs(m.change).toFixed(1)}% (old {formatMoney(m.prevRate)} → new {formatMoney(m.latestRate)})</span>
        </div>
      )}

      {/* year-wise comparison */}
      {m.byYear.length > 1 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-amoled-dim uppercase tracking-wide mb-1.5">Year-wise price (avg)</div>
          <div className="overflow-x-auto nice-scroll">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-amoled-dim"><th className="py-1 pr-3 font-medium">Year</th><th className="py-1 pr-3 font-medium text-right">Avg</th><th className="py-1 font-medium text-right">Change</th></tr></thead>
              <tbody className="border-t border-amoled-border">
                {m.byYear.map((y, i) => {
                  const prevY = i ? m.byYear[i - 1] : null
                  const delta = prevY ? ((y.avg - prevY.avg) / prevY.avg) * 100 : null
                  return (
                    <tr key={y.year} className="border-b border-amoled-border/50 last:border-0">
                      <td className="py-1.5 pr-3 font-medium">{y.year}</td>
                      <td className="py-1.5 pr-3 text-right num">{formatMoney(Math.round(y.avg))}</td>
                      <td className="py-1.5 text-right num">
                        {delta != null && Math.abs(delta) > 0.01
                          ? <span className={delta > 0 ? 'text-emerald-300' : 'text-rose-300'}>{delta > 0 ? '+' : ''}{delta.toFixed(0)}%</span>
                          : <span className="text-amoled-dim">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* price history chart */}
      {trend.length > 1 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-amoled-dim uppercase tracking-wide mb-1.5">Price trend</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="key" stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} tickFormatter={(k) => k ? k.slice(5, 7) : ''} />
                <YAxis stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} width={40} />
                <Tooltip {...chartTheme.tooltip} formatter={(v) => [formatMoney(v), 'Price']} labelFormatter={(k) => fmtMonth(k)} />
                {m.latestRate != null && <ReferenceLine y={m.latestRate} stroke="#22d3ee" strokeDasharray="4 4" opacity={0.5} />}
                <Line type="monotone" dataKey="rate" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: '#a78bfa' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* providers */}
      {m.providers.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-amoled-dim uppercase tracking-wide mb-1.5">Provided by</div>
          <div className="flex flex-wrap gap-1.5">{m.providers.map((p) => <span key={p} className="text-[11px] px-2 py-1 rounded-md bg-amoled-card2 border border-amoled-border2 text-amoled-muted">{p}</span>)}</div>
        </div>
      )}

      {prices.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {prices.map((p) => <span key={p.rate} className="text-[11px] px-2 py-1 rounded-md bg-amoled-card2 border border-amoled-border2 text-amoled-muted num">{formatMoney(p.rate)} <span className="text-amoled-dim">×{p.count}</span></span>)}
        </div>
      )}
    </div>
  )
}

function row(label, val, cls) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-amoled-border/60 last:border-0">
      <span className="text-xs text-amoled-muted">{label}</span>
      <span className={`text-sm font-semibold num ${cls || 'text-amoled-text'}`}>{val}</span>
    </div>
  )
}

// printable menu — shared/exported as PDF via the browser's print dialog
function PrintMenu({ menu, onDone }) {
  const all = menu.items
  return (
    <div className="print-menu-wrap">
      <div className="no-print fixed inset-x-0 bottom-4 z-[90] flex items-center justify-center gap-3">
        <button onClick={onDone} className="px-4 py-2 rounded-xl bg-amoled-card border border-amoled-border2 text-amoled-text text-sm">Close</button>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-cyan-500 text-black text-sm font-semibold glow-pulse">Print / Save PDF</button>
      </div>
      <div className="print-sheet">
        <h1>Menu &amp; Price List</h1>
        <p className="psub">Generated {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        <div className="pgrid">
          {all.map((m) => (
            <div className="pitem" key={m.name}>
              <div className="pname">{m.name.replace(/^service\s*/i, '')}</div>
              <div className="pprice">₹{fmtP(m.latestRate)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
function fmtP(v) { return v == null ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 }) }
