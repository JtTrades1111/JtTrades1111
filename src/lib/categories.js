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

  { id: 'd-transport', label: 'rideshare & fuel', test: /uber|lyft|lime|shell|chevron|exxon|bp |marathon gas|parking|metro|transit|toll|amtrak|delta air|united air|american air|southwest/i, category: 'Transport' },
  { id: 'd-groceries', label: 'grocery stores', test: /trader joe|safeway|harris teeter|whole foods|kroger|aldi|publix|wegmans|costco|sam's club|giant food|food lion/i, category: 'Groceries' },
  { id: 'd-dining', label: 'restaurants & coffee', test: /starbucks|mcdonald|chipotle|doordash|grubhub|uber eats|restaurant|cafe|coffee|pizza|sushi|taco|grill|kitchen|diner|bar &|brewery/i, category: 'Food & Dining' },
  { id: 'd-utilities', label: 'utilities & telecom', test: /comcast|xfinity|verizon|at&t|t-mobile|electric|water util|gas company|pg&e|con ed|internet|sewer|utility/i, category: 'Utilities' },
  { id: 'd-housing', label: 'rent & housing', test: /rent|landlord|apartment|property mgmt|mortgage|hoa /i, category: 'Rent/Housing' },
  { id: 'd-health', label: 'health & pharmacy', test: /cvs|walgreens|pharmacy|doctor|dental|clinic|hospital|fitness|gym|planet fit/i, category: 'Health' },
  { id: 'd-entertainment', label: 'entertainment & subscriptions', test: /netflix|spotify|hulu|disney\+|hbo|max |steam|playstation|xbox|cinema|amc |movie|concert|ticketmaster|patreon/i, category: 'Entertainment' },
  { id: 'd-shopping', label: 'retail & online shopping', test: /amazon|target|walmart|best buy|ebay|etsy|nike|apple store|h&m|zara|ikea|home depot|lowe's/i, category: 'Shopping' },
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
