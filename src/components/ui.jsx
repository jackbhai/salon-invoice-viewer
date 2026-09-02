import React from 'react'

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-xl border border-amoled-border bg-amoled-card ${className}`} {...props}>
      {children}
    </div>
  )
}

export function SectionTitle({ title, sub, right }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        <h3 className="text-sm font-bold text-amoled-text">{title}</h3>
        {sub && <p className="text-xs text-amoled-dim mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

// AMOLED-themed tooltip + axis styling shared with recharts
export const chartTheme = {
  grid: '#1c1c22',
  tick: { fill: '#6b6b74', fontSize: 11 },
  tooltip: {
    contentStyle: {
      background: '#0a0a0a', border: '1px solid #2c2c33', borderRadius: 12,
      color: '#e8e8ea', fontSize: 12, boxShadow: '0 10px 30px rgba(0,0,0,.6)',
    },
    labelStyle: { color: '#9a9aa3' },
  },
}

export function Stat({ icon: Icon, label, value, sub, tone = 'cyan', big }) {
  const tones = {
    cyan: 'text-cyan-300 bg-cyan-500/10',
    violet: 'text-violet-300 bg-violet-500/10',
    green: 'text-emerald-300 bg-emerald-500/10',
    amber: 'text-amber-300 bg-amber-500/10',
    pink: 'text-pink-300 bg-pink-500/10',
    red: 'text-rose-300 bg-rose-500/10',
  }
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`grid place-items-center w-10 h-10 rounded-xl shrink-0 ${tones[tone]}`}>
        {Icon && <Icon size={18} />}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-amoled-muted truncate">{label}</div>
        <div className={`text-sm font-bold num truncate ${big ? 'text-lg' : ''}`}>{value}</div>
        {sub && <div className="text-[11px] text-amoled-dim truncate">{sub}</div>}
      </div>
    </Card>
  )
}
