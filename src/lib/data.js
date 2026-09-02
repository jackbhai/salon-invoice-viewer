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

// ---- Date helpers ----
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

export function fmtMonth(key) {
  // "2024-03" -> "Mar 2024"
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

// ---- Range presets ----
export const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
]

export function rangeBounds(range, now = new Date()) {
  const start = new Date(now); const end = new Date(now)
  start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999)
  switch (range) {
    case 'today': break
    case 'week': {
      const day = (now.getDay() + 6) % 7 // Mon start
      start.setDate(now.getDate() - day)
      break
    }
    case 'month': start.setDate(1); break
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3)
      start.setMonth(q * 3, 1)
      break
    }
    case 'year': start.setMonth(0, 1); break
    default: return null
  }
  return { start, end }
}

export function inRange(inv, bounds) {
  if (!bounds || !inv.date) return true
  return inv.date >= bounds.start && inv.date <= bounds.end
}

// Normalized invoice object
export function normalizeInvoice(inv, meta) {
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
    id: String(inv.inv_mencr ?? inv.id ?? inv._key ?? (inv.invoice_no || '')),
    invoice_no: (inv.invoice_no || inv.invoiceNo || ''),
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
    note: inv.note || '',
    _paid_override: !!inv._paid_override,
    items,
    raw: inv,
  }
}

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
    avg, avgCust, minDate, maxDate,
  }
}

export function revenueByMonth(filtered) {
  const map = new Map()
  for (const i of filtered) {
    if (!i.date) continue
    const key = `${i.date.getFullYear()}-${String(i.date.getMonth() + 1).padStart(2, '0')}`
    let m = map.get(key)
    if (!m) { m = { key, month: i.date.getMonth(), year: i.date.getFullYear(), revenue: 0, count: 0, paid: 0, due: 0, taxable: 0, sgst: 0, cgst: 0 }; map.set(key, m) }
    m.revenue += i.total
    m.count += 1
    m.paid += i.amount_paid
    m.due += i.amount_due
    m.taxable += i.taxable_value
    m.sgst += i.sgst
    m.cgst += i.cgst
  }
  return [...map.values()].sort((a, b) => a.key < b.key ? -1 : 1)
}

export function paymentModeBreakdown(filtered) {
  const map = new Map()
  for (const i of filtered) {
    const name = (i.payment_mode || 'Unspecified').trim() || 'Unspecified'
    map.set(name, (map.get(name) || 0) + i.total)
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function serviceBreakdown(filtered, limit = 10) {
  const map = new Map()
  for (const i of filtered) {
    for (const it of i.items) {
      const name = (it.service || 'N/A').trim() || 'N/A'
      map.set(name, (map.get(name) || 0) + (it.taxable_value || 0))
    }
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, limit)
}

// ---- Hour-of-day heatmap ----
export function hourOfDay(filtered) {
  const arr = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0, revenue: 0 }))
  for (const i of filtered) {
    if (!i.date) continue
    const h = i.date.getHours()
    arr[h].count += 1
    arr[h].revenue += i.total
  }
  return arr
}

export function weekdayBreakdown(filtered) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const arr = names.map((n, i) => ({ name: n, revenue: 0, count: 0 }))
  for (const i of filtered) {
    if (!i.date) continue
    arr[i.date.getDay()].revenue += i.total
    arr[i.date.getDay()].count += 1
  }
  return [1, 2, 3, 4, 5, 6, 0].map((d) => arr[d])
}

