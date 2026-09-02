// ---- Utility helpers & data normalization for the invoice viewer ----

export const CURRENCY = '₹'

export function formatMoney(value) {
  const n = Number(value)
  if (!isFinite(n)) return `${CURRENCY}0`
  const opts = { minimumFractionDigits: 0, maximumFractionDigits: 2 }
  return `${CURRENCY}${n.toLocaleString('en-IN', opts)}`
}

export function formatMoneyExact(value) {
  const n = Number(value)
  if (!isFinite(n)) return `${CURRENCY}0.00`
  return `${CURRENCY}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function toNum(value) {
  if (value === null || value === undefined || value === '') return 0
  const n = Number(String(value).replace(/,/g, ''))
  return isFinite(n) ? n : 0
}

// invoice_date is like "31-12-2022 10:56 PM" (dd-mm-yyyy)
export function parseDate(value) {
  if (!value) return null
  let s = String(value).trim()
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?$/i)
  if (!m) {
    const d = new Date(s)
    return isNaN(d) ? null : d
  }
  let [, dd, mm, yyyy, hh, min, ap] = m
  let year = Number(yyyy); if (yyyy.length === 2) year += 2000
  let hour = Number(hh || 0)
  if (ap) {
    ap = ap.toUpperCase()
    if (ap === 'PM' && hour < 12) hour += 12
    if (ap === 'AM' && hour === 12) hour = 0
  }
  return new Date(year, Number(mm) - 1, Number(dd), hour, Number(min || 0), 0)
}

export function fmtDate(dt) {
  if (!dt) return '—'
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(dt) {
  if (!dt) return '—'
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ---- Normalize incoming JSON into a flat array of normalized invoice objects ----
export function normalizeData(raw) {
  let invoices = []
  let shop = null
  let meta = { source: 'unknown', totalRaw: 0 }

  if (Array.isArray(raw)) {
    invoices = raw
  } else if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.invoices)) {
      invoices = raw.invoices
      shop = raw.shop || null
    } else if (Array.isArray(raw.data)) {
      invoices = raw.data
    } else {
      // assume it's a map of invoiceNo -> object, or {shop, ...}
      const keys = Object.keys(raw)
      if (keys.length && typeof raw[keys[0]] === 'object' && raw[keys[0]] !== null && !Array.isArray(raw[keys[0]])) {
        meta.source = 'map'
        invoices = keys.map((k) => (typeof raw[k] === 'object' ? { ...raw[k], _key: k } : raw[k]))
      } else {
        meta.source = 'single'
        invoices = [raw]
      }
    }
  }

  const normalized = invoices.filter(Boolean).map((inv) => normalizeInvoice(inv, meta))
  return { invoices: normalized, shop, meta }
}

function normalizeInvoice(inv, meta) {
  const dt = parseDate(inv.invoice_date || inv.date)
  const items = Array.isArray(inv.items) ? inv.items.map((it) => ({
    service: it.service || it.name || it.item || '',
    sac_hsn: it.sac_hsn || it.hsn || it.sac || '',
    provider: it.provider || '',
    rate: toNum(it.rate),
    qty: toNum(it.qty || 1),
    taxable_value: toNum(it.taxable_value ?? it.amount ?? it.value),
    discount: toNum(it.discount),
  })) : []

  const taxable = toNum(inv.taxable_value ?? inv.taxableValue ?? inv.tax ?? inv.totals?.Taxable_Value ?? inv.totals?.Tax)
  const total = toNum(inv.total ?? inv.grand_total ?? inv.grandTotal ?? inv.amount ?? inv.totals?.Total)
  const paid = toNum(inv.amount_paid ?? inv.amountPaid ?? inv.totals?.Amount_Paid)
  const due = toNum(inv.amount_due ?? inv.amountDue ?? (inv.totals?.Amount_Due ?? 0))

  return {
    id: String(inv.inv_mencr ?? inv.id ?? inv._key ?? (inv.invoice_no || '')) ,
    invoice_no: (inv.invoice_no || inv.invoiceNo || '') ,
    invoice_date_raw: inv.invoice_date || '',
    date: dt,
    customer_name: inv.customer_name || inv.customer || inv.name || '',
    mobile: inv.mobile || inv.mobile_no || inv.phone || '',
    place_of_supply: inv.place_of_supply || inv.pos || '',
    payment_mode: (inv.payment_mode || inv.paymentMode || '').trim(),
    total_qty: toNum(inv.total_qty ?? inv.totals?.Total_Qty),
    taxable_value: taxable,
    discount: toNum(inv.discount ?? inv.totals?.Discount),
    coupon_discount: toNum(inv.coupon_discount ?? inv.totals?.Coupon_Dis),
    tax_type: inv.tax_type || inv.taxType || '',
    sgst: toNum(inv.sgst ?? inv.totals?.SGST),
    cgst: toNum(inv.cgst ?? inv.totals?.CGST),
    total,
    advance: toNum(inv.advance ?? inv.totals?.Advance),
    amount_paid: paid,
    amount_due: due || (total - paid),
    items,
    raw: inv,
  }
}

// ---- Aggregations ----
export function aggregate(filtered) {
  const totalRevenue = filtered.reduce((s, i) => s + i.total, 0)
  const totalPaid = filtered.reduce((s, i) => s + i.amount_paid, 0)
  const totalDue = filtered.reduce((s, i) => s + i.amount_due, 0)
  const taxable = filtered.reduce((s, i) => s + i.taxable_value, 0)
  const totalQty = filtered.reduce((s, i) => s + i.total_qty, 0)
  const itemRows = filtered.reduce((s, i) => s + i.items.length, 0)
  const customers = new Set(filtered.map((i) => i.customer_name).filter(Boolean))
  const mobiles = new Set(filtered.map((i) => i.mobile).filter(Boolean))
  const avg = filtered.length ? totalRevenue / filtered.length : 0
  const avgCust = customers.size ? totalRevenue / customers.size : 0

  let minDate = null, maxDate = null
  for (const i of filtered) {
    if (i.date) {
      if (!minDate || i.date < minDate) minDate = i.date
      if (!maxDate || i.date > maxDate) maxDate = i.date
    }
  }

  return {
    count: filtered.length,
    totalRevenue, totalPaid, totalDue, taxable, totalQty, itemRows,
    customers: customers.size, mobiles: mobiles.size,
    avg, avgCust,
    minDate, maxDate,
  }
}

// revenue by month (returns array for charts)
export function revenueByMonth(filtered) {
  const map = new Map()
  for (const i of filtered) {
    if (!i.date) continue
    const key = `${i.date.getFullYear()}-${String(i.date.getMonth() + 1).padStart(2, '0')}`
    let m = map.get(key)
    if (!m) { m = { key, month: i.date.getMonth(), year: i.date.getFullYear(), revenue: 0, count: 0, paid: 0, due: 0 }; map.set(key, m) }
    m.revenue += i.total
    m.count += 1
    m.paid += i.amount_paid
    m.due += i.amount_due
  }
  return [...map.values()].sort((a, b) => a.key < b.key ? -1 : 1)
}

// count + revenue by provider / service
export function topBucket(filtered, field, limit = 8) {
  const map = new Map()
  for (const i of filtered) {
    const name = (i[field] || 'N/A').trim() || 'N/A'
    let b = map.get(name)
    if (!b) { b = { name, count: 0, revenue: 0 }; map.set(name, b) }
    b.count += 1
    b.revenue += i.total
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}

export function paymentModeBreakdown(filtered) {
  const map = new Map()
  for (const i of filtered) {
    const name = (i.payment_mode || 'Unspecified').trim() || 'Unspecified'
    map.set(name, (map.get(name) || 0) + i.total)
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function serviceBreakdown(filtered, limit = 10) {
  const map = new Map()
  for (const i of filtered) {
    for (const it of i.items) {
      const name = (it.service || 'N/A').trim() || 'N/A'
      map.set(name, (map.get(name) || 0) + (it.taxable_value || 0))
    }
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}
