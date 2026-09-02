import React, { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, ReceiptText, CircleDollarSign, Package, Search, UserRound, BadgePercent } from 'lucide-react'
import { Card, SectionTitle, Stat, chartTheme } from './ui.jsx'
import { workerStats, workerMonthly, formatMoney, fmtMonth } from '../lib/data.js'

export default function Team({ data }) {
  const [commission, setCommission] = useState(0)
  const workers = useMemo(() => workerStats(data.invoices, commission), [data, commission])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)

  const filtered = useMemo(() => { const ql = q.trim().toLowerCase(); return ql ? workers.filter((w) => w.name.toLowerCase().includes(ql)) : workers }, [workers, q])

  const totalRev = workers.reduce((s, w) => s + w.revenue, 0)
  const totalCust = new Set()
  const top = workers[0]

  return (
    <div className="space-y-4 animate-fadein">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <Stat icon={UserRound} label="Workers" value={workers.length} tone="cyan" />
        <Stat icon={ReceiptText} label="Invoices served" value={workers.reduce((s, w) => s + w.invoices, 0).toLocaleString('en-IN')} tone="violet" />
        <Stat icon={CircleDollarSign} label="Worker revenue" value={formatMoney(totalRev)} tone="green" />
        <Stat icon={Users} label="Top worker" value={top ? top.name : '—'} tone="pink" sub={top ? formatMoney(top.revenue) : ''} />
      </div>

      {/* commission estimator */}
      <Card className="p-4 flex items-center gap-3 animate-slideup">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-300"><BadgePercent size={18} /></div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Commission estimate</div>
          <div className="text-[11px] text-amoled-dim">Set % of worker revenue to see their cut</div>
        </div>
        <div className="flex items-center gap-2">
          <input inputMode="decimal" value={commission || ''} onChange={(e) => setCommission(Math.min(100, Math.max(0, Number(e.target.value.replace(/[^\d.]/g, '')) || 0)))} placeholder="%" className="ipt w-20 text-center" />
          <span className="text-sm text-amoled-muted">%</span>
        </div>
      </Card>

      <SectionTitle title="Workers" sub={`${workers.length} workers · tap a worker for full detail`} />

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amoled-dim" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search worker…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-amoled-card border border-amoled-border text-sm placeholder:text-amoled-dim outline-none focus:border-cyan-500/40" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 stagger">
        {filtered.map((w, idx) => {
          const pct = totalRev ? (100 * w.revenue / totalRev) : 0
          return (
            <button key={w.name} onClick={() => setSel(w)} className="text-left rounded-xl border border-amoled-border bg-amoled-card p-3.5 hover:border-cyan-500/30 hover:bg-amoled-card2 transition active:scale-[.99]">
              <div className="flex items-center gap-3">
                <div className="grid place-items-center w-11 h-11 rounded-full bg-gradient-to-br from-violet-500/25 to-cyan-500/25 text-cyan-300 font-bold text-base shrink-0">{w.name.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate flex items-center gap-2">
                    <span className="truncate">{w.name}</span>
                    {top && w.name === top.name && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 shrink-0">#1</span>}
                  </div>
                  <div className="text-[11px] text-amoled-dim mt-0.5 flex items-center gap-2">
                    <span><ReceiptText size={11} className="inline" /> {w.invoices} inv</span>
                    <span><Users size={11} className="inline" /> {w.customers} cust</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold num text-cyan-300">{formatMoney(w.revenue)}</div>
                  <div className="text-[10px] text-amoled-dim num">{pct.toFixed(0)}% share</div>
                  {commission > 0 && <div className="text-[10px] text-amber-300 num">cut {formatMoney(w.commissionAmt)}</div>}
                </div>
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-amoled-card2 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: pct + '%' }} />
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && <Card className="p-10 text-center text-amoled-dim">No workers found.</Card>}
      </div>

      {sel && <WorkerDetail w={sel} invoices={data.invoices} commission={commission} onClose={() => setSel(null)} />}
    </div>
  )
}

function WorkerDetail({ w, invoices, commission, onClose }) {
  const monthly = useMemo(() => workerMonthly(invoices, w.name), [invoices, w.name])
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-amoled-surface border border-amoled-border rounded-t-2xl sm:rounded-2xl animate-slideup max-h-[92dvh] overflow-y-auto nice-scroll">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-amoled-border bg-amoled-surface/95 backdrop-blur">
          <div className="grid place-items-center w-11 h-11 rounded-full bg-gradient-to-br from-violet-500/25 to-cyan-500/25 text-cyan-300 font-bold">{w.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="text-sm font-bold">{w.name}</div>
            <div className="text-[11px] text-amoled-dim">Worker performance</div>
          </div>
          <button onClick={onClose} className="ml-auto grid place-items-center w-9 h-9 rounded-lg border border-amoled-border2 text-amoled-muted">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Mini label="Invoices" value={w.invoices} tone="violet" />
            <Mini label="Customers served" value={w.customers} tone="cyan" />
            <Mini label="Items performed" value={w.items} tone="amber" />
            <Mini label="Revenue" value={formatMoney(w.revenue)} tone="green" />
          </div>

          {/* monthly trend */}
          {monthly.length > 1 && (
            <div>
              <div className="text-[11px] font-semibold text-amoled-dim uppercase tracking-wide mb-2">Monthly performance</div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke={chartTheme.grid} />
                    <XAxis dataKey="key" stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} tickFormatter={(k) => k ? k.slice(5, 7) : ''} />
                    <YAxis stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} width={40} />
                    <Tooltip {...chartTheme.tooltip} formatter={(v) => [formatMoney(v), 'Revenue']} labelFormatter={(k) => fmtMonth(k)} />
                    <Line type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-semibold text-amoled-dim uppercase tracking-wide mb-2">Top services by count</div>
            <div className="space-y-2">
              {w.services.slice(0, 10).map(([sv, c], i) => (
                <div key={sv} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-amoled-muted truncate">{sv}</span>
                    <span className="num text-amoled-text font-medium">{c}×</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-amoled-card2 overflow-hidden">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: (100 * c / (w.services[0]?.[1] || 1)) + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {commission > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              At {commission}% commission → <strong className="num">{formatMoney(w.commissionAmt)}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value, tone }) {
  const tones = { cyan: 'text-cyan-300', violet: 'text-violet-300', amber: 'text-amber-300', green: 'text-emerald-300' }
  return (
    <div className="rounded-xl border border-amoled-border bg-amoled-card p-3">
      <div className={`text-[10px] font-medium uppercase tracking-wide ${tones[tone]}`}>{label}</div>
      <div className={`mt-1 text-lg font-extrabold num ${tones[tone]}`}>{value}</div>
    </div>
  )
}