// ---- Comparison (this period vs previous period of equal length) ----
export function periodComparison(filtered, range) {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  let curStart, prevStart, prevEnd
  const b = rangeBounds(range, now)
  if (b) {
    curStart = b.start
    prevEnd = new Date(curStart.getTime() - 1)
    const len = b.end - b.start + 1
    prevStart = new Date(curStart.getTime() - len)
  } else {
    // all time: last 12 months vs previous 12 months
    curStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    prevEnd = new Date(curStart.getTime() - 1)
    const len = now - curStart + 1
    prevStart = new Date(curStart.getTime() - len)
  }
  let cur = 0, prev = 0, cc = 0, pc = 0
  for (const i of filtered) {
    if (!i.date) continue
    if (i.date >= curStart && i.date <= now) { cur += i.total; cc++ }
    else if (i.date >= prevStart && i.date <= prevEnd) { prev += i.total; pc++ }
  }
  const growth = prev > 0 ? ((cur - prev) / prev) * 100 : (cc > 0 ? 100 : 0)
  return { current: cur, previous: prev, growth, currentCount: cc, previousCount: pc }
}

// ---- Auto MENU MAKER ----
export function buildMenu(invoices, overrides = {}) {
  const map = new Map()
  for (const inv of invoices) {
    for (const it of inv.items) {
      const name = (it.service || '').trim()
      if (!name) continue
      let m = map.get(name)
      if (!m) {
        m = { name, count: 0, revenue: 0, qty: 0, rates: new Map(), history: [], providers: new Set(), customers: new Set(), lastRate: null, lastDate: null }
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
        } else { m.lastRate = rate }
      }
      if (it.provider) m.providers.add(it.provider.trim())
      if (inv.customer_name) m.customers.add(inv.customer_name.trim())
    }
  }

  const list = [...map.values()].map((m) => {
    const ratesArr = [...m.rates.entries()].sort((a, b) => b[1] - a[1])
    const modeRate = ratesArr.length ? ratesArr[0][0] : m.lastRate
    const hist = m.history.filter((h) => h.date).sort((a, b) => a.date - b.date)
    let timeline = []
    for (let i = 0; i < hist.length; i++) {
      if (i === 0 || hist[i].rate !== hist[i - 1].rate) timeline.push({ date: hist[i].date, rate: hist[i].rate })
    }
    const firstRate = timeline.length ? timeline[0].rate : m.lastRate
    const latestRate = timeline.length ? timeline[timeline.length - 1].rate : m.lastRate
    const prevRate = timeline.length > 1 ? timeline[timeline.length - 2].rate : null
    const change = prevRate != null && prevRate ? (((latestRate - prevRate) / prevRate) * 100) : null
    const minRate = ratesArr.length ? Math.min(...m.rates.keys()) : m.lastRate
    const maxRate = ratesArr.length ? Math.max(...m.rates.keys()) : m.lastRate
    // year-wise min price + % change (for comparison table)
    const yearMap = new Map()
    for (const hd of hist) {
      const y = hd.date.getFullYear()
      if (!yearMap.has(y)) yearMap.set(y, { year: y, sum: 0, n: 0, min: Infinity, max: -Infinity })
      const e = yearMap.get(y); e.sum += hd.rate; e.n += 1
      e.min = Math.min(e.min, hd.rate); e.max = Math.max(e.max, hd.rate)
    }
    const byYear = [...yearMap.values()]
      .map((e) => ({ year: e.year, avg: e.sum / e.n, min: e.min, max: e.max }))
      .sort((a, b) => a.year - b.year)
    return {
      name: m.name,
      count: m.count, qty: m.qty, revenue: m.revenue,
      providers: [...m.providers], customers: m.customers.size,
      modeRate, minRate, maxRate, latestRate, prevRate, firstRate, change,
      timeline, rates: ratesArr.map(([rate, count]) => ({ rate, count })), byYear,
      override: overrides[m.name] != null ? toNum(overrides[m.name]) : null,
    }
  })

  const categories = {}
  for (const m of list) {
    const cat = categorize(m.name)
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(m)
  }
  const catOrder = Object.entries(categories).map(([cat, items]) => ({ cat, items })).sort((a, b) => sum(b.items) - sum(a.items))
  const totalItems = list.length
  const totalMenuRevenue = list.reduce((s, it) => s + it.revenue, 0)
  return { items: list, categories: catOrder, totalItems, totalMenuRevenue }
}

