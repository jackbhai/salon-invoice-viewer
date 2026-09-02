// Generates a believable sample dataset to showcase all features.
const SERVICES = [
  ['Hair Cut - Men', 'Arshad', 250], ['Hair Cut - Women', 'Nisha', 500], ['Beard Trim', 'Arshad', 100],
  ['Hair Color', 'Rohit', 1500], ['Facial - Gold', 'Nisha', 899], ['Manicure', 'Priya', 350],
  ['Pedicure', 'Priya', 400], ['Head Massage', 'Vikram', 300], ['Spa - De Tan', 'Rohit', 1200],
  ['Keratin Treatment', 'Nisha', 3500], ['Threading', 'Priya', 80], ['Eyebrow', 'Nisha', 100],
]
const NAMES = ['Aarav', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Ananya', 'Rohan', 'Meera', 'Karan', 'Isha', 'Aditya', 'Zara', 'Sameer', 'Divya', 'Akash', 'Tanvi']
const MODES = ['Cash', 'Online payment', 'Paytm', 'Credit/Debit card', 'E-wallet']

function rnd(n) { return Math.floor(Math.random() * n) }
function pad(n) { return String(n).padStart(2, '0') }

export function makeSample(count = 60) {
  const invoices = []
  const now = new Date()
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getTime() - (count - i) * 2 * 86400000 - rnd(24 * 86400000))
    const items = []
    const nItems = 1 + rnd(3)
    let taxable = 0
    for (let j = 0; j < nItems; j++) {
      const [service, provider, rate] = SERVICES[rnd(SERVICES.length)]
      const qty = 1 + rnd(2)
      const val = rate * qty
      taxable += val
      items.push({ service: 'Service ' + service, sac_hsn: '', provider, rate, qty: 1, discount: 0, taxable_value: val })
    }
    const discount = rnd(4) === 0 ? Math.round(taxable * 0.05) : 0
    const taxableAfter = taxable - discount
    const sgst = +(taxableAfter * 0.025).toFixed(2)
    const cgst = +(taxableAfter * 0.025).toFixed(2)
    const total = Math.round(taxableAfter + sgst + cgst)
    const paid = rnd(6) === 0 ? Math.round(total * 0.5) : total
    const cb = NAMES[rnd(NAMES.length)]
    invoices.push({
      inv_mencr: 24000 + 14 * i,
      invoice_no: `INV${pad(i)}`,
      invoice_date: `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`,
      customer_name: cb,
      mobile: `9${rnd(900000000) + 100000000}`,
      place_of_supply: 'Delhi',
      payment_mode: MODES[rnd(MODES.length)],
      total_qty: items.length,
      taxable_value: taxable,
      discount,
      tax_type: 'Exclusive',
      sgst, cgst,
      total,
      advance: 0,
      amount_paid: paid,
      amount_due: total - paid,
      items,
    })
  }
  return {
    shop: { name: 'Demo Salon', gstin: '07XXXXXX0000X1ZX' },
    invoices,
  }
}
