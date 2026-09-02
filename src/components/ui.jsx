import React from 'react'
import { CalendarRange } from 'lucide-react'
import { RANGES } from '../lib/data.js'

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

const STAT_TONES = {
  cyan: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/15',
  violet: 'text-violet-300 bg-violet-500/10 border-violet-500/15',
  green: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/15',
  amber: 'text-amber-300 bg-amber-500/10 border-amber-500/15',
  pink: 'text-pink-300 bg-pink-500/10 border-pink-500/15',
  red: 'text-rose-300 bg-rose-500/10 border-rose-500/15',
}

export function Stat({ icon: Icon, label, value, sub, tone = 'cyan', big, float }) {
  return (
    <Card className={`p-4 flex items-center gap-3 fade-up ${float ? 'float-soft' : ''}`}>
      <div className={`grid place-items-center w-10 h-10 rounded-xl shrink-0 border ${STAT_TONES[tone]}`}>
        {Icon && <Icon size={18} />}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-amoled-muted truncate">{label}</div>
        <div className={`text-sm font-bold num truncate ${big ? 'text-xl' : 'text-lg'} text-amoled-text`}>{value}</div>
        {sub && <div className="text-[11px] text-amoled-dim truncate">{sub}</div>}
      </div>
    </Card>
  )
}

// Reusable date-range filter chips (Today/Week/Month/...) + custom date inputs
export function RangePicker({ range, setRange, start, setStart, end, setEnd }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto nice-scroll -mx-1 px-1 pb-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              range === r.id ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-amoled-card text-amoled-muted border-amoled-border2 hover:border-cyan-500/30'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {range === 'custom' && (
        <div className="flex items-center gap-2 fade-down">
          <CalendarRange size={16} className="text-amoled-dim shrink-0" />
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="ipt flex-1" />
          <span className="text-amoled-dim text-xs">→</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="ipt flex-1" />
        </div>
      )}
    </div>
  )
}

// animated number that pops when value changes
export function PopNum({ value, className }) {
  return <span key={value} className={`num pop ${className || ''}`}>{value}</span>
}