function categorize(name) {
  const s = name.replace(/^service\s*/i, '').trim()
  const parts = s.split(/\s*[-–:–]\s*/)
  const head = (parts[0] || s).trim()
  const kws = ['hair', 'cut', 'beard', 'facial', 'face', 'spa', 'massage', 'mani', 'pedi', 'thread', 'color', 'colour', 'keratin', 'smoothen', 'wax', 'blow', 'head', 'body', 'clean', 'detan', 'de-tan', 'eyebrow', 'para']
  const low = head.toLowerCase()
  if (low.includes('mani')) return 'Nails'
  if (low.includes('pedi')) return 'Nails'
  if (low.includes('facial') || low.includes('face')) return 'Facial & Skin'
  if (low.includes('spa')) return 'Spa'
  if (low.includes('massage')) return 'Massage'
  if (low.includes('color') || low.includes('colour') || low.includes('keratin') || low.includes('smoothen')) return 'Hair Treatment'
  if (low.includes('beard')) return 'Beard'
  if (low.includes('hair') || low.includes('cut')) return 'Hair'
  if (low.includes('thread') || low.includes('wax') || low.includes('eyebrow')) return 'Wax & Threading'
  const found = kws.find((k) => low.includes(k))
  return found ? 'Other' : 'Other'
}

function sum(items) { return items.reduce((s, it) => s + it.revenue, 0) }

export function priceHistoryTrend(menuItem) {
  const map = new Map()
  ;(menuItem.timeline || menuItem.history || []).forEach(({ date, rate }) => {
    if (!date) return
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    let e = map.get(key)
    if (!e) { e = { key, sum: 0, n: 0, min: Infinity, max: -Infinity }; map.set(key, e) }
    e.sum += rate; e.n += 1; e.min = Math.min(e.min, rate); e.max = Math.max(e.max, rate)
  })
  return [...map.values()]
    .map((e) => ({ key: e.key, rate: Math.round((e.sum / e.n) * 100) / 100, min: e.min, max: e.max }))
    .sort((a, b) => (a.key < b.key ? -1 : 1))
}

