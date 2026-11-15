// Checks the voice parser against sample sentences in every supported language.
// Run with: npm run test:voice
//
// "Today" is fixed to Sunday 15 Nov 2026, 6:30 pm, so dates are predictable.
// Each case lists only the fields it cares about: amount, type, category,
// date (YYYY-MM-DD), time (HH:MM, or null for "no time said"), description, and
// english: the description as it's saved with "Save descriptions in English" on.
import { createServer } from 'vite';

const NOW = new Date(2026, 10, 15, 18, 30);
let toEnglish;

const CASES = {
  'en-IN': [
    ['Spent 250 on lunch yesterday at 2 pm', [{ amount: 250, type: 'expense', category: 'food', date: '2026-11-14', time: '14:00', description: 'Lunch' }]],
    ['Chai 30 and samosa 20', [{ amount: 30, category: 'food' }, { amount: 20, category: 'food' }]],
    ['Uber to office 180', [{ amount: 180, category: 'transport', english: 'Uber to office' }]],
    ['Received salary 50,000 on the 1st', [{ amount: 50000, type: 'income', category: 'salary', date: '2026-11-01' }]],
    ['Paid 1,200 for electricity bill', [{ amount: 1200, type: 'expense', category: 'bills' }]],
    ["Spent two hundred and fifty rupees on lunch at Domino's yesterday at 2 pm", [{ amount: 250, description: "Lunch at Domino's" }]],
    ['bread and butter 60', [{ amount: 60, category: 'groceries', description: 'Bread and butter' }]],
    ['received 500 from dad and spent 200 on books', [{ amount: 500, type: 'income' }, { amount: 200, type: 'expense', category: 'shopping' }]],
    ['dinner with friends 1500 last friday', [{ amount: 1500, date: '2026-11-13', category: 'food' }]],
    ['three thousand five hundred for shoes', [{ amount: 3500, category: 'shopping' }]],
  ],

  // Hindi in Devanagari, as Chrome's hi-IN recogniser writes it
  'hi-IN': [
    ['कल लंच पर 250 रुपये खर्च किए', [{ amount: 250, type: 'expense', category: 'food', date: '2026-11-14', description: 'लंच', english: 'Lunch' }]],
    ['चाय 30 और समोसा 20', [{ amount: 30, category: 'food', description: 'चाय', english: 'Tea' }, { amount: 20, category: 'food', description: 'समोसा', english: 'Samosa' }]],
    ['ऑटो का किराया 80', [{ amount: 80, category: 'transport', english: 'Auto fare' }]],
    ['सैलरी 50,000 मिली', [{ amount: 50000, type: 'income', category: 'salary' }]],
    ['बिजली का बिल 1,200 भरा', [{ amount: 1200, type: 'expense', category: 'bills', english: 'Electricity bill' }]],
    ['दो सौ पचास रुपये का पेट्रोल', [{ amount: 250, category: 'transport', description: 'पेट्रोल' }]],
    ['ढाई हज़ार की शॉपिंग', [{ amount: 2500, category: 'shopping' }]],
    ['साढ़े तीन सौ रुपये की दवाई', [{ amount: 350, category: 'bills', description: 'दवाई' }]],
    ['सवा लाख का बोनस मिला', [{ amount: 125000, type: 'income', category: 'salary' }]],
    ['डेढ़ सौ का नाश्ता', [{ amount: 150, category: 'food' }]],
    ['पापा ने 2000 रुपये भेजे', [{ amount: 2000, type: 'income', category: 'pocketmoney' }]],
    ['मैंने दोस्त को 500 दिए', [{ amount: 500, type: 'expense' }]],
    ['परसों दूध 60', [{ amount: 60, category: 'groceries', date: '2026-11-13' }]],
    ['पिछले शुक्रवार दोस्तों के साथ डिनर 1500', [{ amount: 1500, category: 'food', date: '2026-11-13', description: 'दोस्तों के साथ डिनर', english: 'Dinner with friends' }]],
    ['शाम 7 बजे मूवी टिकट 400', [{ amount: 400, category: 'entertainment', date: '2026-11-15', time: '19:00' }]],
    ['३ दिन पहले किराना ८५०', [{ amount: 850, category: 'groceries', date: '2026-11-12' }]],
    ['एक चाय 20', [{ amount: 20, category: 'food', description: 'चाय' }]],
    ['ज़ोमैटो से 349 का खाना मंगाया', [{ amount: 349, category: 'food' }]],
    ['आज सुबह 9 बजे ऑटो 60 और मेट्रो 40', [{ amount: 60, category: 'transport', time: '09:00' }, { amount: 40, category: 'transport' }]],
    ['5 तारीख को बिजली का बिल 900', [{ amount: 900, category: 'bills', date: '2026-11-05' }]],
    ['रात साढ़े 8 बजे पिज़्ज़ा 450', [{ amount: 450, category: 'food', time: '20:30' }]],
    // Code-mixed: English words inside Hindi
    ['कल Swiggy से 300 का order', [{ amount: 300, category: 'food', date: '2026-11-14', english: 'Order from Swiggy' }]],
    // "दो" here is "two" without a scale word, so it is not the amount
    ['दो चाय 40', [{ amount: 40, category: 'food' }]],
    ['दोस्त ने 300 वापस किए', [{ amount: 300, type: 'income', description: 'दोस्त' }]],
    ['₹250 का पेट्रोल डलवाया', [{ amount: 250, category: 'transport', description: 'पेट्रोल' }]],
    ['मम्मी से 500 मिले किताबों के लिए', [{ amount: 500, type: 'income', category: 'pocketmoney', english: 'Books from mom' }]],
    ['दोस्तों के साथ होटल में डिनर 2000', [{ amount: 2000, category: 'food', english: 'Dinner in hotel with friends' }]],
    ['बच्चों के लिए किताबें 600', [{ amount: 600, category: 'shopping', english: 'Books for kids' }]],
    // Words the list doesn't know are written in English letters
    ['नरेश भैया को 500 दिए', [{ amount: 500, type: 'expense', english: 'Naresh bhaiya' }]],
  ],

  // Hindi in Latin letters (typed, or what en-IN hears when you speak Hindi)
  hinglish: [
    ['kal chai pe 30 rupaye diye', [{ amount: 30, type: 'expense', category: 'food', date: '2026-11-14', description: 'Chai', english: 'Tea' }]],
    ['papa ne 2000 bheje', [{ amount: 2000, type: 'income' }]],
    ['salary 50000 mili', [{ amount: 50000, type: 'income', category: 'salary' }]],
    ['dhai hazaar ka petrol', [{ amount: 2500, category: 'transport' }]],
    ['aaj subah 9 baje auto 80', [{ amount: 80, category: 'transport', time: '09:00' }]],
    ['bijli ka bill 1200 bhara', [{ amount: 1200, type: 'expense', category: 'bills' }]],
    ['chai 20 aur samosa 15', [{ amount: 20 }, { amount: 15 }]],
    ['parso kirana 850', [{ amount: 850, category: 'groceries', date: '2026-11-13' }]],
    ['do sau rupaye ki dawai', [{ amount: 200, category: 'bills' }]],
    ['mummy se 1000 mile', [{ amount: 1000, type: 'income', category: 'pocketmoney', english: 'Mom' }]],
    ['doston ke saath dinner 1500', [{ amount: 1500, category: 'food', english: 'Dinner with friends' }]],
    ['maine kal 500 ka petrol dalwaya', [{ amount: 500, type: 'expense', category: 'transport', date: '2026-11-14', description: 'Petrol' }]],
  ],

  'mr-IN': [
    ['काल जेवणासाठी 250 रुपये खर्च केले', [{ amount: 250, type: 'expense', category: 'food', date: '2026-11-14', english: 'Meal' }]],
    ['मित्रांसोबत जेवण 600', [{ amount: 600, category: 'food', english: 'Meal with friends' }]],
    ['चहा 20 आणि वडापाव 15', [{ amount: 20, category: 'food', english: 'Tea' }, { amount: 15, category: 'food', english: 'Vada pav' }]],
    ['रिक्षा 60', [{ amount: 60, category: 'transport' }]],
    ['पगार 40,000 मिळाला', [{ amount: 40000, type: 'income', category: 'salary' }]],
    ['लाईट बिल 900 भरले', [{ amount: 900, type: 'expense', category: 'bills' }]],
    ['अडीचशे रुपयांची भाजी', [{ amount: 250, category: 'groceries' }]],
    ['साडेतीनशे रुपयांचे पेट्रोल', [{ amount: 350, category: 'transport' }]],
    ['दोन हजार पाचशे घरभाडे', [{ amount: 2500, category: 'bills' }]],
    ['आईने मला 500 दिले', [{ amount: 500, type: 'income', category: 'pocketmoney' }]],
    ['परवा संध्याकाळी 7 वाजता सिनेमा 300', [{ amount: 300, category: 'entertainment', date: '2026-11-13', time: '19:00' }]],
    ['गेल्या सोमवारी औषधे 450', [{ amount: 450, category: 'bills', date: '2026-11-09' }]],
    ['पंचवीस रुपये चहा', [{ amount: 25, category: 'food' }]],
  ],

  'gu-IN': [
    ['ગઈકાલે જમવાના 250 રૂપિયા ખર્ચ્યા', [{ amount: 250, type: 'expense', category: 'food', date: '2026-11-14', english: 'Meal' }]],
    ['મિત્રો સાથે ફિલ્મ 400', [{ amount: 400, category: 'entertainment', english: 'Movie with friends' }]],
    ['ચા 20 અને નાસ્તો 50', [{ amount: 20, category: 'food' }, { amount: 50, category: 'food' }]],
    ['રિક્ષા 60', [{ amount: 60, category: 'transport' }]],
    ['પગાર 40,000 મળ્યો', [{ amount: 40000, type: 'income', category: 'salary' }]],
    ['પાંચસો રૂપિયાનું પેટ્રોલ', [{ amount: 500, category: 'transport' }]],
    ['અઢી હજાર ભાડું', [{ amount: 2500, category: 'bills' }]],
    ['૩૫૦ દવા', [{ amount: 350, category: 'bills' }]],
    ['શુક્રવારે સાંજે ફિલ્મ 400', [{ amount: 400, category: 'entertainment', date: '2026-11-13', time: '19:00' }]],
  ],

  'bn-IN': [
    ['কাল দুপুরে খাবারে 250 টাকা খরচ করেছি', [{ amount: 250, type: 'expense', category: 'food', date: '2026-11-14', time: '14:00' }]],
    ['চা 20 আর সিঙ্গারা 30', [{ amount: 20, category: 'food' }, { amount: 30, category: 'food' }]],
    ['অটো ভাড়া 40', [{ amount: 40, category: 'transport', english: 'Auto fare' }]],
    ['বন্ধুদের সাথে খাবার 800', [{ amount: 800, category: 'food', english: 'Food with friends' }]],
    ['মাইনে 30,000 পেয়েছি', [{ amount: 30000, type: 'income', category: 'salary' }]],
    ['বাবা ৫০০ টাকা দিয়েছে', [{ amount: 500, type: 'income' }]],
    ['পাঁচশো টাকার বাজার', [{ amount: 500, category: 'groceries' }]],
    ['আড়াই হাজার টাকা বাড়ি ভাড়া', [{ amount: 2500, category: 'bills' }]],
    ['গত রবিবার সিনেমা 300', [{ amount: 300, category: 'entertainment', date: '2026-11-08' }]],
  ],

  'ta-IN': [
    ['நேற்று சாப்பாட்டுக்கு 250 ரூபாய் செலவு', [{ amount: 250, type: 'expense', category: 'food', date: '2026-11-14', english: 'Meal' }]],
    ['நண்பர்களுடன் சினிமா 400', [{ amount: 400, category: 'entertainment', english: 'Movie with friends' }]],
    ['டீ 20 மற்றும் வடை 15', [{ amount: 20, category: 'food' }, { amount: 15, category: 'food' }]],
    ['ஆட்டோ 80', [{ amount: 80, category: 'transport' }]],
    ['சம்பளம் 40,000 வந்தது', [{ amount: 40000, type: 'income', category: 'salary' }]],
    ['அப்பா 1000 ரூபாய் கொடுத்தார்', [{ amount: 1000, type: 'income' }]],
    ['ஐநூறு ரூபாய் பெட்ரோல்', [{ amount: 500, category: 'transport' }]],
    ['5 ஆயிரம் வாடகை', [{ amount: 5000, category: 'bills' }]],
    ['மாலை 7 மணிக்கு சினிமா 200', [{ amount: 200, category: 'entertainment', time: '19:00' }]],
  ],

  'te-IN': [
    ['నిన్న భోజనానికి 250 రూపాయలు ఖర్చు', [{ amount: 250, type: 'expense', category: 'food', date: '2026-11-14', english: 'Meal' }]],
    ['స్నేహితులతో సినిమా 300', [{ amount: 300, category: 'entertainment', english: 'Movie with friends' }]],
    ['టీ 20 మరియు సమోసా 30', [{ amount: 20, category: 'food' }, { amount: 30, category: 'food' }]],
    ['ఆటో 80', [{ amount: 80, category: 'transport' }]],
    ['జీతం 40,000 వచ్చింది', [{ amount: 40000, type: 'income', category: 'salary' }]],
    ['రెండు వేలు అద్దె', [{ amount: 2000, category: 'bills' }]],
    ['అమ్మ 500 ఇచ్చింది', [{ amount: 500, type: 'income' }]],
    ['సాయంత్రం 6 గంటలకు సినిమా 150', [{ amount: 150, category: 'entertainment', time: '18:00' }]],
    ['ఇరవై ఐదు రూపాయలు టీ', [{ amount: 25, category: 'food' }]],
    // "the bill came to 1200" is still an expense
    ['కరెంట్ బిల్లు 1200 వచ్చింది', [{ amount: 1200, type: 'expense', category: 'bills' }]],
  ],

  'kn-IN': [
    ['ನಿನ್ನೆ ಊಟಕ್ಕೆ 250 ರೂಪಾಯಿ ಖರ್ಚು', [{ amount: 250, type: 'expense', category: 'food', date: '2026-11-14', english: 'Meal' }]],
    ['ಸ್ನೇಹಿತರ ಜೊತೆ ಸಿನಿಮಾ 300', [{ amount: 300, category: 'entertainment', english: 'Movie with friends' }]],
    ['ಟೀ 20 ಮತ್ತು ದೋಸೆ 60', [{ amount: 20, category: 'food' }, { amount: 60, category: 'food' }]],
    ['ಆಟೋ 80', [{ amount: 80, category: 'transport' }]],
    ['ಸಂಬಳ 40,000 ಬಂತು', [{ amount: 40000, type: 'income', category: 'salary' }]],
    ['ಐನೂರು ರೂಪಾಯಿ ಪೆಟ್ರೋಲ್', [{ amount: 500, category: 'transport' }]],
    ['ಎರಡು ಸಾವಿರ ಬಾಡಿಗೆ', [{ amount: 2000, category: 'bills' }]],
    ['ಅಪ್ಪ 1000 ಕೊಟ್ಟರು', [{ amount: 1000, type: 'income' }]],
  ],

  'ml-IN': [
    ['ഇന്നലെ ഭക്ഷണത്തിന് 250 രൂപ ചെലവായി', [{ amount: 250, type: 'expense', category: 'food', date: '2026-11-14', english: 'Food' }]],
    ['കൂട്ടുകാരുടെ കൂടെ സിനിമ 300', [{ amount: 300, category: 'entertainment', english: 'Movie with friends' }]],
    ['ചായ 15 പിന്നെ ദോശ 40', [{ amount: 15, category: 'food' }, { amount: 40, category: 'food' }]],
    ['ഓട്ടോ 60', [{ amount: 60, category: 'transport' }]],
    ['ശമ്പളം 40,000 കിട്ടി', [{ amount: 40000, type: 'income', category: 'salary' }]],
    ['അഞ്ഞൂറ് രൂപ പെട്രോൾ', [{ amount: 500, category: 'transport' }]],
    ['രണ്ടായിരം രൂപ വാടക', [{ amount: 2000, category: 'bills' }]],
    ['അമ്മ 500 രൂപ തന്നു', [{ amount: 500, type: 'income' }]],
  ],
};

