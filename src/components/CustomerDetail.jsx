import React, { useMemo } from 'react'
import { Phone, MapPin, CreditCard, Users, ReceiptText, CalendarDays, X, CircleDollarSign, Star } from 'lucide-react'
import { customerProfile, formatMoney, fmtDateTime, fmtDate } from '../lib/data.js'

export default function CustomerDetail({ invoices, name, onClose }) {
  const p = useMemo(() => customerProfile(invoices, name), [invoices, name])

  const maxCount = p.services.length ? p.services[0][1] : 1

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-amoled-surface border border-amoled-border rounded-t-2xl sm:rounded-2xl animate-slideup max-h-[92dvh] overflow-y-auto nice-scroll">
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-amoled-border bg-amoled-surface/95 backdrop-blur">
          <div className="grid place-items-center w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/25 to-violet-500/25 text-cyan-300 text-lg font-bold">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold truncate">{name}</div>
            <div className="text-[11px] text-amoled-dim flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1"><Users size={11} /> {p.count} visits</span>
              <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {p.first ? fmtDate(p.first) : '—'}</span>
            </div>
          </div>
          <button onClick={onClose} className="ml-auto grid place-items-center w-9 h-9 rounded-lg border border-amoled-border2 text-amoled-muted hover:text-amoled-text"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* contact */}
          <div className="rounded-xl border border-amoled-border bg-amoled-card p-4 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-amoled-muted">
              {p.mobile && <span className="inline-flex items-center gap-1"><Phone size={13} /> {p.mobile}</span>}
              {p.pos && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {p.pos}</span>}
              {p.modes[0] && <span className="inline-flex items-center gap-1"><CreditCard size={13} /> {p.modes[0][0]}</span>}
            </div>
            <div className="mt-2 text-[11px] text-amoled-dim">First visit {p.first ? fmtDate(p.first) : '—'} · Last visit {p.last ? fmtDate(p.last) : '—'}</div>
          </div>

          {/* spend stats */}
          <div className="grid grid-cols-3 gap-3">
            <BigStat label="Total spent" value={formatMoney(p.total)} tone="text-cyan-300" />
            <BigStat label="Avg. per visit" value={formatMoney(p.avg)} tone="text-violet-300" />
            <BigStat label="Outstanding" value={formatMoney(p.due)} tone={p.due > 0 ? 'text-rose-300' : 'text-emerald-300'} />
          </div>

          {/* favorite services */}
          <div>
            <div className="text-[11px] font-semibold text-amoled-dim uppercase tracking-wide mb-2">Favorite services</div>
            <div className="space-y-2">
              {p.services.slice(0, 10).map(([sv, c], i) => (
                <div key={sv} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-amoled-muted flex items-center gap-1.5">
                      {i === 0 && <Star size={11} className="text-amber-300" />} {sv}
                    </span>
                    <span className="num text-amoled-text font-medium">{c}×</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-amoled-card2 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: (100 * c / maxCount) + '%' }} />
                  </div>
                </div>
              ))}
              {p.services.length === 0 && <div className="text-xs text-amoled-dim">No service data.</div>}
            </div>
          </div>

          {/* visited with providers */}
          {p.providers.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-amoled-dim uppercase tracking-wide mb-2">Served by</div>
              <div className="flex flex-wrap gap-1.5">
                {p.providers.map((pr) => <span key={pr} className="text-[11px] px-2 py-1 rounded-md bg-amoled-card2 border border-amoled-border2 text-amoled-muted">{pr}</span>)}
              </div>
            </div>
          )}

          {/* full history */}
          <div>
            <div className="text-[11px] font-semibold text-amoled-dim uppercase tracking-wide mb-2 flex items-center gap-1.5"><ReceiptText size={11} /> Billing history ({p.count})</div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto nice-scroll pr-1">
              {[...p.invoices].reverse().map((i) => (
                <div key={i.id} className="rounded-lg border border-amoled-border/70 bg-amoled-card p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{i.invoice_no || i.customer_name}</div>
                    <div className="text-[10px] text-amoled-dim num">{fmtDateTime(i.date)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold num text-cyan-300">{formatMoney(i.total)}</div>
                    {i.amount_due > 0 && <div className="text-[10px] text-rose-300 num">{formatMoney(i.amount_due)} due</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BigStat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-amoled-border bg-amoled-card2 p-3 text-center">
      <div className="text-[10px] font-medium uppercase tracking-wide text-amoled-dim">{label}</div>
      <div className={`mt-1 text-base font-extrabold num ${tone}`}>{value}</div>
    </div>
  )
}
