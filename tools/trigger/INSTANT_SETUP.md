# ⚡ Instant Bill Notification — Permanent Setup Guide

## System ab kaise kaam karta hai (2-lane, duplicate-free)

| Lane | Kaise | Speed |
|---|---|---|
| **Lane 1 — Instant (ye setup)** | Salon PC ya free cloud cron har 90 sec me watcher ko jagata hai | Bill bane ke **~1–3 minute** me notification |
| **Lane 2 — Fallback (already on)** | GitHub schedule har 5 min | Kabhi-kabhi GitHub delay kare to bhi bill **miss kabhi nahi** hota |

Watcher ek hi hai aur state repo me commit hoti hai — isliye **koi bill do baar notify nahi hota**, PC bandh ho tab bhi Lane 2 pakad lega, aur backlog hua to ek digest summary aayegi (flood nahi).

---

## OPTION A — Salon PC se (sabse best, recommended)

Salon ka billing PC waise bhi poora din ON rehta hai — perfect hai.

### Step 1: Naya chhota GitHub token banao (2 minute, one-time)
1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
2. Name: `bill-pinger`
3. **Repository access:** Only select repositories → `salon-invoice-viewer`
4. **Permissions:** Repository permissions → **Actions → Read and write** (sirf yahi ek)
5. Expiration: **No expiration** (ya 1 saal) → Generate → token copy kar lo

### Step 2: Files PC pe rakho
Repo se ye 3 files salon PC pe kisi folder me rakho (jaise `D:\BillWatcher\`):
- `ping_watcher.py`
- `start_pinger.bat`
- ek nayi file banao **`TOKEN.txt`** — usme sirf token paste karo (ek hi line)

> PC pe Python chahiye (python.org se free). Install ke time **"Add Python to PATH"** tick karna.

### Step 3: Chalao
**`start_pinger.bat` double-click karo.** Ek black window khulegi jo har 90 second me `OK (watcher triggered)` likhti rahegi. Window khuli rehne do (minimize kar sakte ho).

### Step 4 (optional): PC start hote hi auto-chalu
1. Start Menu me **Task Scheduler** kholo → **Create Basic Task**
2. Name: `BillWatcher` → Trigger: **When I log on** → Action: **Start a program** → `start_pinger.bat` select karo → Finish
Ab PC on hote hi pinger khud chal jayega — kuch yaad rakhne ki zaroorat nahi.

---

## OPTION B — Cloud cron (PC ki zaroorat nahi, free)

Agar salon PC pe kuch chalana nahi chahte:

1. Upar Step 1 jaisa hi fine-grained token banao
2. **cron-job.org** pe free account banao → **Create cronjob**
3. Settings:
   - **URL:** `https://api.github.com/repos/jackbhai/salon-invoice-viewer/dispatches`
   - **Schedule:** Every 1 minute (ya `*/2`)
   - **Request method:** POST
   - **Headers:** `Authorization: Bearer <TOKEN>` , `Accept: application/vnd.github+json` , `Content-Type: application/json`
   - **Request body:** `{"event_type":"new-bill-check"}`
4. Save. cron-job.org har minute watcher ko jaga dega. Expected response: **204**.

*(Dono options ek saath bhi on rakh sakte ho — duplicate phir bhi nahi aayega.)*

---

## Android phone se (alternative)
Termux app me: `pkg install python` → is folder ki files rakho → `python ping_watcher.py`
Phone plugged-in + Termux background me = PC jaisa kaam. (Battery optimization me Termux ko "Unrestricted" karna.)

---

## Permanent rehne ki checklist ✅
- [x] State repo me commit hoti hai (cache wala freeze bug fix ho gaya)
- [x] Keep Alive workflow daily commit karta hai → GitHub ka 60-din auto-disable kabhi nahi hoga
- [x] Anti-flood digest: backlog ho to 1 summary, spam nahi
- [x] Repo **public** = GitHub Actions free + unlimited (repo public hi rakhna)
- [ ] ntfy app phone me installed + topic `salon-bills-c38d863a12e1f4` subscribed

## Timing ki sachhaai
- Lane 1 se: aam taur pe **1–3 minute** me notification (GitHub run start hone + check karne ka time milake).
- **Seconds (<30s) me** chahiye to ek hi tareeka hai: watcher khud salon PC pe chalana (bina GitHub ke). Bolo to wo version bhi bana dunga — usme GitHub lane off rakhni hogi warna PC bandh hone par sirf PC wala hi kaam karega.
