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

// Guarded per-item value: an individual item can never be worth more than the
// whole invoice it belongs to, so clamp to invoice total. This neutralises lone
// corrupt data rows (e.g. a package item worth a trillion) that would otherwise
// blow up a single worker's / service's revenue.
export function itemValue(item, inv, qtyOverride) {
  let val = item.taxable_value != null && item.taxable_value !== ''
    ? Number(item.taxable_value)
    : Number(item.rate || 0) * Number(qtyOverride ?? item.qty ?? 1)
  if (!isFinite(val) || val < 0) val = 0
  const cap = inv && Number(inv.total) > 0 ? Number(inv.total) : Infinity
  return val > cap ? cap : val
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
  const rawItems = Array.isArray(inv.items) ? inv.items : []
  const items = rawItems.map((it) => ({
    service: it.service || it.name || it.item || '',
    sac_hsn: it.sac_hsn || it.hsn || it.sac || '',
    provider: it.provider || '',
    rate: toNum(it.rate),
    qty: toNum(it.qty || 1),
    taxable_value: toNum(it.taxable_value ?? it.amount ?? it.value),
    discount: toNum(it.discount),
  }))

  const taxable = toNum(inv.taxable_value ?? inv.taxableValue ?? inv.tax ?? inv.totals?.Taxable_Value ?? inv.totals?.Tax)
  const total = toNum(inv.total ?? inv.grand_total ?? inv.grandTotal ?? inv.amount ?? inv.totals?.Total)
  // clamp each item's taxable value to the invoice total (guard vs corrupt rows)
  if (total > 0) {
    for (const it of items) {
      if (it.taxable_value > total) it.taxable_value = total
    }
  }
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

// ---- Auto MENU MAKER ----
// Groups every service item seen across invoices into a menu with current/latest price,
// old price, price change comparison, sale count, revenue and price history.
export function buildMenu(invoices) {
  const map = new Map()
  const sortDates = []
  for (const inv of invoices) {
    for (const it of inv.items) {
      const name = (it.service || '').trim()
      if (!name) continue
      let m = map.get(name)
      if (!m) {
        m = {
          name,
          count: 0,
          revenue: 0,
          qty: 0,
          rates: new Map(),       // rate -> count
          history: [],            // {date, rate}
          providers: new Set(),
          customers: new Set(),
          lastRate: null,
          lastDate: null,
        }
        map.set(name, m)
      }
      m.count += 1
      m.qty += (it.qty || 1)
      m.revenue += (it.taxable_value || it.rate * it.qty || 0)
      const rate = it.rate != null && it.rate !== '' ? Number(it.rate) : null
      if (rate != null && isFinite(rate)) {
        m.rates.set(rate, (m.rates.get(rate) || 0) + 1)
        const d = inv.date ? inv.date.getTime() : null
        m.history.push({ date: inv.date, rate })
        if (d != null) {
          if (!m.lastDate || d > m.lastDate) { m.lastDate = d; m.lastRate = rate }
        } else {
          m.lastRate = rate
        }
      }
      if (it.provider) m.providers.add(it.provider.trim())
      if (inv.customer_name) m.customers.add(inv.customer_name.trim())
    }
  }

  const list = [...map.values()].map((m) => {
    const ratesArr = [...m.rates.entries()].sort((a, b) => b[1] - a[1])
    const modeRate = ratesArr.length ? ratesArr[0][0] : m.lastRate
    // price history timeline (sorted by date, dedup consecutive same rate)
    const hist = m.history
      .filter((h) => h.date)
      .sort((a, b) => a.date - b.date)
    let timeline = []
    for (let i = 0; i < hist.length; i++) {
      if (i === 0 || hist[i].rate !== hist[i - 1].rate) timeline.push({ date: hist[i].date, rate: hist[i].rate })
    }
    const firstRate = timeline.length ? timeline[0].rate : m.lastRate
    const latestRate = timeline.length ? timeline[timeline.length - 1].rate : m.lastRate
    const prevRate = timeline.length > 1 ? timeline[timeline.length - 2].rate : null
    const change = prevRate != null && prevRate ? (((latestRate - prevRate) / prevRate) * 100) : null
    const allChange = firstRate ? ((((latestRate - firstRate) / firstRate) * 100)) : null
    const minRate = ratesArr.length ? Math.min(...m.rates.keys()) : m.lastRate
    const maxRate = ratesArr.length ? Math.max(...m.rates.keys()) : m.lastRate
    return {
      name: m.name,
      count: m.count,
      qty: m.qty,
      revenue: m.revenue,
      providers: [...m.providers],
      customers: m.customers.size,
      modeRate,
      minRate,
      maxRate,
      latestRate,
      prevRate,
      firstRate,
      change,
      allChange,
      timeline,
      rates: ratesArr.map(([rate, c]) => ({ rate, count: c })),
    }
  })

  // categorise menu by the leading word segment, e.g. "HAIR CUT - Men"
  const categories = {}
  for (const m of list) {
    const cat = categorize(m.name)
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(m)
  }
  // sort categories by total revenue
  const catOrder = Object.entries(categories).map(([cat, items]) => ({ cat, items }))
    .sort((a, b) => sum(b.items) - sum(a.items))
  return { items: list, categories: catOrder, totalItems: list.length }
}

function categorize(name) {
  const s = name.replace(/^service\s*/i, '').trim()
  const parts = s.split(/\s*[-–:–]\s*/)
  const head = (parts[0] || s).trim()
  const kws = ['hair', 'cut', 'beard', 'facial', 'face', 'spa', 'massage', 'mani', 'pedi', 'thread', 'color', 'colour', 'keratin', 'smoothen', 'wax', 'blow', 'head', 'body', 'clean', 'detan', 'de-tan', 'eyebrow', 'para']
  const low = head.toLowerCase()
  const found = kws.find((k) => low.includes(k))
  if (low.includes('mani')) return 'Nails'
  if (low.includes('pedi')) return 'Nails'
  if (low.includes('facial') || low.includes('face')) return 'Facial & Skin'
  if (low.includes('spa')) return 'Spa'
  if (low.includes('massage')) return 'Massage'
  if (low.includes('color') || low.includes('colour') || low.includes('keratin') || low.includes('smoothen')) return 'Hair Treatment'
  if (low.includes('beard')) return 'Beard'
  if (low.includes('hair') || low.includes('cut')) return 'Hair'
  if (low.includes('thread') || low.includes('wax') || low.includes('eyebrow')) return 'Wax & Threading'
  return found ? 'Other' : 'Other'
}

function sum(items) { return items.reduce((s, it) => s + it.revenue, 0) }

// ---- WORKER / PROVIDER STATS ----
export function workerStats(invoices) {
  const map = new Map()
  for (const inv of invoices) {
    const provs = new Set()
    inv.items.forEach((it) => it.provider && provs.add(it.provider.trim()))
    for (const name of provs) {
      let w = map.get(name)
      if (!w) {
        w = { name, invoices: 0, items: 0, revenue: 0, customers: new Set(), services: new Map(), totalQty: 0 }
        map.set(name, w)
      }
      w.invoices += 1
      const itemsThisInv = inv.items.filter((it) => it.provider && it.provider.trim() === name)
      w.items += itemsThisInv.length
      w.totalQty += itemsThisInv.reduce((s, it) => s + (it.qty || 1), 0)
      w.revenue += itemsThisInv.reduce((s, it) => s + (it.taxable_value || it.rate * it.qty || 0), 0)
      if (inv.customer_name) w.customers.add(inv.customer_name.trim())
      itemsThisInv.forEach((it) => {
        const sv = (it.service || 'N/A').trim()
        w.services.set(sv, (w.services.get(sv) || 0) + 1)
      })
    }
  }
  return [...map.values()]
    .map((w) => ({ ...w, customers: w.customers.size, services: [...w.services.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12) }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ---- CUSTOMER PROFILE ----
export function customerProfile(invoices, name) {
  const cust = invoices.filter((i) => (i.customer_name || '').trim() === name)
  cust.sort((a, b) => (a.date || 0) - (b.date || 0))
  const total = cust.reduce((s, i) => s + i.total, 0)
  const paid = cust.reduce((s, i) => s + i.amount_paid, 0)
  const due = cust.reduce((s, i) => s + i.amount_due, 0)
  const services = new Map()
  const providers = new Set()
  const modes = new Map()
  for (const i of cust) {
    if (i.payment_mode) modes.set(i.payment_mode, (modes.get(i.payment_mode) || 0) + 1)
    for (const it of i.items) {
      const sv = (it.service || 'N/A').trim()
      services.set(sv, (services.get(sv) || 0) + 1)
      if (it.provider) providers.add(it.provider.trim())
    }
  }
  return {
    name,
    invoices: cust,
    count: cust.length,
    total,
    paid,
    due,
    avg: cust.length ? total / cust.length : 0,
    first: cust.length ? cust[0].date : null,
    last: cust.length ? cust[cust.length - 1].date : null,
    mobile: cust.length ? (cust.find((i) => i.mobile)?.mobile || '') : '',
    pos: cust.length ? (cust.find((i) => i.place_of_supply)?.place_of_supply || '') : '',
    services: [...services.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
    providers: [...providers],
    modes: [...modes.entries()].sort((a, b) => b[1] - a[1]),
  }
}

// ---- price history trend for a single service (monthly avg) ----
export function priceHistoryTrend(menuItem) {
  const map = new Map()
  menuItem.history.forEach(({ date, rate }) => {
    if (!date) return
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    let e = map.get(key)
    if (!e) { e = { key, sum: 0, n: 0 }; map.set(key, e) }
    e.sum += rate; e.n += 1
  })
  return [...map.entries()].map(([key, e]) => ({ key, rate: Math.round((e.sum / e.n) * 100) / 100 }))
    .sort((a, b) => (a.key < b.key ? -1 : 1))
}
