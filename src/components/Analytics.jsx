import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area, Legend } from 'recharts'
import { Card, SectionTitle, chartTheme, Stat } from './ui.jsx'
import { aggregate, revenueByMonth, topBucket, paymentModeBreakdown, formatMoney, toNum } from '../lib/data.js'

const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f87171', '#a3e635']

export default function Analytics({ data }) {
  const invoices = data.invoices
  const agg = useMemo(() => aggregate(invoices), [invoices])
  const monthly = useMemo(() => revenueByMonth(invoices), [invoices])
  const byProvider = useMemo(() => providerRevenue(invoices, 10), [invoices])
  const byProviderCount = useMemo(() => topBucketCount(invoices), [invoices])
  const payModes = useMemo(() => paymentModeBreakdown(invoices), [invoices])
  const topCustomers = useMemo(() => topCustomersData(invoices, 10), [invoices])
  const byDay = useMemo(() => byDayOfWeek(invoices), [invoices])
  const taxTotal = useMemo(() => invoices.reduce((s, i) => s + i.sgst + i.cgst, 0), [invoices])

  return (
    <div className="space-y-6 animate-fadein">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={null} label="Revenue" value={formatMoney(agg.totalRevenue)} tone="cyan" />
        <Stat icon={null} label="Invoices" value={agg.count.toLocaleString('en-IN')} tone="violet" />
        <Stat icon={null} label="Avg. per customer" value={formatMoney(agg.avgCust)} tone="pink" />
        <Stat icon={null} label="GST Collected" value={formatMoney(taxTotal)} tone="amber" />
      </div>

      {/* cust + paid trend */}
      <Card className="p-4 lg:p-5">
        <SectionTitle title="Amount Paid vs Due" sub="Collection efficiency over time" />
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={chartTheme.grid} />
              <XAxis dataKey="key" stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} />
              <YAxis stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} width={48} tickFormatter={compact} />
              <Tooltip {...chartTheme.tooltip} formatter={(v, n) => [formatMoney(v), n]} />
              <Legend wrapperStyle={{ color: '#9a9aa3', fontSize: 12 }} />
              <Line type="monotone" dataKey="paid" name="Paid" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="due" name="Due" stroke="#fb7185" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* provider revenue */}
        <Card className="p-4 lg:p-5">
          <SectionTitle title="Revenue by Provider" sub="Service providers ranked by revenue" />
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

        {/* top customers */}
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

      {/* payment modes + day of week */}
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
              <BarChart data={byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="name" stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} />
                <YAxis stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
                <Tooltip {...chartTheme.tooltip} formatter={(v) => [formatMoney(v), 'Revenue']} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {byDay.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* provider count table */}
      <Card className="p-4 lg:p-5">
        <SectionTitle title="Provider Summary" sub="Invoices handled & revenue generated" />
        <div className="overflow-x-auto nice-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-amoled-dim uppercase tracking-wide">
                <th className="py-2 pr-4 font-medium">Provider</th>
                <th className="py-2 pr-4 font-medium text-right">Invoices</th>
                <th className="py-2 pr-4 font-medium text-right">Items</th>
                <th className="py-2 font-medium text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="border-t border-amoled-border">
              {byProviderCount.map((p) => (
                <tr key={p.name} className="border-b border-amoled-border/60 last:border-0">
                  <td className="py-2.5 pr-4 text-amoled-text font-medium">{p.name}</td>
                  <td className="py-2.5 pr-4 text-right num text-amoled-muted">{p.count}</td>
                  <td className="py-2.5 pr-4 text-right num text-amoled-muted">{p.items}</td>
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
  for (const i of invoices) {
    for (const it of i.items) {
      const name = (it.provider || 'N/A').trim() || 'N/A'
      let b = map.get(name); if (!b) { b = { name, revenue: 0, count: 0 }; map.set(name, b) }
      b.revenue += (it.taxable_value || it.rate * it.qty || 0)
      b.count += 1
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
    .map((b) => ({ ...b, revenue: Math.round(b.revenue) }))
}

function topBucketCount(invoices) {
  const map = new Map()
  for (const i of invoices) {
    const provs = new Set()
    i.items.forEach((it) => it.provider && provs.add(it.provider.trim()))
    for (const name of provs) {
      let b = map.get(name); if (!b) { b = { name, count: 0, items: 0, revenue: 0 }; map.set(name, b) }
      b.count += 1
      b.items += i.items.filter((it) => it.provider && it.provider.trim() === name).length
      b.revenue += i.total
    }
  }
  const out = [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 15)
  return out.map((b) => ({ ...b, revenue: Math.round(b.revenue) }))
}

function topCustomersData(invoices, limit) {
  const map = new Map()
  for (const i of invoices) {
    const key = (i.customer_name || '—').trim() || '—'
    let c = map.get(key); if (!c) { c = { name: key, count: 0, revenue: 0 }; map.set(key, c) }
    c.count += 1; c.revenue += i.total
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}

function byDayOfWeek(invoices) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const arr = names.map((n) => ({ name: n, revenue: 0, count: 0 }))
  for (const i of invoices) {
    if (!i.date) continue
    const d = i.date.getDay()
    arr[d].revenue += i.total
    arr[d].count += 1
  }
  // order Mon..Sun
  return [1, 2, 3, 4, 5, 6, 0].map((d) => arr[d])
}

function compact(v) {
  if (v >= 100000) return (v / 100000).toFixed(1) + 'L'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return v
}
