// ---------------------------------------------------------------------------
// Categorization
// ---------------------------------------------------------------------------
// Clean, normalized category set. Tweak this list (and the rules below) freely.
export const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Rent/Housing',
  'Utilities',
  'Shopping',
  'Entertainment',
  'Gambling',
  'Health',
  'Transfers',
  'Income',
  'Other',
];

// Categories that are NOT real spending: money moving between accounts, card
// payments, and incoming money. These are excluded from spending totals.
export const NON_SPEND_CATEGORIES = new Set(['Transfers', 'Income']);

// ---------------------------------------------------------------------------
// Default rules engine
// ---------------------------------------------------------------------------
// Each rule maps a description match -> normalized category. Rules are checked
// in order; the FIRST match wins. `test` is a RegExp run against the lowercased
// description. To add your own merchant rules at runtime, the app appends
// user rules to the FRONT of this list so they take priority.
//
// Edit these defaults to suit your own spending.
export const DEFAULT_RULES = [
  // Transfers / card payments first so they always win and stay out of spending.
  { id: 'd-transfer', label: 'transfers & card payments', test: /payment thank you|online payment|web pmt|autopay|directpay|transfer|xfer|zelle|venmo cashout|ach pmt|bill pay/i, category: 'Transfers' },
  { id: 'd-income', label: 'income / deposits', test: /payroll|direct dep|salary|dividend|interest paid|refund|reimburse|deposit/i, category: 'Income' },

  // Food delivery first — must beat the broader rideshare rule so "UBER *EATS"
  // doesn't get caught as Transport.
  { id: 'd-food-delivery', label: 'food delivery', test: /uber\s*\*?\s*eats|ubereats|doordash|grubhub|postmates|seamless|caviar|instacart/i, category: 'Food & Dining' },
  { id: 'd-gambling', label: 'gambling & prediction markets', test: /kalshi|polymarket|draftkings|fanduel|bovada|prizepicks|sportsbook|casino|betmgm|stake\.com/i, category: 'Gambling' },
  { id: 'd-golf', label: 'golf & recreation', test: /golf|driving range|tee time|pro shop/i, category: 'Entertainment' },

  { id: 'd-transport', label: 'rideshare, fuel & parking', test: /uber|lyft|lime|bird|spin|7[- ]?eleven|pilot|wawa|sheetz|circle k|speedway|valero|sunoco|mobil|exxon|chevron|texaco|conoco|citgo|arco|qt |quiktrip|race ?trac|shell|bp |marathon|gulf oil|parking|metro|transit|toll|amtrak|delta air|united air|american air|southwest|pgparks/i, category: 'Transport' },
  { id: 'd-groceries', label: 'grocery stores', test: /trader joe|safeway|harris teeter|whole foods|kroger|aldi|publix|wegmans|costco|sam's? club|sams club|giant food|food lion|stop & shop|sprouts|h[- ]?e[- ]?b/i, category: 'Groceries' },
  { id: 'd-dining', label: 'restaurants & coffee', test: /starbucks|mcdonald|chipotle|panda express|cava|sweetgreen|panera|chick[- ]?fil[- ]?a|five guys|shake shack|popeye|wendy|subway|kfc|taco bell|sonic|dairy queen|dunkin|ihop|denny|applebee|olive garden|cheesecake factory|outback|texas roadhouse|red lobster|buffalo wild|cracker barrel|tst\*|sq \*\w*food|restaurant|cafe|coffee|pizza|sushi|taco|grill|kitchen|diner|bar &|brewery|eatery|deli|bistro|pub|tavern|ramen|thai|cuisine|bagel|donut|food &/i, category: 'Food & Dining' },
  { id: 'd-utilities', label: 'utilities & telecom', test: /comcast|xfinity|verizon|at&t|t-mobile|sprint|electric|water util|gas company|pg&e|con ed|internet|sewer|utility|spectrum|cox communications/i, category: 'Utilities' },
  { id: 'd-housing', label: 'rent & housing', test: /rent|landlord|apartment|property mgmt|mortgage|hoa /i, category: 'Rent/Housing' },
  { id: 'd-health', label: 'health & pharmacy', test: /cvs|walgreens|rite aid|pharmacy|doctor|dental|clinic|hospital|fitness|gym|planet fit|urgent care|med ctr|medical|optometrist|vision center|orthodonti/i, category: 'Health' },
  { id: 'd-travel', label: 'travel & lodging', test: /airbnb|vrbo|marriott|hilton|hyatt|sheraton|holiday inn|hampton inn|comfort inn|expedia|booking\.com|kayak|priceline|hotwire|hotel|motel|delta|united\b|american airlines|southwest|jetblue|frontier|spirit|avis|hertz|enterprise|budget rent|alamo|national car/i, category: 'Entertainment' },
  { id: 'd-entertainment', label: 'entertainment & subscriptions', test: /netflix|spotify|hulu|disney\+|hbo|max |steam|playstation|xbox|cinema|amc |movie|concert|ticketmaster|patreon|nytimes|wsj|washington post|claude\.ai|anthropic|openai|chatgpt|github|gitlab|dropbox|icloud|onedrive|notion|twitch|paramount|peacock|apple tv|amazon prime|kindle|audible|substack/i, category: 'Entertainment' },
  { id: 'd-shopping', label: 'retail & online shopping', test: /amazon|target|walmart|best buy|ebay|etsy|nike|adidas|apple store|h&m|zara|ikea|home depot|lowe's|dollar general|dollar tree|family dollar|five below|marshalls|tj ?maxx|ross |kohl|macy|nordstrom|jcpenney|sephora|ulta|bed bath|michaels|hobby lobby|petco|petsmart|cvs\/pharmacy|tobacco|smoke shop|vape|abc store|wine|spirits|liquor/i, category: 'Shopping' },
];

// Map common issuer-provided categories into our normalized set. Used as a
// fallback when no description rule matches.
const ISSUER_CATEGORY_MAP = {
  // Discover categories
  'restaurants': 'Food & Dining',
  'supermarkets': 'Groceries',
  'gasoline': 'Transport',
  'travel': 'Transport',
  'travel/entertainment': 'Entertainment',
  'merchandise': 'Shopping',
  'department stores': 'Shopping',
  'services': 'Other',
  'medical services': 'Health',
  'payments and credits': 'Transfers',
  'awards and rebate credits': 'Income',
  // USAA / generic categories
  'groceries': 'Groceries',
  'food & dining': 'Food & Dining',
  'restaurants & dining': 'Food & Dining',
  'gas & fuel': 'Transport',
  'auto & transport': 'Transport',
  'transfer': 'Transfers',
  'credit card payment': 'Transfers',
  'income': 'Income',
  'paycheck': 'Income',
  'rent': 'Rent/Housing',
  'mortgage & rent': 'Rent/Housing',
  'utilities': 'Utilities',
  'bills & utilities': 'Utilities',
  'shopping': 'Shopping',
  'entertainment': 'Entertainment',
  'health & fitness': 'Health',
};

function normalizeIssuerCategory(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  return ISSUER_CATEGORY_MAP[key] || null;
}

// Resolve a transaction's category:
//   1. user + default description rules (first match wins)
//   2. issuer-provided category mapped into our set
//   3. fall back to 'Other'
export function categorize(description, rawCategory, rules = DEFAULT_RULES) {
  const desc = String(description || '');
  for (const rule of rules) {
    const re = rule.test instanceof RegExp ? rule.test : new RegExp(rule.test, 'i');
    if (re.test(desc)) return rule.category;
  }
  const fromIssuer = normalizeIssuerCategory(rawCategory);
  if (fromIssuer) return fromIssuer;
  return 'Other';
}

// Stable-ish color per category for charts.
export const CATEGORY_COLORS = {
  'Food & Dining': '#f97316',
  Groceries: '#22c55e',
  Transport: '#3b82f6',
  'Rent/Housing': '#a855f7',
  Utilities: '#eab308',
  Shopping: '#ec4899',
  Entertainment: '#14b8a6',
  Gambling: '#d946ef',
  Health: '#ef4444',
  Transfers: '#64748b',
  Income: '#10b981',
  Other: '#94a3b8',
};
