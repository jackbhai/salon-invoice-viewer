import React, { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { Wallet, ReceiptText, TrendingUp, Users, CircleDollarSign, ReceiptIndianRupee, Hourglass, BarChart3 } from 'lucide-react'
import { Card, SectionTitle, chartTheme, Stat } from './ui.jsx'
import { aggregate, revenueByMonth, paymentModeBreakdown, serviceBreakdown, formatMoney, fmtDate } from '../lib/data.js'

const PIE_COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb7185', '#60a5fa']
const BAR_COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f87171']

export default function Dashboard({ data, goTab }) {
  const invoices = data.invoices
  const agg = useMemo(() => aggregate(invoices), [invoices])
  const monthly = useMemo(() => revenueByMonth(invoices), [invoices])
  const payModes = useMemo(() => paymentModeBreakdown(invoices), [invoices])
  const services = useMemo(() => serviceBreakdown(invoices, 8), [invoices])
  const collections = useMemo(() => agg.totalPaid || agg.totalRevenue, [agg])

  return (
    <div className="space-y-6 animate-fadein">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={CircleDollarSign} tone="cyan" label="Total Revenue" value={formatMoney(agg.totalRevenue)} sub={`${agg.count.toLocaleString('en-IN')} invoices`} />
        <Stat icon={Wallet} tone="green" label="Amount Collected" value={formatMoney(agg.totalPaid)} sub={`${agg.totalDue ? formatMoney(agg.totalDue) + ' due' : 'fully settled'}`} />
        <Stat icon={ReceiptIndianRupee} tone="violet" label="Avg. Bill" value={formatMoney(agg.avg)} sub="per invoice" />
        <Stat icon={Users} tone="pink" label="Customers" value={agg.customers.toLocaleString('en-IN')} sub={`${agg.mobiles.toLocaleString('en-IN')} mobiles`} />
        <Stat icon={BarChart3} tone="amber" label="Taxable Value" value={formatMoney(agg.taxable)} sub={`${agg.itemRows.toLocaleString('en-IN')} items sold`} />
        <Stat icon={TrendingUp} tone="cyan" label="Total Qty" value={agg.totalQty.toLocaleString('en-IN')} sub={formatMoney(agg.avgCust) + ' per customer'} />
        <Stat icon={Hourglass} tone="red" label="Outstanding Due" value={formatMoney(agg.totalDue)} sub={agg.count ? (100 * agg.totalDue / (agg.totalPaid + agg.totalDue)).toFixed(1) + '% of revenue' : '—'} />
        <Stat icon={ReceiptText} tone="green" label="Date Range" value={fmtDate(agg.minDate)} sub={agg.maxDate ? `→ ${fmtDate(agg.maxDate)}` : ''} />
      </div>

      {/* Revenue trend */}
      <Card className="p-4 lg:p-5">
        <SectionTitle title="Revenue Trend" sub="Monthly collections over time" />
        <div className="h-56 lg:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Payment modes */}
        <Card className="p-4 lg:p-5">
          <SectionTitle title="Payment Modes" sub="Revenue split by payment method" />
          <div className="flex flex-col items-center gap-2">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={payModes} dataKey="value" nameKey="name" innerRadius={50} outerRadius={74} paddingAngle={3} stroke="#000">
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
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={services} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={chartTheme.grid} />
                <XAxis type="number" stroke="none" tick={chartTheme.tick} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v)} />
                <YAxis type="category" dataKey="name" stroke="none" tick={{ ...chartTheme.tick, fill: '#9a9aa3' }} tickLine={false} axisLine={false} width={110} />
                <Tooltip {...chartTheme.tooltip} formatter={(v) => [formatMoney(v), 'Revenue']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {services.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => goTab('invoices')} className="rounded-xl border border-amoled-border2 bg-amoled-card p-4 text-left hover:border-cyan-500/40 transition">
          <div className="text-sm font-semibold">Browse Invoices</div>
          <p className="text-xs text-amoled-dim mt-1">Search, filter & open any invoice</p>
        </button>
        <button onClick={() => goTab('analytics')} className="rounded-xl border border-amoled-border2 bg-amoled-card p-4 text-left hover:border-cyan-500/40 transition">
          <div className="text-sm font-semibold">Deep Analytics</div>
          <p className="text-xs text-amoled-dim mt-1">Providers, date trends & breakdowns</p>
        </button>
      </div>
    </div>
  )
}

function compact(v) {
  if (v >= 100000) return (v / 100000).toFixed(1) + 'L'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return v
}
