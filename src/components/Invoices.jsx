import React, { useMemo, useRef, useState } from 'react'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, ReceiptText, Download, FileJson, FileSpreadsheet, MapPin, CreditCard, CheckSquare, Square, Cpu, Eraser } from 'lucide-react'
import { Card, SectionTitle } from './ui.jsx'
import { formatMoney, fmtDateTime, toNum, buildCSV } from '../lib/data.js'
import InvoiceDetail from './InvoiceDetail.jsx'

const PAGE = 20

export default function Invoices({ data }) {
  const invoices = data.invoices
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState({ from: '', to: '', pay: '', provider: '', service: '', sort: 'date-desc', min: '', max: '', onlyDue: false, onlyUntagged: false, noMobile: false })
  const [showFilter, setShowFilter] = useState(false)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(null)
  const [selIds, setSelIds] = useState(new Set())

  const providers = useMemo(() => { const s = new Set(); invoices.forEach((i) => i.items.forEach((it) => it.provider && s.add(it.provider.trim()))); return [...s].sort((a, b) => a.localeCompare(b)) }, [invoices])
  const services = useMemo(() => { const s = new Set(); invoices.forEach((i) => i.items.forEach((it) => it.service && s.add(it.service.trim()))); return [...s].sort((a, b) => a.localeCompare(b)) }, [invoices])
  const payModes = useMemo(() => { const s = new Set(invoices.map((i) => i.payment_mode).filter(Boolean)); return [...s].sort() }, [invoices])

  const filtered = useMemo(() => {
    let list = invoices
    const ql = q.trim().toLowerCase()
    if (ql) list = list.filter((i) => (i.customer_name || '').toLowerCase().includes(ql) || (i.mobile || '').includes(ql) || (i.invoice_no || '').toLowerCase().includes(ql) || (i.items || []).some((it) => it.service.toLowerCase().includes(ql) || it.provider.toLowerCase().includes(ql)))
    if (filter.from) { const t = new Date(filter.from); list = list.filter((i) => i.date && i.date >= t) }
    if (filter.to) { const t = new Date(filter.to); t.setHours(23, 59, 59, 999); list = list.filter((i) => i.date && i.date <= t) }
    if (filter.pay) list = list.filter((i) => i.payment_mode === filter.pay)
    if (filter.provider) list = list.filter((i) => i.items.some((it) => it.provider === filter.provider))
    if (filter.service) list = list.filter((i) => i.items.some((it) => it.service.trim() === filter.service.trim()))
    if (filter.min !== '') list = list.filter((i) => i.total >= toNum(filter.min))
    if (filter.max !== '') list = list.filter((i) => i.total <= toNum(filter.max))
    if (filter.onlyDue) list = list.filter((i) => i.amount_due > 0)
    if (filter.onlyUntagged) list = list.filter((i) => !i.customer_name)
    if (filter.noMobile) list = list.filter((i) => !i.mobile)
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

  function applyPreset(name) {
    if (name === 'due') setFilter({ ...filter, onlyDue: true, pay: '', from: '', to: '' })
    else if (name === 'today') { const d = new Date().toISOString().split('T')[0]; setFilter({ ...filter, from: d, to: d, onlyDue: false }) }
    else if (name === 'month') { const d = new Date(); const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; const to = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}`; setFilter({ ...filter, from, to, onlyDue: false }) }
    else if (name === 'cash') setFilter({ ...filter, pay: 'Cash', onlyDue: false })
    setPage(0)
  }
  function reset() { setFilter({ from: '', to: '', pay: '', provider: '', service: '', sort: 'date-desc', min: '', max: '', onlyDue: false, onlyUntagged: false, noMobile: false }); setQ(''); setPage(0); setSelIds(new Set()) }
  function activeFilterCount() { return Object.entries(filter).filter(([k, v]) => !['sort'].includes(k) && (v === true || v !== '')).length + (q.trim() ? 1 : 0) }

  function toggleSel(id) {
    const n = new Set(selIds)
    if (n.has(id)) n.delete(id); else n.add(id)
    setSelIds(n)
  }
  function toggleAll() {
    if (pageItems.every((i) => selIds.has(i.id))) {
      const n = new Set(selIds); pageItems.forEach((i) => n.delete(i.id)); setSelIds(n)
    } else {
      setSelIds(new Set([...selIds, ...pageItems.map((i) => i.id)]))
    }
  }

  function exportCSV() {
    const rows = filtered.map((i) => [i.invoice_no, i.invoice_date_raw, i.customer_name, i.mobile, i.place_of_supply, i.payment_mode, i.total_qty, i.taxable_value, i.discount, i.sgst, i.cgst, i.total, i.amount_paid, i.amount_due, i.items.map((it) => `${it.service} x${it.qty} @${it.rate}`).join('; ')])
    download(new Blob(['\ufeff' + buildCSV(rows, ['invoice_no', 'invoice_date', 'customer_name', 'mobile', 'place_of_supply', 'payment_mode', 'total_qty', 'taxable_value', 'discount', 'sgst', 'cgst', 'total', 'amount_paid', 'amount_due', 'items'])]), 'invoices-filtered.csv')
  }
  function exportJSON() { download(new Blob([JSON.stringify(filtered, null, 2)]), 'invoices-filtered.json') }
  function exportSelected() {
    const sel = filtered.filter((i) => selIds.has(i.id))
    download(new Blob([JSON.stringify(sel, null, 2)]), 'invoices-selected.json')
  }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href) }

  return (
    <div className="space-y-4 animate-fadein">
      {/* presets */}
      <div className="flex gap-2 overflow-x-auto nice-scroll -mx-1 px-1 pb-1">
        <Preset label="🔍 Quick" active={activeFilterCount() === 0} onClick={() => { reset() }} />
        <Preset label="💳 Pending dues" active={filter.onlyDue} onClick={() => applyPreset('due')} />
        <Preset label="📅 Today" active={false} onClick={() => applyPreset('today')} />
        <Preset label="🗓 This month" active={false} onClick={() => applyPreset('month')} />
        <Preset label="💵 Cash" active={filter.pay === 'Cash'} onClick={() => applyPreset('cash')} />
      </div>

      {/* search + filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amoled-dim" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Search name, mobile, invoice no…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-amoled-card border border-amoled-border text-sm placeholder:text-amoled-dim outline-none focus:border-cyan-500/40" />
        </div>
        <button onClick={() => setShowFilter((v) => !v)} className={`h-10 px-3 rounded-xl border text-sm flex items-center gap-2 ${activeFilterCount() ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' : 'border-amoled-border2 text-amoled-muted bg-amoled-card'}`}>
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount() > 0 && <span className="grid place-items-center w-5 h-5 rounded-full bg-cyan-500 text-black text-[11px] font-bold">{activeFilterCount()}</span>}
        </button>
      </div>

      {showFilter && (
        <Card className="p-4 animate-slideup">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Field label="From date"><input type="date" value={filter.from} onChange={(e) => { setFilter({ ...filter, from: e.target.value }); setPage(0) }} className="ipt" /></Field>
            <Field label="To date"><input type="date" value={filter.to} onChange={(e) => { setFilter({ ...filter, to: e.target.value }); setPage(0) }} className="ipt" /></Field>
            <Field label="Payment mode"><select value={filter.pay} onChange={(e) => { setFilter({ ...filter, pay: e.target.value }); setPage(0) }} className="ipt"><option value="">All</option>{payModes.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
            <Field label="Provider"><select value={filter.provider} onChange={(e) => { setFilter({ ...filter, provider: e.target.value }); setPage(0) }} className="ipt"><option value="">All</option>{providers.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
            <Field label="Service"><select value={filter.service} onChange={(e) => { setFilter({ ...filter, service: e.target.value }); setPage(0) }} className="ipt"><option value="">All</option>{services.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            <Field label="Sort by"><select value={filter.sort} onChange={(e) => setFilter({ ...filter, sort: e.target.value })} className="ipt"><option value="date-desc">Newest</option><option value="date-asc">Oldest</option><option value="amount-high">Amount high → low</option><option value="amount-low">Amount low → high</option><option value="name">Customer name</option></select></Field>
            <Field label="Min amount"><input inputMode="numeric" value={filter.min} onChange={(e) => { setFilter({ ...filter, min: e.target.value.replace(/[^\d.]/g, '') }); setPage(0) }} placeholder="0" className="ipt" /></Field>
            <Field label="Max amount"><input inputMode="numeric" value={filter.max} onChange={(e) => { setFilter({ ...filter, max: e.target.value.replace(/[^\d.]/g, '') }); setPage(0) }} placeholder="∞" className="ipt" /></Field>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
            <Toggle label="Pending due only" checked={filter.onlyDue} onChange={(v) => { setFilter({ ...filter, onlyDue: v }); setPage(0) }} />
            <Toggle label="No customer name" checked={filter.onlyUntagged} onChange={(v) => { setFilter({ ...filter, onlyUntagged: v }); setPage(0) }} />
            <Toggle label="No mobile" checked={filter.noMobile} onChange={(v) => { setFilter({ ...filter, noMobile: v }); setPage(0) }} />
          </div>
          <div className="flex items-center justify-between mt-4">
            <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs text-amoled-muted hover:text-amoled-text px-2 py-1"><Eraser size={14} /> Clear all</button>
            <div className="text-xs text-amoled-dim num">{filtered.length.toLocaleString('en-IN')} results</div>
          </div>
        </Card>
      )}

      {/* bulk select bar */}
      {selIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 animate-fade-down">
          <span className="text-xs text-cyan-300 num">{selIds.size} selected</span>
          <div className="flex gap-2">
            <button onClick={exportSelected} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/30"><FileJson size={13} /> Export</button>
            <button onClick={() => setSelIds(new Set())} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-amoled-border2 text-amoled-muted"><X size={14} /> Clear</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <SectionTitle title="Invoices" sub={`${filtered.length.toLocaleString('en-IN')} of ${invoices.length.toLocaleString('en-IN')}`} />
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-amoled-border2 text-amoled-muted hover:text-amoled-text"><FileSpreadsheet size={13} /> CSV</button>
          <button onClick={exportJSON} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-amoled-border2 text-amoled-muted hover:text-amoled-text"><FileJson size={13} /> JSON</button>
        </div>
      </div>

      <div className="space-y-2">
        {pageItems.length === 0 && <Card className="p-10 text-center text-amoled-dim text-sm">No invoices match your filters.</Card>}
        {pageItems.map((i) => {
          const isSel = selIds.has(i.id)
          return (
            <div key={i.id} className={`rounded-xl border bg-amoled-card flex items-center gap-2 p-3.5 transition ${isSel ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-amoled-border hover:border-cyan-500/30 hover:bg-amoled-card2'}`}>
              <button onClick={() => toggleSel(i.id)} className="shrink-0 text-amoled-dim hover:text-cyan-300" aria-label="select">
                {isSel ? <CheckSquare size={18} className="text-cyan-300" /> : <Square size={18} />}
              </button>
              <button onClick={() => setSelected(i)} className="flex-1 min-w-0 text-left flex items-center gap-3">
                <div className="grid place-items-center w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-300 shrink-0"><ReceiptText size={18} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{i.customer_name || '—'}</span>
                    {i.payment_mode && <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amoled-card2 text-amoled-dim"><CreditCard size={10} />{i.payment_mode}</span>}
                    {i.amount_due > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-300 shrink-0">due</span>}
                  </div>
                  <div className="text-[11px] text-amoled-dim mt-0.5 truncate">{i.invoice_no ? `${i.invoice_no} · ` : ''}{i.mobile || ''}{i.place_of_supply ? ` · ${i.place_of_supply}` : ''}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold num text-cyan-300">{formatMoney(i.total)}</div>
                  <div className="text-[10px] text-amoled-dim num mt-0.5">{fmtDateTime(i.date)}</div>
                </div>
              </button>
            </div>
          )
        })}
      </div>

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

function Preset({ label, active, onClick }) {
  return <button onClick={onClick} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${active ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-amoled-card text-amoled-muted border-amoled-border2'}`}>{label}</button>
}
function Field({ label, children }) { return <label className="block"><span className="text-[11px] font-medium text-amoled-dim mb-1 block">{label}</span>{children}</label> }
function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-amoled-muted cursor-pointer">
      <button onClick={(e) => { e.preventDefault(); onChange(!checked) }} className={`w-9 h-5 rounded-full relative transition ${checked ? 'bg-cyan-500' : 'bg-amoled-card2 border border-amoled-border2'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      {label}
    </label>
  )
}