// ---- WORKER / PROVIDER STATS ----
export function workerStats(invoices, commission = 0) {
  const map = new Map()
  for (const inv of invoices) {
    const provs = new Set()
    inv.items.forEach((it) => it.provider && provs.add(it.provider.trim()))
    for (const name of provs) {
      let w = map.get(name)
      if (!w) { w = { name, invoices: 0, items: 0, revenue: 0, customers: new Set(), services: new Map(), totalQty: 0 }; map.set(name, w) }
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
    .map((w) => {
      const commissionAmt = commission > 0 ? (w.revenue * commission) / 100 : 0
      return {
        name: w.name, invoices: w.invoices, items: w.items, revenue: w.revenue,
        customers: w.customers.size, services: [...w.services.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
        totalQty: w.totalQty, commissionAmt,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}

// monthly performance for one worker
export function workerMonthly(invoices, name) {
  const map = new Map()
  for (const inv of invoices) {
    if (!inv.date) continue
    const has = inv.items.some((it) => it.provider && it.provider.trim() === name)
    if (!has) continue
    const key = `${inv.date.getFullYear()}-${String(inv.date.getMonth() + 1).padStart(2, '0')}`
    let e = map.get(key); if (!e) { e = { key, revenue: 0, count: 0 }; map.set(key, e) }
    e.count += 1
    e.revenue += inv.items.filter((it) => it.provider && it.provider.trim() === name).reduce((s, it) => s + (it.taxable_value || it.rate * it.qty || 0), 0)
  }
  return [...map.values()].sort((a, b) => a.key < b.key ? -1 : 1)
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
  const last = cust.length ? cust[cust.length - 1].date : null
  const first = cust.length ? cust[0].date : null
  const daysSinceLast = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : null
  return {
    name, invoices: cust, count: cust.length, total, paid, due,
    avg: cust.length ? total / cust.length : 0,
    first, last, daysSinceLast,
    mobile: cust.length ? (cust.find((i) => i.mobile)?.mobile || '') : '',
    pos: cust.length ? (cust.find((i) => i.place_of_supply)?.place_of_supply || '') : '',
    services: [...services.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
    providers: [...providers], modes: [...modes.entries()].sort((a, b) => b[1] - a[1]),
  }
}

// ---- RFM segmentation / churn ----
export function customerSegments(invoices) {
  const map = new Map()
  for (const i of invoices) {
    const key = (i.customer_name || '').trim() || '—'
    let c = map.get(key)
    if (!c) { c = { name: key, count: 0, revenue: 0, paid: 0, due: 0, visits: [] }; map.set(key, c) }
    c.count += 1; c.revenue += i.total; c.paid += i.amount_paid; c.due += i.amount_due
    if (i.date) c.visits.push(i.date.getTime())
  }
  const now = Date.now()
  const seg = []
  for (const c of map.values()) {
    c.visits.sort((a, b) => a - b)
    const first = c.visits[0]
    const last = c.visits[c.visits.length - 1]
    const daysSince = Math.floor((now - last) / 86400000)
    const spanDays = ((last - first) / 86400000) || 0
    const freq = c.count > 1 ? c.count / Math.max(1, spanDays / 30) : (c.count / Math.max(1, daysSince / 30))
    let segment
    if (c.count === 1) segment = 'New'
    else if (daysSince <= 30) segment = 'Loyal'
    else if (daysSince <= 90) segment = 'Active'
    else if (daysSince <= 180) segment = 'At-Risk'
    else segment = 'Churned'
    seg.push({ name: c.name, count: c.count, revenue: c.revenue, due: c.due, freq, segment, daysSince, last: last ? new Date(last) : null, first: first ? new Date(first) : null })
  }
  return seg.sort((a, b) => b.revenue - a.revenue)
}

export function segmentSummary(segments) {
  const s = { New: { c: 0, v: 0 }, Loyal: { c: 0, v: 0 }, Active: { c: 0, v: 0 }, 'At-Risk': { c: 0, v: 0 }, Churned: { c: 0, v: 0 } }
  for (const x of segments) { s[x.segment].c += 1; s[x.segment].v += x.revenue }
  return Object.entries(s).map(([name, v]) => ({ name, count: v.c, value: v.v }))
}

// ---- GST / GSTR1 style monthly ----
export function gstMonthly(invoices) {
  const map = new Map()
  for (const i of invoices) {
    if (!i.date) continue
    const key = `${i.date.getFullYear()}-${String(i.date.getMonth() + 1).padStart(2, '0')}`
    let e = map.get(key); if (!e) { e = { key, taxable: 0, sgst: 0, cgst: 0, igst: 0, total: 0, count: 0 }; map.set(key, e) }
    e.taxable += i.taxable_value; e.sgst += i.sgst; e.cgst += i.cgst; e.total += i.total; e.count += 1
  }
  return [...map.values()].sort((a, b) => a.key < b.key ? -1 : 1)
}

// ---- Data quality report ----
export function dataQuality(invoices) {
  const noDate = invoices.filter((i) => !i.date).length
  const noItems = invoices.filter((i) => i.items.length === 0).length
  const noCustomer = invoices.filter((i) => !i.customer_name).length
  const noTotal = invoices.filter((i) => !(i.total > 0)).length
  const dueInvoices = invoices.filter((i) => i.amount_due > 0)
  const ids = new Set()
  let dups = 0
  for (const i of invoices) {
    if (ids.has(i.id)) dups++
    ids.add(i.id)
  }
  // gap detection by invoice no
  const nums = invoices.map((i) => i.invoice_no).filter(Boolean).map((s) => Number(String(s).replace(/\D/g, ''))).filter((n) => isFinite(n)).sort((a, b) => a - b)
  let gaps = 0
  for (let k = 1; k < nums.length; k++) if (nums[k] - nums[k - 1] > 1) gaps++
  const noMobile = invoices.filter((i) => !i.mobile).length
  return {
    total: invoices.length,
    noDate, noItems, noCustomer, noTotal, noMobile, dups, gaps,
    dueInvoices: dueInvoices.length, dueAmount: dueInvoices.reduce((s, i) => s + i.amount_due, 0),
  }
}

// ---- merge datasets by invoice id/no ----
export function mergeInvoices(existing, incoming) {
  const byId = new Map()
  for (const i of existing) byId.set(i.id, i)
  let added = 0
  for (const i of incoming) {
    if (!byId.has(i.id)) { byId.set(i.id, i); added++ }
  }
  return { merged: [...byId.values()], added }
}

// ---- category breakdown (by revenue) ----
export function categoryBreakdown(invoices) {
  const map = new Map()
  for (const i of invoices) for (const it of i.items) {
    if (!it.service) continue
    const cat = categorize(it.service)
    map.set(cat, (map.get(cat) || 0) + (it.taxable_value || it.rate * it.qty || 0))
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

// ---- daily revenue for a chart ----
export function revenueByDay(filtered, limit = 30) {
  const map = new Map()
  for (const i of filtered) {
    if (!i.date) continue
    const key = i.date.toISOString().split('T')[0]
    let e = map.get(key); if (!e) { e = { key, revenue: 0, count: 0 }; map.set(key, e) }
    e.revenue += i.total; e.count += 1
  }
  let arr = [...map.values()].sort((a, b) => a.key < b.key ? -1 : 1)
  if (limit && arr.length > limit) arr = arr.slice(-limit)
  return arr
}

// ---- monthly comparison (this year vs last year, same months) ----
export function monthlyCompare(invoices) {
  const now = new Date().getFullYear()
  const curMap = new Map()
  const prevMap = new Map()
  for (const i of invoices) {
    if (!i.date) continue
    const mo = i.date.getMonth()
    if (i.date.getFullYear() === now) curMap.set(mo, (curMap.get(mo) || 0) + i.total)
    else if (i.date.getFullYear() === now - 1) prevMap.set(mo, (prevMap.get(mo) || 0) + i.total)
  }
  const out = []
  for (let mo = 0; mo < 12; mo++) {
    const c = curMap.get(mo) || 0
    const p = prevMap.get(mo) || 0
    if (c > 0 || p > 0) out.push({ key: `${mo + 1}`, current: c, previous: p })
  }
  return out
}

// ---- discount & items stats ----
export function discountStats(invoices) {
  let discounted = 0, discountTotal = 0, itemsSold = 0
  for (const i of invoices) { if (i.discount > 0) { discounted++; discountTotal += i.discount } itemsSold += i.items.reduce((s, it) => s + it.qty, 0) }
  const avgItems = invoices.length ? itemsSold / invoices.length : 0
  return { discounted, discountTotal, itemsSold, avgDiscount: discounted ? discountTotal / discounted : 0, avgItems }
}

// ---- outstanding dues by customer (collection) ----
export function dueCustomers(invoices) {
  const map = new Map()
  for (const i of invoices) {
    if (i.amount_due <= 0) continue
    const k = (i.customer_name || '—').trim() || '—'
    let e = map.get(k); if (!e) { e = { name: k, due: 0, count: 0, mobile: '' }; map.set(k, e) }
    e.due += i.amount_due; e.count += 1
    if (!e.mobile && i.mobile) e.mobile = i.mobile
  }
  return [...map.values()].sort((a, b) => b.due - a.due)
}

// ---- export builders ----
export function buildCSV(rows, headers) {
  const esc = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"'
  return [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n')
}
