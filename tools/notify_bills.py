#!/usr/bin/env python3
"""
New-bill watcher -> ntfy push notification.

Scans the salon invoice system for invoices newer than the last-seen number and,
for each new bill found, pushes a rich notification to an ntfy topic.

Setup:
  - NTFY_URL      : https://ntfy.sh/<private-topic>   (or self-hosted)
  - NTFY_TOKEN    : optional ntfy access token      (for private topics)
  - INVOICE_FILE  : path to persist last-seen invoice no (default .bill-state.json)

Run:  python3 notify_bills.py            # normal scan
      python3 notify_bills.py --test     # send one test notification
"""
import os, sys, json, re, time, urllib.request, urllib.parse

BASE = "https://shivsoftsindia.in/28_degree_unisex_salon/invoice.php"
SHOP = "24014"
OFFSET, STEP = 24000, 14
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
STATE_FILE = os.environ.get("INVOICE_FILE", os.path.join(os.path.dirname(__file__), ".bill-state.json"))


def invmencr(n):
    return OFFSET + STEP * n


def fetch(n):
    url = f"{BASE}?invMencr={invmencr(n)}&invshopid={SHOP}"
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            return urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")
        except Exception:
            time.sleep(1 + attempt)
    return None


def valid(html):
    return bool(html) and "Invoice No" in html


def latest_invoice_number():
    """Binary-search the highest valid invoice number (numbers are contiguous).
    Used once on first run to initialise the baseline without spamming."""
    lo, hi = 1, 400000
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if valid(fetch(mid)):
            lo = mid
        else:
            hi = mid - 1
        time.sleep(0.4)
    return lo


def find_new(last_seen, budget=60):
    """Forward-scan for contiguous new invoices. Handles voids by peeking ahead."""
    new = []
    n = last_seen + 1
    requests = 0
    while requests < budget:
        html = fetch(n)
        requests += 1
        time.sleep(0.6)
        if valid(html):
            new.append(n)
            n += 1
            continue
        # invalid: peek a few ahead to skip stray void(s), but don't go past a gap
        gap_checked = 0
        peeked = 0
        for j in range(1, 6):
            time.sleep(0.5)
            jh = fetch(n + j)
            requests += 1
            if valid(jh):
                # none of n..n+j-1 are valid -> they're voids; record them but continue after
                new.append(n + j)
                n += j + 1
                peeked = 1
                break
            gap_checked = n + j
        if not peeked:
            break  # no contiguous valid found (batch done)
    return new


def parse(html, n):
    from bs4 import BeautifulSoup
    s = BeautifulSoup(html, "html.parser")
    rec = {"invoice_no": "", "invoice_date": "", "customer": "", "mobile": "",
           "place": "", "payment": "", "total": 0, "paid": 0, "due": 0,
           "taxable": 0, "discount": 0, "sgst": 0, "cgst": 0, "items": []}

    for tr in s.select(".customer-block table tr"):
        cells = [" ".join(td.get_text(" ", strip=True).split()) for td in tr.find_all("td")]
        for i in range(0, len(cells) - 1, 2):
            label, val = cells[i], cells[i + 1].lstrip(":").strip()
            if "Invoice No" in label: rec["invoice_no"] = val
            elif "Invoice Date" in label: rec["invoice_date"] = val
            elif "Customer" in label: rec["customer"] = val
            elif "Mobile" in label: rec["mobile"] = val
            elif "Place of Supply" in label: rec["place"] = val

    for tr in s.select("table.items-table tbody tr"):
        tds = tr.find_all("td")
        if len(tds) < 7:
            continue
        rec["items"].append({
            "service": " ".join(tds[0].get_text(" ", strip=True).split()),
            "provider": " ".join(tds[2].get_text(" ", strip=True).split()),
            "rate": " ".join(tds[3].get_text(" ", strip=True).split()),
            "qty": " ".join(tds[5].get_text(" ", strip=True).split()),
            "value": " ".join(tds[6].get_text(" ", strip=True).split()),
        })

    # totals (robust: pair each 'lbl' td with the following 'val' td; also read total qty / payment)
    t = {}
    for tr in s.select("table.totals-section tr"):
        tds = tr.find_all("td")
        for idx, td in enumerate(tds):
            cls = " ".join(td.get("class", []) or [])
            if "lbl" in cls:
                # value is the next td if it is a 'val', else nested in same cell
                nxt = tds[idx + 1] if idx + 1 < len(tds) else None
                if nxt is not None and "val" in " ".join(nxt.get("class", []) or []):
                    key = " ".join(td.get_text(" ", strip=True).split()).rstrip(":").strip()
                    if key: t[key] = " ".join(nxt.get_text(" ", strip=True).split())
            txt = " ".join(td.get_text(" ", strip=True).split())
            if "Payment Mode" in txt:
                m = re.search(r"Payment Mode\s*:\s*(.*?)(?:\u20b9|$)", txt, re.S)
                if m: rec["payment"] = m.group(1).strip()
    num = lambda v: float(v.replace(",", "")) if v else 0.0
    rec["taxable"] = num(t.get("Taxable Value") or t.get("Tax"))
    rec["discount"] = num(t.get("Discount"))
    rec["sgst"] = num(t.get("SGST(2.5%)"))
    rec["cgst"] = num(t.get("CGST(2.5%)"))
    rec["total"] = num(t.get("Total"))
    rec["paid"] = num(t.get("Amount Paid"))
    rec["due"] = num(t.get("Amount Due"))
    return rec


