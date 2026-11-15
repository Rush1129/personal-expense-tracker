# SpendWise — Personal Expense Tracker PWA

A beautiful, offline-first Progressive Web App for tracking your daily income and expenses. Built with React + Vite, with optional Supabase cloud storage for data persistence across devices.

## Features

- **🎙️ Voice entry** — tap **Speak**, say *"Spent 250 on lunch yesterday at 2 pm"*, and the amount, date, time, description and category are filled in for you. Say several at once (*"Chai 30 and samosa 20"*) and check them as a list. Works in English, Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada and Malayalam
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
| Speech → text | Browser's built-in speech recognition, in the language picked in Settings (`en-IN` by default). For English, if it's missing or fails (Firefox, Brave, some iOS PWAs), falls back to **Whisper tiny** running on-device (~41 MB, downloaded once). Choose *On-device only* in Settings to keep audio on the phone (English only, see below). |
| Text → amount, date, time, type | Rule-based parser in [`src/voice/parseTransaction.js`](src/voice/parseTransaction.js): handles "2,500", "two hundred and fifty", "1.5k", "2 lakh", "yesterday", "last Friday", "on the 5th", "25/09", "at 7:30 pm", "this morning", income words like "received"/"salary", etc. |
| Several in one sentence | `parseTransactions` splits on "and", "&", commas and full stops (and each language's own "and": और, आणि, மற்றும்…) when each part has its own amount ("bread and butter 60" stays one entry). A date or income word said once applies to every part. |
| Bank / UPI SMS | [`src/voice/parseSms.js`](src/voice/parseSms.js) reads the amount, debit or credit, date and payee from common Indian bank formats (SBI, HDFC, ICICI, Axis, Kotak, card spends). Shared SMS arrive through the manifest's `share_target` (Android only; iPhone doesn't support it). |
| Description → category | Keyword rules tuned for Indian merchants (Swiggy, Ola, DMart, Jio…) in [`src/voice/categoryRules.js`](src/voice/categoryRules.js), plus native-script keywords for each Indian language. When no keyword matches an English description, an on-device **MiniLM** sentence-embedding model (~23 MB) picks the closest category (e.g. "medicines" → Bills, "haircut" → Shopping). |

