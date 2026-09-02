import React, { useMemo, useRef, useState } from 'react'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, ReceiptText, Download, FileJson, FileSpreadsheet, MapPin, CreditCard } from 'lucide-react'
import { Card, SectionTitle } from './ui.jsx'
import { formatMoney, fmtDateTime, toNum } from '../lib/data.js'
import InvoiceDetail from './InvoiceDetail.jsx'

const PAGE = 20

export default function Invoices({ data }) {
  const invoices = data.invoices
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState({ from: '', to: '', pay: '', provider: '', service: '', sort: 'date-desc', min: '', max: '' })
  const [showFilter, setShowFilter] = useState(false)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(null)
  const fileRef = useRef(null)

  const providers = useMemo(() => {
    const s = new Set()
    invoices.forEach((i) => i.items.forEach((it) => it.provider && s.add(it.provider.trim())))
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [invoices])

  const services = useMemo(() => {
    const s = new Set()
    invoices.forEach((i) => i.items.forEach((it) => it.service && s.add(it.service.trim())))
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [invoices])

  const payModes = useMemo(() => {
    const s = new Set(invoices.map((i) => i.payment_mode).filter(Boolean))
    return [...s].sort()
  }, [invoices])

  const filtered = useMemo(() => {
    let list = invoices
    const ql = q.trim().toLowerCase()
    if (ql) {
      list = list.filter((i) =>
        (i.customer_name || '').toLowerCase().includes(ql) ||
        (i.mobile || '').includes(ql) ||
        (i.invoice_no || '').toLowerCase().includes(ql) ||
        (i.items || []).some((it) => it.service.toLowerCase().includes(ql) || it.provider.toLowerCase().includes(ql))
      )
    }
    if (filter.from) { const t = new Date(filter.from); list = list.filter((i) => i.date && i.date >= t) }
    if (filter.to) { const t = new Date(filter.to); t.setHours(23, 59, 59, 999); list = list.filter((i) => i.date && i.date <= t) }
    if (filter.pay) list = list.filter((i) => i.payment_mode === filter.pay)
    if (filter.provider) list = list.filter((i) => i.items.some((it) => it.provider === filter.provider))
    if (filter.service) list = list.filter((i) => i.items.some((it) => it.service.trim() === filter.service.trim()))
    if (filter.min !== '') list = list.filter((i) => i.total >= toNum(filter.min))
    if (filter.max !== '') list = list.filter((i) => i.total <= toNum(filter.max))

    const sorted = [...list]
    sorted.sort((a, b) => {
      switch (filter.sort) {
        case 'date-asc': return (a.date || 0) - (b.date || 0)
        case 'amount-high': return b.total - a.total
        case 'amount-low': return a.total - b.total
        case 'name': return (a.customer_name || '').localeCompare(b.customer_name || '')
        default: return (b.date || 0) - (a.date || 0)
      }
    })
    return sorted
  }, [invoices, q, filter])

  const totalPages = Math.ceil(filtered.length / PAGE) || 1
  const pageItems = filtered.slice(page * PAGE, page * PAGE + PAGE)

  function reset() {
    setFilter({ from: '', to: '', pay: '', provider: '', service: '', sort: 'date-desc', min: '', max: '' })
    setQ(''); setPage(0)
  }
  function activeFilterCount() {
    return Object.entries(filter).filter(([k, v]) => !['sort'].includes(k) && v !== '').length + (q.trim() ? 1 : 0)
  }

  function exportCSV() {
    const header = ['invoice_no', 'invoice_date', 'customer_name', 'mobile', 'place_of_supply', 'payment_mode', 'total_qty', 'taxable_value', 'discount', 'sgst', 'cgst', 'total', 'amount_paid', 'amount_due', 'items']
    const esc = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"'
    const rows = filtered.map((i) => [
      i.invoice_no, i.invoice_date_raw, i.customer_name, i.mobile, i.place_of_supply, i.payment_mode,
      i.total_qty, i.taxable_value, i.discount, i.sgst, i.cgst, i.total, i.amount_paid, i.amount_due,
      i.items.map((it) => `${it.service} x${it.qty} @${it.rate}`).join('; '),
    ])
    const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')
    download(new Blob(['\ufeff' + csv], { type: 'text/csv' }), 'invoices-filtered.csv')
  }

  function exportJSON() {
    download(new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' }), 'invoices-filtered.json')
  }

  function download(blob, name) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-4 animate-fadein">
      {/* search + filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amoled-dim" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0) }}
            placeholder="Search name, mobile, invoice no…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-amoled-card border border-amoled-border text-sm placeholder:text-amoled-dim outline-none focus:border-cyan-500/40"
          />
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`h-10 px-3 rounded-xl border text-sm flex items-center gap-2 ${activeFilterCount() ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' : 'border-amoled-border2 text-amoled-muted bg-amoled-card'}`}
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount() > 0 && <span className="grid place-items-center w-5 h-5 rounded-full bg-cyan-500 text-black text-[11px] font-bold">{activeFilterCount()}</span>}
        </button>
      </div>

      {/* filter panel */}
      {showFilter && (
        <Card className="p-4 animate-slideup">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Field label="From date"><input type="date" value={filter.from} onChange={(e) => { setFilter({ ...filter, from: e.target.value }); setPage(0) }} className="ipt" /></Field>
            <Field label="To date"><input type="date" value={filter.to} onChange={(e) => { setFilter({ ...filter, to: e.target.value }); setPage(0) }} className="ipt" /></Field>
            <Field label="Payment mode">
              <select value={filter.pay} onChange={(e) => { setFilter({ ...filter, pay: e.target.value }); setPage(0) }} className="ipt">
                <option value="">All</option>
                {payModes.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Provider">
              <select value={filter.provider} onChange={(e) => { setFilter({ ...filter, provider: e.target.value }); setPage(0) }} className="ipt">
                <option value="">All</option>
                {providers.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Service">
              <select value={filter.service} onChange={(e) => { setFilter({ ...filter, service: e.target.value }); setPage(0) }} className="ipt">
                <option value="">All</option>
                {services.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Sort by">
              <select value={filter.sort} onChange={(e) => setFilter({ ...filter, sort: e.target.value })} className="ipt">
                <option value="date-desc">Newest</option>
                <option value="date-asc">Oldest</option>
                <option value="amount-high">Amount high → low</option>
                <option value="amount-low">Amount low → high</option>
                <option value="name">Customer name</option>
              </select>
            </Field>
            <Field label="Min amount"><input inputMode="numeric" value={filter.min} onChange={(e) => { setFilter({ ...filter, min: e.target.value.replace(/[^\d.]/g, '') }); setPage(0) }} placeholder="0" className="ipt" /></Field>
            <Field label="Max amount"><input inputMode="numeric" value={filter.max} onChange={(e) => { setFilter({ ...filter, max: e.target.value.replace(/[^\d.]/g, '') }); setPage(0) }} placeholder="∞" className="ipt" /></Field>
          </div>
          <div className="flex items-center justify-between mt-4">
            <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs text-amoled-muted hover:text-amoled-text px-2 py-1"><X size={14} /> Clear all</button>
            <div className="text-xs text-amoled-dim num">{filtered.length.toLocaleString('en-IN')} results</div>
          </div>
        </Card>
      )}

      {/* result meta + export */}
      <div className="flex items-center justify-between">
        <SectionTitle title="Invoices" sub={`${filtered.length.toLocaleString('en-IN')} of ${invoices.length.toLocaleString('en-IN')}`} />
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-amoled-border2 text-amoled-muted hover:text-amoled-text"><FileSpreadsheet size={13} /> CSV</button>
          <button onClick={exportJSON} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-amoled-border2 text-amoled-muted hover:text-amoled-text"><FileJson size={13} /> JSON</button>
        </div>
      </div>

      {/* list */}
      <div className="space-y-2">
        {pageItems.length === 0 && (
          <Card className="p-10 text-center text-amoled-dim text-sm">No invoices match your filters.</Card>
        )}
        {pageItems.map((i) => (
          <button
            key={i.id}
            onClick={() => setSelected(i)}
            className="w-full text-left rounded-xl border border-amoled-border bg-amoled-card p-3.5 flex items-center gap-3 hover:border-cyan-500/30 hover:bg-amoled-card2 transition"
          >
            <div className="grid place-items-center w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-300 shrink-0"><ReceiptText size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{i.customer_name || '—'}</span>
                {i.payment_mode && <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amoled-card2 text-amoled-dim"><CreditCard size={10} />{i.payment_mode}</span>}
              </div>
              <div className="text-[11px] text-amoled-dim mt-0.5 truncate">
                {i.invoice_no ? `${i.invoice_no} · ` : ''}{i.mobile || ''}{i.place_of_supply ? ` · ${i.place_of_supply}` : ''}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold num text-cyan-300">{formatMoney(i.total)}</div>
              <div className="text-[10px] text-amoled-dim num mt-0.5">{fmtDateTime(i.date)}</div>
            </div>
          </button>
        ))}
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="grid place-items-center w-9 h-9 rounded-lg border border-amoled-border2 text-amoled-muted disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="text-sm text-amoled-dim num">{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="grid place-items-center w-9 h-9 rounded-lg border border-amoled-border2 text-amoled-muted disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      )}

      {selected && <InvoiceDetail invoice={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-amoled-dim mb-1 block">{label}</span>
      {children}
    </label>
  )
}
