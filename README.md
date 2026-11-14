# SpendWise — Personal Expense Tracker PWA

A beautiful, offline-first Progressive Web App for tracking your daily income and expenses. Built with React + Vite, with optional Supabase cloud storage for data persistence across devices.

## Features

- **🎙️ Voice entry** — tap **Speak**, say *"Spent 250 on lunch yesterday at 2 pm"*, and the amount, date, time, description and category are filled in for you. Say several at once (*"Chai 30 and samosa 20"*) and check them as a list
- **💬 Bank SMS** — on Android, share a debit or UPI SMS to SpendWise from the Share menu (or paste one into *Type instead*): *"Rs.250 debited … to VPA swiggy@icici"* becomes ₹250 · Swiggy · Food
- **📝 Add/Edit/Delete** income and expense entries with category tagging (auto-suggested from the description)
- **📅 Calendar date picker** with optional scrollable time selector
- **📊 Reports & Charts** — category pie chart, daily bar chart, 6-month trend
- **📥 Export** PDF reports styled like the app, and Excel sheets, for any date range
- **🌙 Dark Mode** with automatic system preference detection
- **📱 PWA** — installable on your phone, works offline
- **💾 Backup/Restore** — export all data as JSON, import it back anytime
- **☁️ Accounts & cloud sync** — optional, with Supabase: each person signs in (email or Google), sees only their own entries, and syncs across their devices
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
2. Paste the contents of [`supabase-setup.sql`](supabase-setup.sql), and replace `you@example.com` with the email you'll sign in with
3. Click **Run**
4. Set up sign-in as described in [Accounts and friends](#accounts-and-friends)

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

The app now asks you to sign in, then syncs your entries to Supabase. If the network is unavailable, it falls back to IndexedDB.

---

## Accounts and friends

With Supabase configured, everyone signs in, and each account sees only its own entries. The database enforces this with row-level security, so the anon key in the app bundle reads nothing on its own. Only emails on the invite list (the `allowed_emails` table) can create an account.

### Supabase settings (once)

1. **Authentication → Sign In / Providers → Email:** keep it enabled and turn **Confirm email** off. Supabase's built-in email only reaches your own team's addresses, so confirmation emails wouldn't reach friends.
2. **Authentication → URL Configuration:** set **Site URL** to your deployed address. Add it, plus `http://localhost:5173`, under **Redirect URLs**.
3. **Google (optional):**
   - In Google Cloud Console, create an OAuth client of type *Web application* with the redirect URI `https://<your-project>.supabase.co/auth/v1/callback`.
   - Set the OAuth consent screen to *In production*. Basic email and profile access needs no review.
   - Paste the client ID and secret into **Authentication → Sign In / Providers → Google**.

### Invite a friend

```sql
insert into allowed_emails (email) values ('friend@example.com');  -- lowercase
```

Then send them the app's link. They tap **Create an account** or **Continue with Google**. Any other email gets "This email isn't on the invite list".

### Remove a friend

Delete their row from `allowed_emails`, and their user under **Authentication → Users**. Deleting the user also deletes their entries.

### Reset a friend's password

No email service is connected, so **Forgot password** can't send emails. Set a new password in the SQL Editor and tell them what it is:

```sql
update auth.users
set encrypted_password = extensions.crypt('new-password-here', extensions.gen_salt('bf'))
where email = 'friend@example.com';
```

To send reset emails instead, connect an email service such as Brevo or Resend under **Authentication → SMTP Settings**.

### Good to know

- **iPhone:** use email + password inside the Home Screen app. Google sign-in can finish in Safari instead and leave the app signed out.
- **Signing out** uploads what it can first, then removes that account's entries from the device. Settings warns you if some haven't uploaded yet.
- **Shared phones** are fine: each account keeps its own offline copy.

### Upgrading from the single-user version

1. Do the Supabase settings above.
2. **Authentication → Users → Add user:** create your own account and tick *Auto Confirm User*.
3. Put your email in [`supabase-multi-user.sql`](supabase-multi-user.sql) and run it in the SQL Editor. Your existing entries become yours.
4. Deploy straight away. Until the new version reaches your phone, the old one can't sync. Its new entries wait on the phone and upload after you sign in.

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
| Several in one sentence | `parseTransactions` splits on "and", "&", commas and full stops when each part has its own amount ("bread and butter 60" stays one entry). A date or income word said once applies to every part. |
| Bank / UPI SMS | [`src/voice/parseSms.js`](src/voice/parseSms.js) reads the amount, debit or credit, date and payee from common Indian bank formats (SBI, HDFC, ICICI, Axis, Kotak, card spends). Shared SMS arrive through the manifest's `share_target` (Android only; iPhone doesn't support it). |
| Description → category | Keyword rules tuned for Indian merchants (Swiggy, Ola, DMart, Jio…) in [`src/voice/categoryRules.js`](src/voice/categoryRules.js). When no keyword matches, an on-device **MiniLM** sentence-embedding model (~23 MB) picks the closest category (e.g. "medicines" → Bills, "haircut" → Shopping). |

