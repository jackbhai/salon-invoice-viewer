# 🖤 Invoice Viewer — AMOLED

A mobile-first, **AMOLED dark** invoice dashboard and analytics tool built with **React + Vite + Tailwind CSS + Recharts**. It's designed for salons / shops that export invoices as JSON (the same format produced by exporters like the one for the `invMencr` invoice page).

> Everything runs right in your browser. Your data is stored **only locally** (IndexedDB) — nothing is sent to any server.

## ✨ Features

- 🌑 **AMOLED pure-black theme** with neon accent glow
- 📱 **Mobile-first** layout — **bottom navigation** on phones, **sidebar** on desktop/tablet
- 🏠 **Dashboard** — KPIs, revenue trend, payment-mode donut, top services
- 🧾 **Invoices** — search, powerful filters (date range, payment mode, provider, service, min/max amount), sort, pagination, live preview of each invoice
- 👥 **Customers** — per-customer totals, visits, dues, top spenders
- 📊 **Analytics** — revenue by provider, top customers, payment split, weekday trends, GST collected, collection efficiency
- 📥 **Upload your own JSON** — compatible with an array, a full `{ shop, invoices }` object, or a map of invoice records
- 💾 **IndexedDB persistence** — reload keeps your data (handles large files >5 MB)
- ⬇️ **Export** filtered results to CSV or JSON
- 🧪 Built-in **demo data** so you can explore every feature instantly

## 🚀 Getting started

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
```

## 🔧 JSON format

The app's exporter-friendly shape is exactly:

```json
{
  "shop": { "name": "28DEGREE UNISEX SALON", "gstin": "07AACCZ9710B1ZG" },
  "invoices": [
    {
      "invoice_no": "INV13015",
      "invoice_date": "02-09-2026 08:19 PM",
      "customer_name": "runshu",
      "mobile": "7703933241",
      "place_of_supply": "Delhi",
      "payment_mode": "Online payment",
      "total_qty": 1,
      "taxable_value": 250.00,
      "discount": 0,
      "tax_type": "Exclusive",
      "sgst": 6.25,
      "cgst": 6.25,
      "total": 263.00,
      "advance": 0,
      "amount_paid": 263.00,
      "amount_due": 0,
      "items": [
        { "service": "Service HAIR CUT - Men", "sac_hsn": "", "provider": "Arshad", "rate": 250.00, "discount": 0, "qty": 1, "taxable_value": 250.00 }
      ]
    }
  ]
}
```

Upload that file (or your existing export) and it loads instantly.

## 🗂 Tech stack

React 18 · Vite 5 · Tailwind CSS 3 · Recharts 2 · lucide-react · IndexedDB

## 📦 Deploying

PUSH to `main` and the included GitHub Actions workflow deploys to **GitHub Pages** automatically (set Pages source to "GitHub Actions" on the repo).