The models run in a Web Worker via [transformers.js](https://huggingface.co/docs/transformers.js), loaded from the jsDelivr CDN on first use, so they add nothing to the app bundle. To add a category or improve detection, edit `CATEGORIES` in `utils.js`, the English keywords in `categoryRules.js`, the example phrases in `categoryPrototypes.js`, and the native keywords in `src/voice/languages/<lang>.js`.

### Indian languages

Pick the language under **Settings → Voice input → Language**, or with the language button in the voice sheet. The choice is saved on the device. Typing in "Type instead" works in any of these languages too, whatever is picked: the parser goes by the script you type in (Devanagari is read as Hindi unless Marathi is picked).

| Language | Level | What's understood |
|----------|-------|-------------------|
| English (`en-IN`) | Full | Everything above. Hindi in English letters ("kal chai pe 30 diye", "papa ne 2000 bheje", "dhai hazaar ka petrol") is understood too. |
| Hindi (`hi-IN`) | Full | Indian or Devanagari digits (२५०), every number word 1–99 with सौ/हज़ार/लाख/करोड़, डेढ़/ढाई/साढ़े/सवा/पौने ("साढ़े तीन सौ" = 350), आज/कल/परसों, "3 दिन पहले", पिछले हफ़्ते, weekdays, months, "5 तारीख", सुबह/दोपहर/शाम/रात, "7 बजे", spend/receive verbs (ख़र्च किए, दिए, भरा / मिले, आए, "पापा ने दिए"), "और" between entries, Hindi-English mixing ("कल Swiggy से 300 का order"), Hindi category keywords. |
| Marathi (`mr-IN`) | Full | Same as Hindi with Marathi words: every number 1–99, joined hundreds (दोनशे, अडीचशे, साडेतीनशे), काल/परवा, "गेल्या सोमवारी", सकाळी/संध्याकाळी, "7 वाजता", खर्च केले/दिले/भरले vs मिळाले/"आईने मला दिले", "आणि", Marathi keywords (matched even with joined endings: पेट्रोलसाठी). |
| Gujarati (`gu-IN`) | Basic | Digits, number words 1–20 and the tens, joined hundreds (પાંચસો), હજાર/લાખ, દોઢ/અઢી/સાડા, આજે/ગઈકાલે/પરમદિવસે, weekdays, સવારે/સાંજે, "7 વાગ્યે", spend/receive verbs, "અને", common keywords. |
| Bengali (`bn-IN`) | Basic | Digits (incl. ০–৯), number words 1–20 and the tens, joined hundreds (পাঁচশো), হাজার/লাখ, দেড়/আড়াই/সাড়ে, আজ/কাল/পরশু, weekdays, সকালে/সন্ধ্যায়, "7টায়", টাকা as rupees, spend/receive verbs (দিয়েছি vs দিয়েছে), "আর/এবং", common keywords. |
| Tamil (`ta-IN`) | Basic | Digits, number words 1–10, the tens, நூறு and joined hundreds (ஐநூறு), ஆயிரம்/லட்சம், இன்று/நேற்று/முந்தாநாள், weekdays, காலை/மாலை, "7 மணிக்கு", spend/receive verbs (கொடுத்தேன் vs கொடுத்தார்), "மற்றும்", common keywords. |
| Telugu (`te-IN`) | Basic | Digits, number words 1–10 and the tens ("ఇరవై ఐదు" = 25), వంద/వేలు/లక్ష, ఈరోజు/నిన్న/మొన్న, weekdays, ఉదయం/సాయంత్రం, "6 గంటలకు", spend/receive verbs (ఇచ్చాను vs ఇచ్చారు), "మరియు", common keywords. |
| Kannada (`kn-IN`) | Basic | Digits, number words 1–10, the tens, ನೂರು and joined hundreds (ಐನೂರು), ಸಾವಿರ/ಲಕ್ಷ, ಇಂದು/ನಿನ್ನೆ/ಮೊನ್ನೆ, weekdays, ಬೆಳಿಗ್ಗೆ/ಸಂಜೆ, "7 ಗಂಟೆಗೆ", spend/receive verbs (ಕೊಟ್ಟೆ vs ಕೊಟ್ಟರು), "ಮತ್ತು", common keywords. |
| Malayalam (`ml-IN`) | Basic | Digits, number words 1–10, the tens, നൂറ് and joined hundreds (അഞ്ഞൂറ്), ആയിരം/ലക്ഷം, ഇന്ന്/ഇന്നലെ, weekdays, രാവിലെ/വൈകുന്നേരം, "7 മണിക്ക്", spend/receive verbs (കൊടുത്തു vs തന്നു), "പിന്നെ", common keywords. |

#### Descriptions saved in English

With **Settings → Voice input → Save descriptions in English** on (the default), what you say is saved in English, so your entries list stays in one language. The review screen shows the English version before you save, so you can fix it; the "heard" line still shows what you said.

| Said | Saved as |
|------|----------|
| दोस्तों के साथ डिनर | Dinner with friends |
| बिजली का बिल · ऑटो का किराया | Electricity bill · Auto fare |
| मम्मी से किताबों के लिए | Books from mom |
| मित्रांसोबत जेवण (Marathi) | Meal with friends |
| நண்பர்களுடன் சினிமா (Tamil) | Movie with friends |
| doston ke saath dinner | Dinner with friends |
| नरेश भैया | Naresh bhaiya |

How it works ([`src/voice/languages/toEnglish.js`](src/voice/languages/toEnglish.js)): each language file has an English word list (food, transport, bills, shopping, people and places: about 280 words for Hindi, 185 for Marathi, 140–160 for the others and 90 for Hinglish) and its words for "with / for / from / in". Phrases are put in English order ("X के साथ Y" → "Y with X"), and "of" words are dropped ("बिजली का बिल" → "electricity bill"). Any word not on the list is written in English letters ([`transliterate.js`](src/voice/languages/transliterate.js)), the way people type Hinglish. Names come out right; other words come out readable but not translated. It runs instantly and offline with nothing to download. A real translation model would be better at full sentences, but the smallest one for Hindi alone is about 110 MB, and Chrome's built-in Translator works only on desktop, not Android. Descriptions in English letters also let the AI category model help when no keyword matches. Entries saved before this setting existed are not changed.

Limits worth knowing:

- **Needs the browser's speech service.** Chrome on Android sends the audio to Google's speech service, so Indian-language voice needs internet. The on-device Whisper tiny model is English-only, and the multilingual tiny model gets most Indian-language words wrong, so there is no offline fallback for these languages. Instead of guessing, the app says so and offers "Speak in English instead" or typing.
- **iPhone:** Safari's speech recognition uses Apple's dictation. Hindi is supported; the other languages depend on the iOS version. If one isn't available, the app shows a message rather than failing quietly.
- **What Chrome writes for these languages isn't documented,** so the parser accepts every form: Indian digits or 0–9, number words, native script and English loanwords in either script ("ऑटो" or "auto"). The sample sentences in the test script are written the way the recogniser usually writes them (native script, amounts as digits), but they were typed, not recorded on a phone.
- **"Basic" languages** don't read long compound number words said in full (Tamil இருநூற்று ஐம்பது, Gujarati બસો પચાસ…). The recogniser normally writes amounts as digits, so this rarely matters; if it happens, the amount box is left empty to fill in.
- **AI categories are English-only.** The MiniLM model doesn't understand Indian scripts, so categories come from the language's keyword list first; with "Save descriptions in English" on, the English version is then given to the AI model too. A multilingual model (e.g. multilingual-e5-small) would need about 118 MB instead of 23 MB, so it isn't used.
- Short words that are also everyday words only count as numbers before a scale or currency word: "एक चाय 20" is ₹20, not ₹1, and "do sau" is 200 but "do" alone isn't 2.

Run the parser checks with `npm run test:voice` (English cases included, so changes for one language can't quietly break another).

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
| Voice | Web Speech API (English + 8 Indian languages), Whisper tiny + MiniLM via transformers.js (on-device) |

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