const pad = (n) => String(n).padStart(2, '0');
const localDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const localTime = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function check(entry, want) {
  const problems = [];
  const got = {
    amount: entry.amount,
    type: entry.type,
    category: entry.category,
    date: localDate(entry.date),
    time: entry.hasTime ? localTime(entry.date) : null,
    description: entry.description,
    english: toEnglish(entry.description, entry),
  };
  for (const [key, value] of Object.entries(want)) {
    if (got[key] !== value) problems.push(`${key}: got ${JSON.stringify(got[key])}, want ${JSON.stringify(value)}`);
  }
  return problems;
}

const server = await createServer({
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
});
let failed = 0;
let passed = 0;
try {
  const { parseTransactions } = await server.ssrLoadModule('/src/voice/parseTransaction.js');
  ({ toEnglish } = await server.ssrLoadModule('/src/voice/languages/toEnglish.js'));
  for (const [lang, cases] of Object.entries(CASES)) {
    const results = [];
    for (const [sentence, expected] of cases) {
      const entries = parseTransactions(sentence, NOW, { lang: lang === 'hinglish' ? 'en-IN' : lang });
      const problems =
        entries.length === expected.length
          ? expected.flatMap((want, i) => check(entries[i], want).map((p) => (expected.length > 1 ? `#${i + 1} ${p}` : p)))
          : [`got ${entries.length} entries, want ${expected.length}: ${JSON.stringify(entries.map((e) => [e.amount, e.description]))}`];
      if (problems.length) failed++;
      else passed++;
      results.push({ sentence, problems });
    }
    const bad = results.filter((r) => r.problems.length);
    console.log(`${bad.length ? '✗' : '✓'} ${lang}: ${results.length - bad.length}/${results.length}`);
    for (const r of bad) console.log(`    "${r.sentence}"\n      ${r.problems.join('\n      ')}`);
  }
} finally {
  await server.close();
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