The models run in a Web Worker via [transformers.js](https://huggingface.co/docs/transformers.js), loaded from the jsDelivr CDN on first use, so they add nothing to the app bundle. To add a category or improve detection, edit `CATEGORIES` in `utils.js` and the matching keywords/example phrases in `categoryRules.js`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Local DB | IndexedDB via Dexie.js |
| Cloud DB | Supabase (PostgreSQL) |
| PDF Export | jsPDF |
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

- **Supabase configured?** → Cloud is source of truth, IndexedDB is cache. Each account signed in on a device gets its own cache (`SpendWiseDB-<user id>`).
- **Supabase not configured?** → IndexedDB only, no sign-in (works great for single device)
- **Network error?** → Graceful fallback to IndexedDB
- **Opening the app** shows what's saved on the device right away, then refreshes from Supabase in the background. Charts, PDF and Excel code load only when needed.

## Project Structure

```
src/
├── main.jsx           # Entry point
├── App.jsx            # Tab navigation, FAB, layout
├── AppContext.jsx      # Global state (React Context)
├── db.js              # Dual-mode database (IndexedDB + Supabase), one cache per account
├── auth.js            # Sign-in, sign-up, Google, sign-out (Supabase Auth)
├── supabaseClient.js  # Supabase client (auto-detects env vars)
├── utils.js           # Formatters, categories, helpers
├── exportUtils.js     # PDF & Excel export
├── index.css          # Tailwind v4 + animations
├── voice/
│   ├── parseTransaction.js    # Sentence → amount/date/time/type/description (one or several)
│   ├── parseSms.js            # Bank / UPI SMS → the same fields
│   ├── categoryRules.js       # Category keywords + model example phrases
│   ├── embeddingClassifier.js # Nearest-category matching on embeddings
│   ├── useVoiceInput.js       # Mic capture (browser speech / on-device)
│   ├── aiClient.js            # Promise API for the worker
│   └── ai.worker.js           # Whisper + MiniLM via transformers.js
└── components/
    ├── AuthGate.jsx       # Sign-in screen; opens the signed-in account's data
    ├── SummaryCard.jsx    # Balance card + income/expense pills
    ├── VoiceEntry.jsx     # Voice bottom sheet: listen → review → save
    ├── EntryForm.jsx      # Bottom sheet form (add/edit)
    ├── EntryList.jsx      # Date-grouped transaction list
    ├── DatePicker.jsx     # Custom calendar date picker
    ├── TimePicker.jsx     # Scrollable wheel time picker (optional)
    ├── Reports.jsx        # Charts, exports, date selector
    ├── Logo.jsx           # The ₹ mark (same outline as the app icons)
    └── Settings.jsx       # Account & sign-out, dark mode, backup, app info
```

## License

MIT
