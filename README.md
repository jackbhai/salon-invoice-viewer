# 🖤 Invoice Viewer — AMOLED

A mobile-first, **AMOLED dark** invoice dashboard and analytics tool built with **React + Vite + Tailwind CSS + Recharts**. Built for salons / shops that export invoices as JSON (the same format produced by the `invMencr` invoice page).

> Everything runs in your browser. Data is stored **only locally** (IndexedDB) — nothing is sent anywhere.

## ✨ Feature set (deep by module)

### 🌑 UI / Theme
- Pure AMOLED black + neon accent glow; **OLED intensity toggle** (pure black ↔ dim)
- **Spring/staggered/glow animations** on every screen, motion library, reduced-motion support
- **Mobile-first** — bottom nav (Home · Menu · Invoices · Customers · More) + a floating **quick-action FAB**; full sidebar on desktop/tablet
- **Installable PWA** (add to home screen, works offline via service worker)

### 🏠 Dashboard
- **Date range selector** (Today / Week / Month / Quarter / Year / All / Custom)
- Growth % **vs previous period** + live **"Today" panel** (collection, invoices, customers, due)
- Revenue target **progress ring**, **busiest-hours heatmap**, payment donut, top services
- KPI grid, revenue trend, quick navigation

### 🪧 Menu Maker (auto)
- Auto-detects **every service** from invoices, grouped into categories
- **Current vs old price** (up/down %), **price-history line chart**, **year-wise avg price table**
- Times sold, customers, providers, revenue, price-range chips
- **Print / Share** (printable menu → PDF), CSV/JSON export

### 🧾 Invoices
- Search + advanced filters (date, payment mode, provider, service, min/max, due-only, no-mobile, no-name)
- **Quick presets** (Today / This month / Cash / Pending dues)
- **Bulk select + export**, full invoice detail, CSV/JSON export, pagination

### 👥 Customers
- **RFM segmentation** — Loyal / Active / New / At-Risk / Churned with per-segment cards
- Click a customer → **full profile card**: total spend, LTV, avg/visit, outstanding, favorite services, served-by, full billing history

### 👥 Workers
- Per-worker invoices, customers served, items, revenue, top services, % share
- **Monthly performance chart**, **commission estimator** (set % → auto cut)

### 📊 Analytics
- **Monthly GST summary** → **GSTR-1 CSV export** (tax filing)
- **Cash vs Digital** split, **Monthly report CSV**, revenue by provider, top customers, payment split, weekday trends

### 📁 Data
- Upload any JSON shape (array / `{shop,invoices}` / map), **merge datasets** (de-dup by invoice id)
- **Data quality report** (missing dates/customers/items/totals, duplicates, invoice-number gaps)
- `public/sample-invoices.json` included

## 🚀 Getting started

```bash
npm install
npm run dev      # dev server
npm run build    # production build -> dist/
```

## JSON format (exporter-friendly)

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
      "total_qty": 1, "taxable_value": 250, "discount": 0,
      "tax_type": "Exclusive", "sgst": 6.25, "cgst": 6.25,
      "total": 263, "advance": 0, "amount_paid": 263, "amount_due": 0,
      "items": [
        { "service": "Service HAIR CUT - Men", "sac_hsn": "", "provider": "Arshad", "rate": 250, "discount": 0, "qty": 1, "taxable_value": 250 }
      ]
    }
  ]
}
```

## 🗂 Tech stack

React 18 · Vite 5 · Tailwind CSS 3 · Recharts 2 · lucide-react · IndexedDB · PWA

## 📦 Deploy

Push to `main` → the GitHub Actions workflow builds and deploys to **GitHub Pages** automatically (Pages source = "GitHub Actions").