def fmt(v):
    return f"\u20b9{round(v, 2):,.2f}" if isinstance(v, (int, float)) else str(v)


def build_notification(rec):
    lines = []
    lines.append(f"invoice_no: {rec['invoice_no']}")
    lines.append(f"date: {rec['invoice_date']}")
    if rec["customer"]: lines.append(f"customer: {rec['customer']}")
    if rec["mobile"]: lines.append(f"mobile: {rec['mobile']}")
    if rec["place"]: lines.append(f"place: {rec['place']}")
    if rec["payment"]: lines.append(f"payment: {rec['payment']}")
    lines.append("")
    lines.append("Services:")
    for it in rec["items"]:
        prov = f" ({it['provider']})" if it["provider"] else ""
        lines.append(f"  \u2022 {it['service']}{prov} x{it['qty']} @{it['rate']} = {it['value']}")
    lines.append("")
    lines.append(f"taxable: {fmt(rec['taxable'])}  discount: {fmt(rec['discount'])}")
    if rec["sgst"]: lines.append(f"sgst: {fmt(rec['sgst'])}  cgst: {fmt(rec['cgst'])}")
    lines.append(f"total: {fmt(rec['total'])}   paid: {fmt(rec['paid'])}")
    lines.append(f"due: {fmt(rec['due'])}")
    return "\n".join(lines)


def publish(title, message, click_url, tags="receipt"):
    url = os.environ.get("NTFY_URL", "https://ntfy.sh/salon-bills-c38d863a12e1f4")
    token = os.environ.get("NTFY_TOKEN", "")
    # ntfy headers must be latin-1/ascii-safe; strip non-ascii & keep unicode in body only
    safe = lambda s: "".join(c for c in s if ord(c) < 256)
    headers = {"Title": safe(title), "Tags": tags, "Priority": "default"}
    if click_url:
        headers["Click"] = click_url
    if token:
        headers["Authorization"] = "Bearer " + token
    data = message.encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    resp = urllib.request.urlopen(req, timeout=20)
    return resp.status < 300


def load_state():
    try:
        with open(STATE_FILE) as f:
            return int(json.load(f).get("last_seen", 0))
    except Exception:
        return 0


def save_state(n):
    with open(STATE_FILE, "w") as f:
        json.dump({"last_seen": n}, f)


def main():
    if "--test" in sys.argv:
        ok = publish("Test \u2705 Bill Watcher",
                     "Watcher is live. New salon bills will arrive here with full details.\n"
                     "invoice_no: INV-test",
                     f"{BASE}?invMencr={invmencr(0)}&invshopid={SHOP}", "white_check_mark,test")
        print("test publish:", "OK" if ok else "FAIL")
        return 0

    last = load_state()
    print(f"last-seen invoice: {last}")

    if last == 0:
        # first run: initialise baseline to current latest (no notifications)
        latest = latest_invoice_number()
        save_state(latest)
        print(f"initialised baseline to {latest} (no notifications sent)")
        return 0

    new_numbers = find_new(last)
    print(f"found {len(new_numbers)} new bill number(s): {new_numbers}")
    if not new_numbers:
        print("no new bills")
        return 0

    n_new = 0
    for n in new_numbers:
        html = fetch(n)
        time.sleep(0.6)
        if not valid(html):
            print(f"  {n}: void/skipped")
            save_state(n)
            continue
        rec = parse(html, n)
        title = f"New Bill {rec['invoice_no']} · {fmt(rec['total'])}"
        click = f"{BASE}?invMencr={invmencr(n)}&invshopid={SHOP}"
        ok = publish(title, build_notification(rec), click, "receipt")
        n_new += 1
        print(f"  notified {rec['invoice_no']} ({'OK' if ok else 'FAIL'})")
        save_state(n)
    print(f"done, {n_new} new bills notified, last-seen advanced")
    return 0


if __name__ == "__main__":
    sys.exit(main())
