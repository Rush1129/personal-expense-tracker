# SpendWise — Personal Expense Tracker PWA

A beautiful, offline-first Progressive Web App for tracking your daily income and expenses. Built with React + Vite, with optional Supabase cloud storage for data persistence across devices.

## Features

- **🎙️ Voice entry** — tap **Speak**, say *"Spent 250 on lunch yesterday at 2 pm"*, and the amount, date, time, description and category are filled in for you
- **📝 Add/Edit/Delete** income and expense entries with category tagging (auto-suggested from the description)
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
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbG...your-anon-key
```

### 5. Restart the dev server

```bash
npm run dev
```

The app will now automatically sync all transactions to Supabase. If the network is unavailable, it falls back to IndexedDB.

---

## Access Code (optional)

To show a code screen before the app opens, list one or more codes in `.env` (or in your host's environment variables):

```bash
ACCESS_CODES=sunny-mango-42,blue-kite-77
```

- Codes are not case-sensitive. Give each person their own code, so you can remove one without affecting the others.
- A device that enters a valid code is remembered and won't be asked again. Removing that code from `ACCESS_CODES` (and redeploying) asks those devices again.
- **Settings → Lock this device** forgets the code on the current device.
- Leave `ACCESS_CODES` empty to turn the screen off.
- On iPhone, an app added to the Home Screen keeps its own storage, so it asks for the code once more after installing.

> **This is a lock screen, not real security.** The check runs in the browser: only hashes of the codes are shipped, but someone technical can still get past it. Your data is also still reachable directly through the Supabase anon key, so keep this for keeping casual visitors out. Longer codes (two or three words) are harder to guess.

---

## Deployment

### Option A: Vercel (Recommended — Free)

```bash
npm install -g vercel
vercel
```

When prompted, set the environment variables:
- `SUPABASE_URL` → your Supabase project URL
- `SUPABASE_ANON_KEY` → your anon key
- `ACCESS_CODES` → (optional) codes for the lock screen

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

## Voice Entry

Everything is free and needs no API keys.

| Step | How |
|------|-----|
| Speech → text | Browser's built-in speech recognition (`en-IN`). If it's missing or fails (Firefox, Brave, some iOS PWAs), falls back to **Whisper tiny** running on-device (~41 MB, downloaded once). Choose *On-device only* in Settings to keep audio on the phone. |
| Text → amount, date, time, type | Rule-based parser in [`src/voice/parseTransaction.js`](src/voice/parseTransaction.js): handles "2,500", "two hundred and fifty", "1.5k", "2 lakh", "yesterday", "last Friday", "on the 5th", "25/09", "at 7:30 pm", "this morning", income words like "received"/"salary", etc. |
| Description → category | Keyword rules tuned for Indian merchants (Swiggy, Ola, DMart, Jio…) in [`src/voice/categoryRules.js`](src/voice/categoryRules.js). When no keyword matches, an on-device **MiniLM** sentence-embedding model (~23 MB) picks the closest category (e.g. "medicines" → Bills, "haircut" → Shopping). |

The models run in a Web Worker via [transformers.js](https://huggingface.co/docs/transformers.js), loaded from the jsDelivr CDN on first use, so they add nothing to the app bundle. To add a category or improve detection, edit `CATEGORIES` in `utils.js` and the matching keywords/example phrases in `categoryRules.js`.

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
| Voice | Web Speech API, Whisper tiny + MiniLM via transformers.js (on-device) |

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
├── voice/
│   ├── parseTransaction.js    # Sentence → amount/date/time/type/description
│   ├── categoryRules.js       # Category keywords + model example phrases
│   ├── embeddingClassifier.js # Nearest-category matching on embeddings
│   ├── useVoiceInput.js       # Mic capture (browser speech / on-device)
│   ├── aiClient.js            # Promise API for the worker
│   └── ai.worker.js           # Whisper + MiniLM via transformers.js
└── components/
    ├── SummaryCard.jsx    # Balance card + income/expense pills
    ├── VoiceEntry.jsx     # Voice bottom sheet: listen → review → save
    ├── EntryForm.jsx      # Bottom sheet form (add/edit)
    ├── EntryList.jsx      # Date-grouped transaction list
    ├── DatePicker.jsx     # Custom calendar date picker
    ├── TimePicker.jsx     # Scrollable wheel time picker (optional)
    ├── Reports.jsx        # Charts, exports, date selector
    └── Settings.jsx       # Dark mode, backup, app info
```

## License

MIT
