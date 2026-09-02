// Bill export helpers — render a styled bill, capture as PNG image, PDF (print), or share.
import html2canvas from 'html2canvas'
import { formatMoney } from './data.js'

// Build the bill DOM as a string for a given invoice + shop context.
export function billMarkup(invoice, shop) {
  const line = (l, v, strong) => `<tr><td class="bl">${l}</td><td class="bv${strong ? ' bs' : ''}">${v}</td></tr>`
  const items = invoice.items.map((it) => `
    <tr>
      <td class="it-n">${esc(it.service)}</td>
      <td class="it-c">${it.sac_hsn || '—'}</td>
      <td class="it-r">${it.rate != null ? fmt(it.rate) : '—'}</td>
      <td class="it-q">${it.qty}</td>
      <td class="it-v">${fmt(it.taxable_value)}</td>
    </tr>`).join('')
  return `
  <div class="bill" style="width:360px;padding:18px;font-family:'Inter',system-ui,sans-serif;color:#111;background:#fff;border:1px solid #ccc;border-radius:8px;">
    <div style="text-align:center;border-bottom:1px solid #ccc;padding-bottom:10px;">
      <div style="font-size:22px;font-weight:800;letter-spacing:1px;">${esc(shop?.name || '')}</div>
      <div style="font-size:10px;color:#555;margin:2px 0;">${esc(shop?.address || '')}</div>
      <div style="font-size:10px;color:#555;">Contact: ${esc(shop?.contact || '')}</div>
      <div style="font-size:11px;font-weight:700;margin-top:3px;">GSTIN: ${esc(shop?.gstin || '')}</div>
    </div>
    <div style="text-align:center;font-size:13px;font-weight:800;text-decoration:underline;margin:8px 0 2px;">TAX INVOICE</div>
    <div style="text-align:center;font-size:9px;color:#777;margin-bottom:8px;">Original for Recipient</div>
    <table class="bb" style="width:100%;font-size:11px;border-collapse:collapse;">
      <tr><td class="bl">Customer</td><td class="bv">${esc(invoice.customer_name || '—')}</td></tr>
      <tr><td class="bl">Mobile</td><td class="bv">${esc(invoice.mobile || '—')}</td></tr>
      <tr><td class="bl">Invoice No</td><td class="bv">${esc(invoice.invoice_no || '')}</td></tr>
      <tr><td class="bl">Date</td><td class="bv">${esc(invoice.invoice_date_raw || '')}</td></tr>
      <tr><td class="bl">POS</td><td class="bv">${esc(invoice.place_of_supply || 'Delhi')}</td></tr>
    </table>
    <table class="bb" style="width:100%;font-size:10px;border-collapse:collapse;margin-top:8px;">
      <thead><tr>
        <th class="it-n">Service</th><th class="it-c">SAC</th><th class="it-r">Rate</th>
        <th class="it-q">Qty</th><th class="it-v">Value</th>
      </tr></thead>
      <tbody>${items}</tbody>
    </table>
    <div style="border-top:1px solid #ccc;margin-top:8px;padding-top:6px;">
      <table class="bb" style="width:100%;font-size:11px;border-collapse:collapse;">
        ${line('Taxable Value', fmt(invoice.taxable_value))}
        ${line('Discount', '− ' + fmt(invoice.discount), invoice.discount > 0)}
        ${invoice.sgst > 0 ? line('SGST', fmt(invoice.sgst)) : ''}
        ${invoice.cgst > 0 ? line('CGST', fmt(invoice.cgst)) : ''}
        ${line('Total', fmt(invoice.total), true)}
        ${line('Advance', fmt(invoice.advance))}
        ${line('Amount Paid', fmt(invoice.amount_paid), true)}
        ${line('Amount Due', fmt(invoice.amount_due), invoice.amount_due > 0)}
      </table>
    </div>
    <div style="text-align:center;font-size:9px;color:#777;margin-top:10px;border-top:1px solid #ccc;padding-top:8px;">
      Computer generated invoice · ${esc(shop?.company || '')}
    </div>
  </div>`
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
function fmt(v) {
  const n = Number(v)
  return isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'
}

// Render bill into a hidden host, capture PNG, trigger download. Returns file size.
export async function downloadBillPNG(invoice, shop) {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:360px;z-index:-1;background:#fff'
  host.innerHTML = billMarkup(invoice, shop)
  document.body.appendChild(host)
  try {
    const el = host.firstElementChild
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `bill-${invoice.invoice_no || 'invoice'}.png`
    a.click()
    return true
  } finally {
    document.body.removeChild(host)
  }
}

// Open a printable bill window (Save as PDF via browser print).
export function printBill(invoice, shop) {
  const w = window.open('', '_blank', 'width=420,height=720')
  if (!w) return false
  w.document.write(`<!doctype html><html><head><title>${esc(invoice.invoice_no || 'Bill')}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:'Inter',system-ui,sans-serif;margin:0;padding:16px;color:#111;background:#fff}
      table{width:100%;border-collapse:collapse}
      th,td{border-bottom:1px solid #eee;padding:4px 6px;text-align:left;font-size:11px;vertical-align:top}
      th{font-size:9px;text-transform:uppercase;color:#666}
      .it-r,.it-q,.it-v{text-align:right}
      .bl{color:#555}.bv{font-weight:600}
      thead th{border-bottom:1px solid #ccc}
      @media print{ .noprint{display:none} }
    </style></head>
    <body>
    ${billMarkup(invoice, shop)}
    <div class="noprint" style="text-align:center;margin-top:14px">
      <button onclick="window.print()" style="padding:8px 16px;cursor:pointer">Print / Save as PDF</button>
    </div>
    </body></html>`)
  w.document.close()
  w.focus()
  return true
}

// Native share (mobile) — share a text summary of the bill.
export async function shareBill(invoice) {
  const lines = [invoice.customer_name ? `Bill for ${invoice.customer_name}` : 'Bill',
    `Invoice: ${invoice.invoice_no || '—'} · ${invoice.invoice_date_raw || ''}`,
    ...(invoice.items || []).map((it) => `• ${it.service} x${it.qty} = ₹${fmt(it.taxable_value)}`),
    `Total: ₹${fmt(invoice.total)} · Paid ₹${fmt(invoice.amount_paid)}`]
  const text = lines.join('\n')
  if (navigator.share) {
    try { await navigator.share({ title: 'Invoice', text, url: location.href }); return 'shared' } catch (e) { /* cancelled */ return 'failed' }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch (e) { return 'failed' }
}
