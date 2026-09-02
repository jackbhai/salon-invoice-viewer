import React, { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, RadialBarChart, RadialBar } from 'recharts'
import { Wallet, ReceiptText, TrendingUp, Users, CircleDollarSign, ReceiptIndianRupee, Hourglass, BarChart3, CalendarClock, Sun, ChevronRight, Flame } from 'lucide-react'

import { Card, SectionTitle, chartTheme, Stat, RangePicker, PopNum } from './ui.jsx'
import { aggregate, revenueByMonth, revenueByDay, paymentModeBreakdown, serviceBreakdown, discountStats, categoryBreakdown, formatMoney, fmtDate, rangeBounds, inRange, periodComparison, hourOfDay } from '../lib/data.js'

const PIE_COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb7185', '#60a5fa']

export default function Dashboard({ data, goTab }) {
  const [range, setRange] = useState('month')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const filtered = useMemo(() => {
    if (range === 'custom') {
      const s = start ? new Date(start) : null
      const e = end ? new Date(end) : null
      if (e) e.setHours(23, 59, 59, 999)
      return data.invoices.filter((i) => (!s || (i.date && i.date >= s)) && (!e || (i.date && i.date <= e)))
    }
    const b = rangeBounds(range)
    return data.invoices.filter((i) => inRange(i, b))
  }, [data.invoices, range, start, end])

  const agg = useMemo(() => aggregate(filtered), [filtered])
  const monthly = useMemo(() => revenueByMonth(filtered), [filtered])
  const payModes = useMemo(() => paymentModeBreakdown(filtered), [filtered])
  const services = useMemo(() => serviceBreakdown(filtered, 8), [filtered])
  const compare = useMemo(() => periodComparison(filtered, range), [filtered, range])
  const hours = useMemo(() => hourOfDay(filtered), [filtered])

  // today's live snapshot
  const today = useMemo(() => {
    const b = rangeBounds('today')
    const todayInv = data.invoices.filter((i) => inRange(i, b))
    const a = aggregate(todayInv)
    return { ...a, active: todayInv.length }
  }, [data.invoices])

  // revenue target ring (formula-driven: target = avg daily revenue * days in selected range)
  const target = useMemo(() => {
    const spanDays = range === 'month' ? 30 : range === 'week' ? 7 : range === 'year' ? 365 : agg.count ? 30 : 30
    const allAgg = aggregate(data.invoices)
    const avgDaily = allAgg.count ? allAgg.totalRevenue / 365 : 0
    return avgDaily * spanDays
  }, [range, data.invoices])
  const pct = target > 0 ? Math.min(100, (agg.totalRevenue / target) * 100) : 0

  const [chartMode, setChartMode] = useState('month')
  const daily = useMemo(() => revenueByDay(filtered, 45), [filtered])
  const disc = useMemo(() => discountStats(filtered), [filtered])
  const cats = useMemo(() => categoryBreakdown(filtered), [filtered])

  const busyHour = useMemo(() => {
    let best = hours[0]
    for (const h of hours) if (h.count > best.count) best = h
    return best
  }, [hours])

  const growthUp = compare.growth >= 0

  return (
    <div className="space-y-5 animate-fadein">
      {/* date range */}
      <Card className="p-3.5 animate-slideup">
        <RangePicker range={range} setRange={setRange} start={start} setStart={setStart} end={end} setEnd={setEnd} />
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <Stat icon={CircleDollarSign} tone="cyan" label="Total Revenue" value={<PopNum value={formatMoney(agg.totalRevenue)} />} sub={`${agg.count.toLocaleString('en-IN')} invoices`} />
        <Stat icon={Wallet} tone="green" label="Amount Collected" value={formatMoney(agg.totalPaid)} sub={`${agg.totalDue ? formatMoney(agg.totalDue) + ' due' : 'fully settled'}`} />
        <Stat icon={TrendingUp} tone={growthUp ? 'green' : 'red'} label="Growth vs prev" value={`${growthUp ? '+' : ''}${compare.growth.toFixed(1)}%`} sub={`prev ${formatMoney(compare.previous)}`} />
        <Stat icon={ReceiptIndianRupee} tone="violet" label="Avg. Bill" value={formatMoney(agg.avg)} sub="per invoice" />
        <Stat icon={Users} tone="pink" label="Customers" value={agg.customers.toLocaleString('en-IN')} sub={`${agg.mobiles.toLocaleString('en-IN')} mobiles`} />
        <Stat icon={BarChart3} tone="amber" label="Taxable Value" value={formatMoney(agg.taxable)} sub={`${agg.itemRows.toLocaleString('en-IN')} items sold`} />
        <Stat icon={Hourglass} tone="red" label="Outstanding Due" value={formatMoney(agg.totalDue)} sub={agg.count ? (100 * agg.totalDue / (agg.totalPaid + agg.totalDue)).toFixed(1) + '% of revenue' : '—'} />
        <Stat icon={Sun} tone="cyan" label="Date Range" value={fmtDate(agg.minDate)} sub={agg.maxDate ? `→ ${fmtDate(agg.maxDate)}` : ''} />
        <Stat icon={Flame} tone="amber" label="Discounts given" value={formatMoney(disc.discountTotal)} sub={`${disc.discounted} bills`} />
        <Stat icon={BarChart3} tone="green" label="Avg items / bill" value={disc.avgItems.toFixed(2)} sub={`${disc.itemsSold.toLocaleString('en-IN')} items`} />
      </div>

      {/* today live + target */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:p-5 lg:col-span-2">
          <SectionTitle title="Revenue Trend"
            sub={chartMode === 'month' ? 'Monthly collections in selected range' : 'Daily collections (last 45 days)'}
            right={
              <div className="flex gap-1">
                <button onClick={() => setChartMode('month')} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${chartMode === 'month' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-amoled-card text-amoled-muted border-amoled-border2'}`}>Month</button>
                <button onClick={() => setChartMode('day')} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${chartMode === 'day' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-amoled-card text-amoled-muted border-amoled-border2'}`}>Day</button>
              </div>
            } />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartMode === 'month' ? monthly : daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="key" stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} />
                <YAxis stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => compact(v)} />
                <Tooltip {...chartTheme.tooltip} formatter={(v) => [formatMoney(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#22d3ee" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          {/* Target ring */}
          <Card className="p-4">
            <SectionTitle title="Target Progress" sub="via avg daily revenue" />
            <div className="relative mx-auto h-32 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={[{ name: 'done', value: pct, fill: '#22d3ee' }]} startAngle={90} endAngle={-270}>
                  <RadialBar background={{ fill: '#1c1c22' }} dataKey="value" cornerRadius={8} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="text-xl font-extrabold num text-cyan-300">{pct.toFixed(0)}%</div>
                  <div className="text-[10px] text-amoled-dim">target</div>
                </div>
              </div>
            </div>
            <div className="mt-2 text-center text-[11px] text-amoled-dim num">target {formatMoney(target)}</div>
          </Card>

          {/* Today snapshot */}
          <Card className="p-4">
            <SectionTitle title="Today" sub={fmtDate(new Date())} />
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Collection" value={formatMoney(today.totalPaid)} tone="text-emerald-300" />
              <MiniStat label="Invoices" value={today.count} tone="text-cyan-300" />
              <MiniStat label="Customers" value={today.customers} tone="text-violet-300" />
              <MiniStat label="Due" value={formatMoney(today.totalDue)} tone="text-rose-300" />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Payment modes */}
        <Card className="p-4 lg:p-5">
          <SectionTitle title="Payment Modes" sub="Revenue split by payment method" />
          <div className="flex flex-col items-center gap-2">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={payModes} dataKey="value" nameKey="name" innerRadius={46} outerRadius={70} paddingAngle={3} stroke="#000">
                    {payModes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...chartTheme.tooltip} formatter={(v) => [formatMoney(v), 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-1.5">
              {payModes.slice(0, 5).map((p, i) => (
                <div key={p.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-amoled-muted truncate">{p.name}</span>
                  <span className="ml-auto num font-medium">{formatMoney(p.value)}</span>
                  <span className="num text-amoled-dim w-14 text-right">{agg.totalRevenue ? (100 * p.value / agg.totalRevenue).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Top services */}
        <Card className="p-4 lg:p-5">
          <SectionTitle title="Top Services" sub="By revenue" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={services} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={chartTheme.grid} />
                <XAxis type="number" stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v)} />
                <YAxis type="category" dataKey="name" stroke="none" tick={{ ...chartTheme.tick, fill: '#9a9aa3' }} tickLine={false} axisLine={false} width={110} />
                <Tooltip {...chartTheme.tooltip} formatter={(v) => [formatMoney(v), 'Revenue']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {services.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* category breakdown */}
      <Card className="p-4 lg:p-5">
        <SectionTitle title="Category Breakdown" sub="Revenue split by service category" />
        <div className="flex flex-wrap gap-2">
          {cats.map((c, i) => {
            const total = cats.reduce((s, x) => s + x.value, 0) || 1
            return (
              <div key={c.name} className="rounded-xl border border-amoled-border bg-amoled-card2 p-3 min-w-[130px]">
                <div className="text-[11px] text-amoled-muted truncate">{c.name}</div>
                <div className="text-base font-extrabold num text-cyan-300 mt-0.5">{formatMoney(c.value)}</div>
                <div className="text-[10px] text-amoled-dim num">{(100 * c.value / total).toFixed(0)}%</div>
                <div className="mt-1.5 h-1.5 rounded-full bg-amoled-card overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: (100 * c.value / total) + '%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* hour heatmap */}
      <Card className="p-4 lg:p-5">
        <SectionTitle title="Busiest Hours" sub={`Peak at ${busyHour.hour}:00 (${busyHour.count} invoices)`} />
        <div className="grid grid-cols-12 gap-1.5">
          {hours.map((h) => {
            const max = Math.max(...hours.map((x) => x.count), 1)
            const intensity = h.count / max
            return (
              <div key={h.hour} className="group relative">
                <div
                  className="rounded-md h-12 flex flex-col items-center justify-center text-[9px] transition-all hover:scale-110"
                  style={{ background: `rgba(34,211,238,${0.06 + intensity * 0.85})` }}
                >
                  <span className="font-bold text-black/80 num" style={{ color: intensity > 0.35 ? '#fff' : '#9a9aa3' }}>{h.count || '·'}</span>
                </div>
                <div className="text-center text-[8px] text-amoled-dim mt-0.5">{h.hour}</div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction icon="🪧" title="Menu & Prices" sub="Old vs new price, history" onClick={() => goTab('menu')} />
        <QuickAction icon="🧾" title="Invoices" sub="Search, filter, export" onClick={() => goTab('invoices')} />
        <QuickAction icon="👥" title="Workers" sub="Customers & revenue per staff" onClick={() => goTab('team')} />
        <QuickAction icon="📊" title="Analytics" sub="GSTR, trends, breakdowns" onClick={() => goTab('analytics')} />
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-lg bg-amoled-card2 border border-amoled-border p-2.5">
      <div className="text-[10px] text-amoled-dim">{label}</div>
      <div className={`text-sm font-extrabold num ${tone}`}>{value}</div>
    </div>
  )
}

function QuickAction({ icon, title, sub, onClick }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-amoled-border2 bg-amoled-card p-4 text-left hover:border-cyan-500/40 hover:-translate-y-0.5 transition-all active:scale-95">
      <div className="text-sm font-semibold flex items-center gap-1.5">{icon} {title}</div>
      <p className="text-xs text-amoled-dim mt-1">{sub}</p>
    </button>
  )
}

function compact(v) {
  if (v >= 100000) return (v / 100000).toFixed(1) + 'L'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return v
}
