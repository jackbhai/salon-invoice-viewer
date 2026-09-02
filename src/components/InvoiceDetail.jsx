import React from 'react'
import { X, Phone, MapPin, CreditCard, ReceiptText, Copy } from 'lucide-react'
import { formatMoneyExact, fmtDateTime } from '../lib/data.js'

export default function InvoiceDetail({ invoice, onClose }) {
  const i = invoice
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-amoled-surface border border-amoled-border rounded-t-2xl sm:rounded-2xl animate-slideup max-h-[92dvh] overflow-y-auto nice-scroll">
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-amoled-border bg-amoled-surface/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-300"><ReceiptText size={18} /></div>
            <div>
              <div className="text-sm font-bold">Invoice {i.invoice_no || ''}</div>
              <div className="text-[11px] text-amoled-dim">{fmtDateTime(i.date)}</div>
            </div>
          </div>
          <button onClick={onClose} className="grid place-items-center w-9 h-9 rounded-lg border border-amoled-border2 text-amoled-muted hover:text-amoled-text"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* customer */}
          <div className="rounded-xl border border-amoled-border bg-amoled-card p-4">
            <div className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wide">Customer</div>
            <div className="mt-1.5 text-base font-bold">{i.customer_name || '—'}</div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-amoled-muted">
              {i.mobile && <span className="inline-flex items-center gap-1"><Phone size={12} /> {i.mobile}</span>}
              {i.place_of_supply && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {i.place_of_supply}</span>}
              {i.payment_mode && <span className="inline-flex items-center gap-1"><CreditCard size={12} /> {i.payment_mode}</span>}
            </div>
          </div>

          {/* items */}
          <div>
            <div className="text-[11px] font-semibold text-amoled-dim uppercase tracking-wide mb-2">Items ({i.items.length})</div>
            <div className="space-y-2">
              {i.items.map((it, idx) => (
                <div key={idx} className="rounded-xl border border-amoled-border bg-amoled-card p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-snug">{it.service}</div>
                    <div className="text-[11px] text-amoled-dim mt-1">
                      {it.qty} × {formatMoneyExact(it.rate)}
                      {it.provider ? ` · ${it.provider}` : ''}
                      {it.sac_hsn ? ` · SAC ${it.sac_hsn}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold num">{formatMoneyExact(it.taxable_value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* totals */}
          <div className="rounded-xl border border-amoled-border2 bg-amoled-card2 p-4 space-y-2 text-sm">
            <Row label="Taxable Value" value={formatMoneyExact(i.taxable_value)} />
            <Row label="Discount" value={formatMoneyExact(i.discount)} />
            {i.sgst > 0 && <Row label="SGST" value={formatMoneyExact(i.sgst)} />}
            {i.cgst > 0 && <Row label="CGST" value={formatMoneyExact(i.cgst)} />}
            {i.coupon_discount > 0 && <Row label="Coupon Discount" value={formatMoneyExact(i.coupon_discount)} />}
            <div className="border-t border-amoled-border pt-2 flex justify-between items-center">
              <span className="font-bold">Grand Total</span>
              <span className="font-extrabold text-lg text-cyan-300 num">{formatMoneyExact(i.total)}</span>
            </div>
            <div className="border-t border-amoled-border pt-2 space-y-1">
              <Row label="Advance Paid" value={formatMoneyExact(i.advance)} />
              <Row label="Amount Paid" value={formatMoneyExact(i.amount_paid)} accent />
              <Row label="Amount Due" value={formatMoneyExact(i.amount_due)} warn={i.amount_due > 0} />
            </div>
          </div>

          {i.items.length === 0 && (
            <div className="text-center text-amoled-dim text-xs">No service items on this invoice.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, accent, warn }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-amoled-muted">{label}</span>
      <span className={`num font-semibold ${warn ? 'text-rose-300' : accent ? 'text-emerald-300' : ''}`}>{value}</span>
    </div>
  )
}
