# SpendWise — Personal Expense Tracker PWA

A beautiful, offline-first Progressive Web App for tracking your daily income and expenses. Built with React + Vite, with optional Supabase cloud storage for data persistence across devices.

## Features

- **📝 Add/Edit/Delete** income and expense entries with category tagging
- **📅 Calendar date picker** with optional scrollable time selector
- **📊 Reports & Charts** — category pie chart, daily bar chart, 6-month trend
- **📥 Export** clean PDF and Excel reports for any date range
- **🌙 Dark Mode** with automatic system preference detection
- **📱 PWA** — installable on your phone, works offline
- **💾 Backup/Restore** — export all data as JSON, import it back anytime
- **☁️ Supabase cloud sync** — optional, data persists across devices
- **🇮🇳 Indian format** — ₹ currency with Indian digit grouping (1,00,000)

## Quick Start (Offline Only)

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Data is stored in IndexedDB — no setup needed.

---

## Cloud Database Setup (Supabase)

To persist data in the cloud and sync across devices:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (any region, any password)
3. Wait for the project to finish provisioning (~2 minutes)

### 2. Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor** → **New Query**
2. Paste the contents of [`supabase-setup.sql`](supabase-setup.sql)
3. Click **Run**

### 3. Get Your API Keys

1. Go to **Settings** → **API**
2. Copy the **Project URL** and **anon/public** key

### 4. Configure the App

```bash
# Copy the template
cp .env.example .env

# Edit .env and paste your values:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...your-anon-key
```

### 5. Restart the dev server

```bash
npm run dev
```

The app will now automatically sync all transactions to Supabase. If the network is unavailable, it falls back to IndexedDB.

---

## Deployment

### Option A: Vercel (Recommended — Free)

```bash
npm install -g vercel
vercel
```

When prompted, set the environment variables:
- `VITE_SUPABASE_URL` → your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` → your anon key

Or set them in **Vercel Dashboard → Settings → Environment Variables**.

### Option B: Netlify (Free)

```bash
npm run build
# Upload the `dist/` folder to Netlify
```

Set environment variables in **Netlify Dashboard → Site Settings → Build & Deploy → Environment**.

### Option C: GitHub Pages / Any Static Host

```bash
npm run build
# Deploy the `dist/` folder
```

> **Note:** Without Supabase env vars, the app runs in offline-only mode (IndexedDB). This is perfectly fine for personal use on a single device.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Local DB | IndexedDB via Dexie.js |
| Cloud DB | Supabase (PostgreSQL) |
| PDF Export | jsPDF + jspdf-autotable |
| Excel Export | SheetJS (xlsx) |
| Charts | Recharts |
| Icons | Lucide React |
| PWA | vite-plugin-pwa |

## Data Architecture

```
┌─────────────┐    ┌─────────────────┐
│  React App  │───▶│   db.js (CRUD)  │
└─────────────┘    └────────┬────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
            ┌──────▼──────┐  ┌───────▼───────┐
            │  IndexedDB  │  │   Supabase    │
            │  (offline)  │  │   (cloud)     │
            │  via Dexie  │  │  PostgreSQL   │
            └─────────────┘  └───────────────┘
```

- **Supabase configured?** → Cloud is source of truth, IndexedDB is cache
- **Supabase not configured?** → IndexedDB only (works great for single device)
- **Network error?** → Graceful fallback to IndexedDB

## Project Structure

```
src/
├── main.jsx           # Entry point
├── App.jsx            # Tab navigation, FAB, layout
├── AppContext.jsx      # Global state (React Context)
├── db.js              # Dual-mode database (IndexedDB + Supabase)
├── supabaseClient.js  # Supabase client (auto-detects env vars)
├── utils.js           # Formatters, categories, helpers
├── exportUtils.js     # PDF & Excel export
├── index.css          # Tailwind v4 + animations
└── components/
    ├── SummaryCard.jsx    # Balance card + income/expense pills
    ├── EntryForm.jsx      # Bottom sheet form (add/edit)
    ├── EntryList.jsx      # Date-grouped transaction list
    ├── DatePicker.jsx     # Custom calendar date picker
    ├── TimePicker.jsx     # Scrollable wheel time picker (optional)
    ├── Reports.jsx        # Charts, exports, date selector
    └── Settings.jsx       # Dark mode, backup, app info
```

## License

MIT
