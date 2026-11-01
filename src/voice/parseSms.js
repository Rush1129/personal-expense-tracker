import { matchCategoryByKeywords } from './categoryRules';

// Bank and UPI SMS shared or pasted into the app, such as
//   "Rs.250.00 debited from A/c XX1234 on 31-10-26 to VPA swiggy@icici UPI Ref 430212345678"
// → { type: 'expense', amount: 250, description: 'Swiggy', category: 'food', … }
// Each bank words these differently, so every field has a few patterns tried in order.

const DEBIT = /\b(debited|debit|spent|sent|paid|withdrawn|withdrawal|purchase)\b/i;
const CREDIT = /\b(credited|received|deposited|refund(?:ed)?)\b/i;
// Account, reference or balance wording that spoken entries don't use
const BANK_MARKERS = /\b(a\/c|acct|account|vpa|ref\s*no|refno|ref|avl|avbl|available bal(?:ance)?|neft|imps|rtgs|upi:\s*\d|card\s+(?:no|xx|ending)|x{2,}\d{2,}|\*{1,}\d{3,})/i;

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function looksLikeBankSms(text) {
  const t = text || '';
  return (DEBIT.test(t) || CREDIT.test(t)) && BANK_MARKERS.test(t) && /\d/.test(t);
}

// ---------- Amount ----------

function smsAmount(text) {
  const re = /(?:rs\.?|inr|₹)\s*:?\s*([\d,]+(?:\.\d{1,2})?)|\b(?:debited|credited|paid|sent|spent)\s+(?:by|for|with|of)?\s*([\d,]+(?:\.\d{1,2})?)\b/gi;
  for (const m of text.matchAll(re)) {
    // Skip balances and limits: "Avl Bal Rs 5,000", "Avl Lmt: INR 45,000"
    const before = text.slice(Math.max(0, m.index - 24), m.index);
    if (/\b(bal(?:ance)?|lmt|limit|avl|avbl|available)\b[\s.:-]*(?:is|of)?[\s.:-]*$/i.test(before)) continue;
    const value = parseFloat((m[1] || m[2]).replace(/,/g, ''));
    if (value > 0) return value;
  }
  return null;
}

// ---------- Type ----------

// Whichever comes first wins: "A/c debited …; UBER INDIA credited" is a debit
function smsType(text) {
  const debit = DEBIT.exec(text);
  const credit = CREDIT.exec(text);
  return credit && (!debit || credit.index < debit.index) ? 'income' : 'expense';
}

// ---------- Date and time ----------

function validDate(year, month, day) {
  const y = year < 100 ? 2000 + year : year;
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const d = new Date(y, month, day);
  return d.getMonth() === month ? d : null;
}

function smsDate(text) {
  let m = text.match(/\b(\d{1,2})[-/ ]?([a-z]{3})[a-z]*[-/ ,]*(\d{4}|\d{2})\b/i); // 31-Oct-26, 31Oct26, 31 Oct 2026
  if (m && MONTHS.includes(m[2].toLowerCase())) {
    const d = validDate(+m[3], MONTHS.indexOf(m[2].toLowerCase()), +m[1]);
    if (d) return d;
  }
  m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/); // 2026-10-31
  if (m) {
    const d = validDate(+m[1], +m[2] - 1, +m[3]);
    if (d) return d;
  }
  m = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/); // 31-10-26, 31/10/2026 (day first)
  if (m) return validDate(+m[3], +m[2] - 1, +m[1]);
  return null;
}

