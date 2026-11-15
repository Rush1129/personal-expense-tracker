// Hindi typed or recognised in English letters ("kal chai pe 30 diye",
// "papa ne 2000 bheje"). The en-IN recogniser often writes spoken Hindi this way.
// Only used when the text has one of the `markers`, so plain English sentences
// are parsed exactly as before.
export default {
  id: 'hinglish',
  script: 'Latin',

  markers: [
    'kal', 'kaal', 'aaj', 'parso', 'parson', 'rupaye', 'rupiye', 'rupaiye', 'rupye', 'kharch', 'kharcha', 'kharche',
    'kharach', 'kiye', 'kiya', 'diye', 'diya', 'mila', 'mili', 'maine', 'humne', 'hamne', 'baje', 'hazaar',
    'hazar', 'hajar', 'subah', 'shaam', 'dopahar', 'raat', 'liye', 'mein', 'wala', 'wali', 'wale', 'paise', 'ke',
    'ka', 'ki', 'ko', 'se', 'pe', 'aur', 'bheje', 'bheja', 'mujhe', 'pichhle', 'pichle', 'tarikh', 'dile',
  ],

  // Short words like "do", "teen", "bees", "saath" are also English or Hindi words,
  // so every Hindi number word here needs sau/hazaar/lakh or rupaye after it
  numbers: {
    ek: 1, do: 2, teen: 3, tin: 3, char: 4, chaar: 4, paanch: 5, panch: 5, paach: 5, chhe: 6, chhah: 6, che: 6,
    saat: 7, sat: 7, aath: 8, nau: 9, das: 10, dus: 10, gyarah: 11, gyara: 11, barah: 12, bara: 12, pandrah: 15,
    bees: 20, bis: 20, pachees: 25, pachchis: 25, pachis: 25, tees: 30, tis: 30, chalis: 40, chalees: 40,
    pachaas: 50, pachas: 50, saath: 60, sath: 60, sattar: 70, assi: 80, nabbe: 90,
  },
  restricted: [
    'ek', 'do', 'teen', 'tin', 'char', 'chaar', 'paanch', 'panch', 'paach', 'chhe', 'chhah', 'che', 'saat', 'sat',
    'aath', 'nau', 'das', 'dus', 'gyarah', 'gyara', 'barah', 'bara', 'pandrah', 'bees', 'bis', 'pachees',
    'pachchis', 'pachis', 'tees', 'tis', 'chalis', 'chalees', 'pachaas', 'pachas', 'saath', 'sath', 'sattar',
    'assi', 'nabbe',
  ],
  big: { hajaar: 1e3, hazzar: 1e3, karod: 1e7, karor: 1e7 },
  fractions: { dedh: 1.5, derh: 1.5, dhai: 2.5, dhaai: 2.5, adhai: 2.5 },
  modifiers: { saade: 0.5, sade: 0.5, saadhe: 0.5, sadhe: 0.5, sava: 0.25, savaa: 0.25, sawa: 0.25, paune: -0.25, pone: -0.25 },

  currency: ['rupiye', 'rupaiye', 'rupaiya', 'rupiya', 'rupye', 'rupaye', 'rupay'],

  dates: {
    dayBefore: ['parso', 'parson', 'parsoon'],
    lastNight: ['kal raat', 'kal night', 'kaal ratri'],
    yesterday: ['kal', 'kaal'],
    today: ['aaj'],
    lastWeek: ['pichhle hafte', 'pichle hafte', 'pichhle week', 'pichle week'],
    daysAgo: ['(\\d+|ek) din pehle', '(\\d+|ek) din pahle'],
    weeksAgo: ['(\\d+|ek) hafte pehle', '(\\d+|ek) hafte pahle'],
    last: ['pichhle', 'pichle', 'pichhli', 'pichli'],
    weekdays: {
      sunday: ['ravivar', 'raviwar', 'itvaar', 'itwar', 'itvar'], monday: ['somvar', 'somwar'],
      tuesday: ['mangalvar', 'mangalwar'], wednesday: ['budhvar', 'budhwar'],
      thursday: ['guruvar', 'guruwar', 'veervar'], friday: ['shukravar', 'shukrawar'],
      saturday: ['shanivar', 'shaniwar'],
    },
    monthDay: ['(\\d{1,2}) tarikh~', '(\\d{1,2}) tareekh~', '(\\d{1,2}) taarikh~'],
    clockMinutes: ['(\\d{1,2}) bajkar (\\d{1,2}) minute~'],
    clock: ['(\\d{1,2}(?:\\.\\d+)?) baje'],
    periods: {
      morning: ['subah', 'subha', 'savere'],
      afternoon: ['dopahar', 'dopehar', 'dupahar', 'dophar'],
      evening: ['shaam', 'sham'],
      night: ['raat'],
    },
  },

  and: ['phir', 'fir', 'tatha'],

  income: [
    'mila', 'mili', 'milen', 'mil gaye', 'mil gaya', 'mil gayi', 'kamaye', 'kamaya', 'kamai', 'credit hue',
    'credit hua', 'credit ho gaye', 'jama hue', 'jama hua', 'tankhwah', 'tankha', 'vetan', 'pagar', 'becha',
    'beche', 'bechi', 'jeeta', 'jeete', 'inaam', 'milale', 'milala', 'milali', 'mile',
    '(?:rs|paise|payment|salary) (?:aaye|aaya|aayi|aai|aa gaye|aa gaya|aa gayi)',
  ],
  expense: [
    'kharch', 'kharcha', 'kharche', 'kharach', 'diye', 'diya', 'de diye', 'de diya', 'bhare', 'bhara', 'bhari',
    'bhar diye', 'chukaye', 'chukaya', 'kharida', 'kharidi', 'kharide', 'kharid', 'liya', 'mangaya', 'mangwaya',
    'lage', 'lag gaye', 'kat gaye', 'udaye', 'dalwaya', 'dalwaye', 'bharwaya', 'dile', 'bharle', 'ghetle',
  ],
  // "papa ne 2000 bheje", "mujhe 500 diye"
  incomeStrong: [
    '(?<!(?:main|mai|hum|ham) )ne (?:\\S+ ){0,6}?(?:diye|diya|di|bheje|bheja|bheji|transfer kiye|transfer kiya|wapas kiye|vapas kiye|lautaye)',
    '(?:mujhe|mujhko|humein|hume|hamein) (?:\\S+ ){0,6}?(?:diye|diya|di|bheje|bheja|bheji)',
    'mala (?:\\S+ ){0,6}?(?:dile|dila|dili)',
  ],

  filler: [
    'maine', 'mene', 'humne', 'hamne', 'mujhe', 'kharch', 'kharcha', 'kharche', 'kharach', 'kiye', 'kiya', 'diye',
    'diya', 'de', 'bhare', 'bhara', 'bhari', 'chukaye', 'chukaya', 'kharida', 'kharidi', 'kharide', 'liya',
    'mangaya', 'mangwaya', 'mile', 'mila', 'mili', 'aaye', 'aaya', 'aayi', 'kamaye', 'kamaya', 'bheje', 'bheja',
    'hue', 'hua', 'hui', 'gaye', 'gaya', 'gayi', 'lage', 'hai', 'hain', 'tha', 'paise', 'paisa', 'kul', 'dile',
    'bharle', 'ghetle', 'dalwaya', 'dalwaye', 'bharwaya', 'wapas', 'vapas',
  ],
  edge: [
    'pe', 'par', 'ka', 'ki', 'ke', 'ko', 'se', 'mein', 'me', 'liye', 'ke liye', 'ki liye', 'wala', 'wale', 'wali',
    'aur', 'bhi', 'toh', 'ek', 'ne',
  ],

  // ---- English descriptions (toEnglish.js), only for sentences that look Hinglish ----
  posts: {
    with: ['ke saath', 'ke sath', 'ke sang', 'saath', 'sath'],
    for: ['ke liye', 'ki liye', 'liye'],
    from: ['se'],
    in: ['mein', 'me'],
    at: ['pe', 'par'],
    to: ['ko'],
    of: ['ka', 'ki', 'ke'],
  },
  glossary: {
    aur: 'and', khana: 'food', khane: 'food', nashta: 'breakfast', naashta: 'breakfast', bhojan: 'meal', chai: 'tea',
    samose: 'samosas', pakode: 'pakoras', pakore: 'pakoras', mithai: 'sweets', namkeen: 'snacks', paani: 'water',
    pani: 'water', doodh: 'milk', dudh: 'milk', dahi: 'curd', chawal: 'rice', aata: 'flour', cheeni: 'sugar',
    chini: 'sugar', namak: 'salt', anda: 'egg', ande: 'eggs', tel: 'oil', sabzi: 'vegetables', sabji: 'vegetables',
    sabziyan: 'vegetables', kirana: 'groceries', rashan: 'ration', makkhan: 'butter', kilo: 'kg',
    kiraya: 'rent', kiraaya: 'rent', bhada: 'fare', bhaada: 'fare', 'auto ka kiraya': 'auto fare', bijli: 'electricity',
    'bijli ka bill': 'electricity bill', 'bijli bill': 'electricity bill', dawai: 'medicine', dawa: 'medicine',
    davai: 'medicine', dawaiyan: 'medicines', kist: 'instalment', kisht: 'instalment', gaadi: 'car', gadi: 'car',
    safar: 'trip', kapde: 'clothes', kapda: 'cloth', joote: 'shoes', juta: 'shoes', joota: 'shoes', ghadi: 'watch',
    kitab: 'book', kitaben: 'books', kitabon: 'books', tohfa: 'gift', ghumna: 'outing', ghoomna: 'outing',
    ghumne: 'outing', chhutti: 'holiday', tankhwah: 'salary', tankha: 'salary', vetan: 'salary', pagar: 'salary',
    byaj: 'interest', byaaj: 'interest', munafa: 'profit', inaam: 'prize', 'jeb kharch': 'pocket money',
    dost: 'friend', doston: 'friends', dosto: 'friends', yaar: 'friend', mummy: 'mom', mumma: 'mom', maa: 'mom',
    papa: 'dad', bhai: 'brother', behen: 'sister', didi: 'sister', bachche: 'kids', bachchon: 'kids', ghar: 'home',
    dukaan: 'shop', dukan: 'shop', bazaar: 'market', bazar: 'market', shaadi: 'wedding', shadi: 'wedding',
    mandir: 'temple',
  },

  // Latin-script category words; merged with the English keyword list
  categories: {
    food: [
      'khana', 'khane', 'nashta', 'naashta', 'bhojan', 'samose', 'pakode', 'pakore', 'pakora', 'jalebi',
      'golgappe', 'chaat', 'kachori', 'pav bhaji', 'bhel', 'lassi', 'chai pani',
    ],
    transport: ['bhada', 'bhaada', 'auto ka kiraya', 'gaadi', 'gadi'],
    groceries: ['doodh', 'dudh', 'dahi', 'chawal', 'aata', 'cheeni', 'chini', 'namak', 'anda', 'ande', 'rashan', 'bhaji', 'bhaaji'],
    bills: ['kiraya', 'kiraaya', 'bijli', 'bijli bill', 'paani bill', 'dawai', 'dawa', 'davai', 'dawaiyan', 'kist', 'kisht'],
    shopping: ['kapde', 'kapda', 'joote', 'juta', 'joota', 'ghadi', 'kitab', 'kitaben', 'tohfa'],
    entertainment: ['ghumna', 'ghoomna', 'ghumne', 'ghoomne'],
    salary: ['tankhwah', 'tankha', 'vetan', 'pagar'],
    pocketmoney: [
      'jeb kharch', 'jeb kharcha', 'mummy se', 'mumma se', 'papa se', 'mom se', 'dad se', 'mummy ne', 'papa ne',
      'ghar se',
    ],
    investment: ['byaj', 'byaaj', 'munafa'],
    gift: ['tohfa', 'inaam'],
  },
};
