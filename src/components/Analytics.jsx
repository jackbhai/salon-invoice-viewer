import React, { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area, Legend } from 'recharts'
import { Download, FileSpreadsheet, Landmark } from 'lucide-react'
import { Card, SectionTitle, chartTheme, Stat } from './ui.jsx'
import { aggregate, revenueByMonth, paymentModeBreakdown, formatMoney, toNum, gstMonthly, buildCSV, fmtMonth, dueCustomers, monthlyCompare, categoryBreakdown } from '../lib/data.js'

const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f87171', '#a3e635']

export default function Analytics({ data }) {
  const invoices = data.invoices
  const [year, setYear] = useState('all')
  const agg = useMemo(() => aggregate(invoices), [invoices])
  const monthly = useMemo(() => revenueByMonth(invoices), [invoices])
  const gst = useMemo(() => gstMonthly(invoices), [invoices])
  const byProvider = useMemo(() => providerRevenue(invoices, 12), [invoices])
  const payModes = useMemo(() => paymentModeBreakdown(invoices), [invoices])
  const topCustomers = useMemo(() => topCustomersData(invoices, 10), [invoices])
  const dues = useMemo(() => dueCustomers(invoices).slice(0, 15), [invoices])
  const yoy = useMemo(() => monthlyCompare(invoices), [invoices])
  const cats = useMemo(() => categoryBreakdown(invoices), [invoices])

  // year filter
  const years = useMemo(() => { const s = new Set(invoices.map((i) => i.date?.getFullYear()).filter(Boolean)); return ['all', ...[...s].sort()] }, [invoices])
  const yearMonthly = useMemo(() => (year === 'all' ? monthly : monthly.filter((m) => m.key.startsWith(year + '-'))), [monthly, year])
  const yearGst = useMemo(() => (year === 'all' ? gst : gst.filter((m) => m.key.startsWith(year + '-'))), [gst, year])

  const cashMode = payModes.find((p) => /cash/i.test(p.name))
  const digital = payModes.filter((p) => !/cash/i.test(p.name)).reduce((s, p) => s + p.value, 0)
  const cash = cashMode ? cashMode.value : 0
  const cashPct = agg.totalRevenue ? (100 * cash / agg.totalRevenue) : 0

  const taxTotal = invoices.reduce((s, i) => s + i.sgst + i.cgst, 0)

  function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href) }

  function exportGSTR1() {
    const rows = yearGst.map((m) => [
      m.key + '-01', m.count, m.taxable.toFixed(2), m.sgst.toFixed(2), m.cgst.toFixed(2), m.sgst.toFixed(2), m.total.toFixed(2),
    ])
    const csv = buildCSV(rows, ['Month', 'Invoices', 'Taxable Value', 'SGST', 'CGST', 'IGST', 'Total'])
    downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `gstr-summary-${year}.csv`)
  }
  function exportMonthlyReport() {
    const rows = yearMonthly.map((m) => [fmtMonth(m.key), m.count, m.taxable.toFixed(2), m.sgst.toFixed(2), m.cgst.toFixed(2), m.revenue.toFixed(2), m.paid.toFixed(2), m.due.toFixed(2)])
    const csv = buildCSV(rows, ['Month', 'Invoices', 'Taxable', 'SGST', 'CGST', 'Total', 'Paid', 'Due'])
    downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `monthly-report-${year}.csv`)
  }

  return (
    <div className="space-y-6 animate-fadein">
      <div className="flex items-center gap-2">
        <SectionTitle title="Analytics" sub="Deep breakdowns, GST & trends" />
        <div className="ml-auto flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(e.target.value)} className="ipt w-32">
            {years.map((y) => <option key={y} value={y}>{y === 'all' ? 'All years' : y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <Stat icon={null} label="Revenue (selected)" value={formatMoney(agg.totalRevenue)} tone="cyan" />
        <Stat icon={null} label="Invoices" value={agg.count.toLocaleString('en-IN')} tone="violet" />
        <Stat icon={null} label="Avg. per customer" value={formatMoney(agg.avgCust)} tone="pink" />
        <Stat icon={null} label="GST Collected" value={formatMoney(taxTotal)} tone="amber" />
      </div>

      {/* monthly table */}
      <Card className="p-4 lg:p-5">
        <SectionTitle title="Monthly GST Summary"
          sub="Taxable, SGST, CGST per month"
          right={<div className="flex gap-2">
            <button onClick={exportMonthlyReport} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-amoled-border2 text-amoled-muted hover:text-amoled-text"><FileSpreadsheet size={13} /> Monthly</button>
            <button onClick={exportGSTR1} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"><Landmark size={13} /> GSTR-1 CSV</button>
          </div>} />
        <div className="overflow-x-auto nice-scroll">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-amoled-dim uppercase tracking-wide">
              <th className="py-2 pr-4 font-medium">Month</th><th className="py-2 pr-4 font-medium text-right">Invoices</th>
              <th className="py-2 pr-4 font-medium text-right">Taxable</th><th className="py-2 pr-4 font-medium text-right">SGST</th>
              <th className="py-2 pr-4 font-medium text-right">CGST</th><th className="py-2 font-medium text-right">Total</th>
            </tr></thead>
            <tbody className="border-t border-amoled-border">
              {yearGst.slice(-24).map((m) => (
                <tr key={m.key} className="border-b border-amoled-border/60 last:border-0">
                  <td className="py-2 pr-4 font-medium">{fmtMonth(m.key)}</td>
                  <td className="py-2 pr-4 text-right num text-amoled-muted">{m.count}</td>
                  <td className="py-2 pr-4 text-right num">{formatMoney(m.taxable)}</td>
                  <td className="py-2 pr-4 text-right num text-violet-300">{formatMoney(m.sgst)}</td>
                  <td className="py-2 pr-4 text-right num text-cyan-300">{formatMoney(m.cgst)}</td>
                  <td className="py-2 text-right num font-semibold text-amoled-text">{formatMoney(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* paid vs due / cash vs digital */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4 lg:p-5">
          <SectionTitle title="Amount Paid vs Due" sub="Collection efficiency" />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearMonthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="key" stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} tickFormatter={(k) => k ? k.slice(5, 7) : ''} />
                <YAxis stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
                <Tooltip {...chartTheme.tooltip} formatter={(v, n) => [formatMoney(v), n]} labelFormatter={(k) => fmtMonth(k)} />
                <Legend wrapperStyle={{ color: '#9a9aa3', fontSize: 12 }} />
                <Line type="monotone" dataKey="paid" name="Paid" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="due" name="Due" stroke="#fb7185" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 lg:p-5">
          <SectionTitle title="Cash vs Digital" sub={`${cashPct.toFixed(0)}% collected in cash`} />
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="text-2xl font-extrabold num text-emerald-300">✓ {formatMoney(cash)}</div>
              <div className="text-xs text-amoled-dim mt-1">Cash</div>
            </div>
            <div className="text-xl font-bold text-amoled-dim">vs</div>
            <div className="text-center">
              <div className="text-2xl font-extrabold num text-cyan-300">{formatMoney(digital)}</div>
              <div className="text-xs text-amoled-dim mt-1">Digital</div>
            </div>
          </div>
          <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-amoled-card2">
            <div className="bg-emerald-400" style={{ width: cashPct + '%' }} />
            <div className="bg-cyan-400" style={{ width: (100 - cashPct) + '%' }} />
          </div>
        </Card>
      </div>

      {/* provider + top customers */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4 lg:p-5">
          <SectionTitle title="Revenue by Provider" sub="Ranked by revenue" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProvider} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={chartTheme.grid} />
                <XAxis type="number" stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} tickFormatter={compact} />
                <YAxis type="category" dataKey="name" stroke="none" tick={{ ...chartTheme.tick, fill: '#9a9aa3' }} tickLine={false} axisLine={false} width={90} />
                <Tooltip {...chartTheme.tooltip} formatter={(v) => [formatMoney(v), 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {byProvider.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 lg:p-5">
          <SectionTitle title="Top Customers" sub="Highest total spend" />
          <div className="space-y-2 max-h-64 overflow-y-auto nice-scroll pr-1">
            {topCustomers.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3 text-sm">
                <span className="grid place-items-center w-6 h-6 rounded-lg bg-amoled-card2 text-[11px] font-bold text-amoled-muted num">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-amoled-text">{c.name}</span>
                <span className="text-[11px] text-amoled-dim num">{c.count} inv</span>
                <span className="num font-semibold text-cyan-300">{formatMoney(c.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* payment split + weekday */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4 lg:p-5">
          <SectionTitle title="Payment Mode Split" sub="Revenue distribution" />
          <div className="space-y-2">
            {payModes.map((p, i) => (
              <div key={p.name} className="text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-amoled-muted">{p.name}</span>
                  <span className="num text-amoled-text font-medium">{formatMoney(p.value)} · {agg.totalRevenue ? (100 * p.value / agg.totalRevenue).toFixed(1) : 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-amoled-card2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: (agg.totalRevenue ? 100 * p.value / agg.totalRevenue : 0) + '%', background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 lg:p-5">
          <SectionTitle title="Revenue by Weekday" sub="Busiest days of the week" />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData(invoices)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="name" stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} />
                <YAxis stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
                <Tooltip {...chartTheme.tooltip} formatter={(v) => [formatMoney(v), 'Revenue']} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {weekdayData(invoices).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* year over year */}
      <Card className="p-4 lg:p-5">
        <SectionTitle title="Year-over-Year" sub="This year vs last year by month" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yoy} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={chartTheme.grid} />
              <XAxis dataKey="key" stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} />
              <YAxis stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
              <Tooltip {...chartTheme.tooltip} formatter={(v, n) => [formatMoney(v), n === 'previous' ? 'Last year' : 'This year']} />
              <Legend wrapperStyle={{ color: '#9a9aa3', fontSize: 12 }} />
              <Bar dataKey="previous" name="previous" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="current" name="current" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {cats.slice(0, 6).map((c, i) => (
            <span key={c.name} className="text-[11px] px-2 py-1 rounded-md bg-amoled-card2 border border-amoled-border2 text-amoled-muted num">{c.name} <span className="text-cyan-300">{formatMoney(c.value)}</span></span>
          ))}
        </div>
      </Card>

      {/* outstanding dues */}
      <Card className="p-4 lg:p-5">
        <SectionTitle title="Outstanding Dues" sub="Pending collection by customer (top 15)" />
        <div className="space-y-2">
          {dues.map((d) => (
            <div key={d.name} className="flex items-center gap-3 text-sm">
              <div className="grid place-items-center w-7 h-7 rounded-full bg-rose-500/15 text-rose-300 font-bold text-xs shrink-0">{d.name.slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.name}</div>
                <div className="text-[11px] text-amoled-dim">{d.count} bill{d.count > 1 ? 's' : ''}{d.mobile ? ` · ${d.mobile}` : ''}</div>
              </div>
              <div className="text-sm font-bold num text-rose-300">{formatMoney(d.due)}</div>
            </div>
          ))}
          {dues.length === 0 && <div className="text-xs text-emerald-300">🎉 No outstanding dues.</div>}
        </div>
      </Card>

      <Card className="p-4 lg:p-5">
        <SectionTitle title="Provider Summary" sub="Invoices & revenue per provider" />
        <div className="overflow-x-auto nice-scroll">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-amoled-dim uppercase tracking-wide">
              <th className="py-2 pr-4 font-medium">Provider</th><th className="py-2 pr-4 font-medium text-right">Invoices</th>
              <th className="py-2 pr-4 font-medium text-right">Items</th><th className="py-2 pr-4 font-medium text-right">Customers</th>
              <th className="py-2 font-medium text-right">Revenue</th>
            </tr></thead>
            <tbody className="border-t border-amoled-border">
              {providerSummary(invoices).map((p) => (
                <tr key={p.name} className="border-b border-amoled-border/60 last:border-0">
                  <td className="py-2.5 pr-4 font-medium">{p.name}</td>
                  <td className="py-2.5 pr-4 text-right num text-amoled-muted">{p.count}</td>
                  <td className="py-2.5 pr-4 text-right num text-amoled-muted">{p.items}</td>
                  <td className="py-2.5 pr-4 text-right num text-amoled-muted">{p.customers}</td>
                  <td className="py-2.5 text-right num text-cyan-300 font-semibold">{formatMoney(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function providerRevenue(invoices, limit) {
  const map = new Map()
  for (const i of invoices) for (const it of i.items) {
    const name = (it.provider || 'N/A').trim() || 'N/A'
    if (!map.has(name)) map.set(name, { name, revenue: 0, count: 0 })
    const b = map.get(name); b.revenue += (it.taxable_value || it.rate * it.qty || 0); b.count += 1
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit).map((b) => ({ ...b, revenue: Math.round(b.revenue) }))
}
function topCustomersData(invoices, limit) {
  const map = new Map()
  for (const i of invoices) { const k = (i.customer_name || '—').trim() || '—'; let c = map.get(k); if (!c) { c = { name: k, count: 0, revenue: 0 }; map.set(k, c) }; c.count += 1; c.revenue += i.total }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}
function providerSummary(invoices) {
  const map = new Map()
  for (const i of invoices) {
    const provs = new Set()
    i.items.forEach((it) => it.provider && provs.add(it.provider.trim()))
    for (const name of provs) {
      let w = map.get(name); if (!w) { w = { name, count: 0, items: 0, customers: new Set(), revenue: 0 }; map.set(name, w) }
      w.count += 1
      w.items += i.items.filter((it) => it.provider && it.provider.trim() === name).length
      if (i.customer_name) w.customers.add(i.customer_name.trim())
      w.revenue += i.items.filter((it) => it.provider && it.provider.trim() === name).reduce((s, it) => s + (it.taxable_value || it.rate * it.qty || 0), 0)
    }
  }
  return [...map.values()].map((w) => ({ ...w, customers: w.customers.size, revenue: Math.round(w.revenue) })).sort((a, b) => b.revenue - a.revenue).slice(0, 15)
}
function weekdayData(invoices) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const arr = names.map((n) => ({ name: n, revenue: 0 }))
  for (const i of invoices) if (i.date) arr[i.date.getDay()].revenue += i.total
  return [1, 2, 3, 4, 5, 6, 0].map((d) => arr[d])
}
function compact(v) {
  if (v >= 100000) return (v / 100000).toFixed(1) + 'L'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return v
}