function smsTime(text) {
  const m = text.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i);
  if (!m) return null;
  let hour = +m[1];
  const minute = +m[2];
  if (m[3]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
  if (m[3]?.toLowerCase() === 'am' && hour === 12) hour = 0;
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

// ---------- Merchant ----------

// Where a payee name ends: "… to SWIGGY On 31/10/26", "… swiggy@icici UPI Ref …"
const END = String.raw`(?=\s+(?:on|ref|refno|upi|via|using|avl|avbl|info|not|if|call|txn|transaction|dated|bal|from|for|is|has|and|thru|through)\b|\s*[.;,(:]|\s+-|\s*$)`;
const BOILERPLATE = /^(?:upi|ref|on|info|avl|avbl|not|if|call|txn|your|a\/?c|acct|account|vpa|card|bank|beneficiary|mob|mobile|net ?banking)\b/i;
const GATEWAYS = new Set([
  'paytmqr', 'paytm', 'bharatpe', 'phonepe', 'gpay', 'googlepay', 'upi', 'pay', 'merchant', 'razorpay', 'rzp',
  'cashfree', 'billdesk', 'payu', 'mab', 'qr', 'ybl', 'ibl', 'axl', 'okaxis', 'okhdfcbank', 'okicici', 'oksbi',
]);
const SUFFIX = /\s+(?:india|pvt|private|ltd|limited|llp|inc|technologies|technology|tech|services|solutions|retail|internet|online|payments?|orders?|in|co)\.?$/i;
const ACRONYMS = new Set(['irctc', 'kfc', 'bsnl', 'lic', 'sbi', 'hdfc', 'icici', 'atm', 'emi', 'pvr', 'dth', 'lpg', 'bpcl', 'hpcl', 'iocl', 'mtnl']);
const LEGAL_NAMES = [
  [/\bbundl technologies\b/i, 'Swiggy'],
  [/\bani technologies\b/i, 'Ola'],
  [/\bone ?97 communications\b/i, 'Paytm'],
];

// "uber.india" → "uber india"; "9876543210" and "paytmqr2810050501…" → null
function handleToName(handle) {
  const words = handle
    .split(/[._-]+/)
    .filter((w) => w && !GATEWAYS.has(w.toLowerCase()) && (w.match(/\d/g) || []).length < 3);
  const name = words.join(' ');
  return (name.match(/[a-z]/gi) || []).length >= 3 ? name : null;
}

function tidyName(raw) {
  for (const [re, name] of LEGAL_NAMES) if (re.test(raw)) return name;
  let s = raw.replace(/[*_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/[\s.&-]+$/, '');
  // Drop "India", "Pvt Ltd" and similar from the end, but never the last word
  let prev;
  do {
    prev = s;
    if (s.includes(' ')) s = s.replace(SUFFIX, '').trim();
  } while (s !== prev);
  return s
    .split(' ')
    .map((w) => {
      if (ACRONYMS.has(w.toLowerCase())) return w.toUpperCase();
      // Retitle words that are all one case; keep "McDonald's" as it is
      return /^[^a-z]+$/.test(w) || /^[^A-Z]+$/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w;
    })
    .join(' ');
}

function smsMerchant(text) {
  const name = String.raw`((?!(?:upi|ref|on|info|avl|not|if|call|txn)\b)[A-Za-z][A-Za-z0-9 &.'*-]{1,40}?)`;
  const candidates = [
    // HDFC: "to VPA paytmqr281005@paytm SHARMA GENERAL STORE on …" (the name after the handle)
    () => text.match(new RegExp(String.raw`\b(?:to|by|from)\s+vpa\s+\S+@\S+\s+${name}${END}`, 'i'))?.[1],
    // "to VPA swiggy@icici", "by VPA mom@okaxis"
    () => {
      const handle = text.match(/\b(?:to|by|from)\s+vpa\s+([\w.-]+)@/i)?.[1];
      return handle && handleToName(handle);
    },
    // ICICI: "debited for Rs 180.00 on 31-Oct-26; UBER INDIA credited"
    () => text.match(new RegExp(String.raw`[;&]\s*${name}\s+credited\b`, 'i'))?.[1],
    // "To SWIGGY On …", "at AMAZON PAY IN.", "trf to SWIGGY Refno …", "towards NETFLIX"
    () => text.match(new RegExp(String.raw`\b(?:trf to|transfer to|paid to|sent to|to|at|towards)\s+${name}${END}`, 'i'))?.[1],
    // "Info: UPI/P2M/430212345678/SWIGGY LIMITED"
    () => text.match(/\bupi\/(?:[^/\s]+\/)*([A-Za-z][A-Za-z0-9 &.'-]{2,40}?)(?=\/|\s+(?:on|ref|avl)\b|[.;,]|$)/i)?.[1],
    // Credits: "by NEFT-ACME PVT LTD SALARY", "received from RAMESH KUMAR"
    () => text.match(new RegExp(String.raw`\b(?:by|from)\s+(?:(?:neft|imps|rtgs|upi)[\s/-]*)?${name}${END}`, 'i'))?.[1],
  ];
  for (const candidate of candidates) {
    const raw = candidate()?.trim();
    if (raw && !BOILERPLATE.test(raw) && (raw.match(/[a-z]/gi) || []).length >= 2) return tidyName(raw);
  }
  return '';
}

// ---------- Main ----------

export function parseBankSms(input, now = new Date()) {
  const transcript = (input || '').trim();
  const text = transcript.replace(/\s+/g, ' ');
  const type = smsType(text);
  const description = smsMerchant(text);

  let date = smsDate(text);
  // A future or missing date is a misread: use today
  if (!date || date > now) date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const time = smsTime(text);
  if (time) date.setHours(time.hour, time.minute, 0, 0);
  else date.setHours(now.getHours(), now.getMinutes(), 0, 0);
  if (date > now) date = new Date(now);

  const match = description ? matchCategoryByKeywords(description, type) : null;

  return {
    transcript,
    source: 'sms',
    type,
    amount: smsAmount(text),
    description,
    category: match?.category || 'other',
    categorySource: match ? 'keyword' : 'default',
    date: date.toISOString(),
    hasTime: !!time,
    dateWasSpoken: true,
    typeWasSpoken: true,
  };
}
