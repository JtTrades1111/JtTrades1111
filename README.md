# Summer Budget Dashboard

A local, single-page React app that tracks your summer spending against an
**end-of-summer net position target**. No backend, no database, no external API
calls — all data lives in the browser, with manual JSON export/import as your
save/restore mechanism.

You import transactions from CSV files you download from **Discover** (credit
card) and **USAA** (checking/savings).

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

Stack: React + Vite, Tailwind CSS, Recharts, PapaParse.

### Try it with sample data

The `samples/` folder has fictional Discover/USAA CSVs and a ready-made export.
Fastest path: click **Import data** in the top bar and pick
`samples/sample-data.json`. Or click **Import CSV** and load
`samples/discover.csv` and `samples/usaa.csv` to exercise the importer. See
`samples/README.md` for details.

---

## The core idea: NET POSITION, not raw balance

The goal is a **target net position** by a **target date**:

```
net position = cash in USAA accounts
             + manually-entered investments
             − Discover card balance owed
```

A checking balance that grows because your card balance grew is **not**
progress. Every goal/pacing number in the app is computed from net position.

### How the net-position math works (the honest version)

CSV exports are **lists of flows** (transactions), not absolute balance
statements. So the app computes net position as a running total of each
transaction's *effect on net position* plus your manual investment values:

```
currentNet = Σ transaction.signedForNet + Σ investment.value
```

`signedForNet` is the dollar effect each transaction has on your net position:

| Account type | Amount        | Effect on net | signedForNet |
|--------------|---------------|---------------|--------------|
| Asset (USAA) | +deposit      | net goes up   | `+amount`    |
| Asset (USAA) | −spend        | net goes down | `+amount` (already negative) |
| Liability (Discover) | +purchase | net goes down | `−amount` |
| Liability (Discover) | −payment  | net goes up   | `−amount` (already negative) |

This means a **card payment** moves money from your asset account (net −X) and
pays down the card (net +X) for a **net change of zero** — exactly right, since
paying your card isn't spending or progress.

The implicit baseline is zero (your net worth *before* any imported
transaction). The goal line's left endpoint, **starting net position**, is
auto-derived as your running net as of the tracking start date — but you can
override it in **Settings** to anchor to your real starting net worth.

The goal engine (`src/lib/goal.js`) computes:

- Required savings pace (per week / per month) to hit the target from today
- Actual pace so far (net change ÷ days elapsed)
- On-track / behind / ahead status with the dollar gap vs. the ideal pace line
- **Safe to spend this week** = how far you sit above where the pace line will
  be one week from now (slack you can spend and still be on pace next week)
- Projected end net position (linear extrapolation of your current pace)

The pacing math is small and heavily commented — tweak it in `src/lib/goal.js`.

### Long-term investment goal (compounding)

Alongside the short-term summer goal, there's a separate **Investment Goal**
section for a multi-year wealth target (e.g. $200,000). Unlike the summer goal
(a straight line), this one models **compounding** — money already invested and
future monthly contributions both earn returns. You set a target amount, a
target date, an expected annual return (default 7%), and a planned monthly
contribution; the app shows:

- Your current net worth and how much of it is invested
- Projected value at the target date (with growth)
- Whether you're on track, and the **monthly contribution needed** to hit the target
- A projection chart: balance-with-growth vs. contributions-only vs. target

The future-value math lives in `src/lib/investment.js` (standard
future-value-of-an-annuity formula, commented).

---

## Exporting CSVs from your banks

### Discover (credit card)
1. Log in at discover.com → **Activity & Statements**.
2. Choose a date range and click **Download** → **Spreadsheet (.csv)**.
3. The file has columns: `Trans. Date, Post Date, Description, Amount, Category`.
   - Positive `Amount` = purchases (money you owe); negative = payments/credits.

**Or just drop in the monthly statement PDF.** Discover statement PDFs are
parsed directly — the importer reconstructs each transaction (date, merchant,
Discover category, amount), infers the year from the statement period, and
treats it exactly like the CSV. CSV is still the more robust path if Discover
ever changes their statement layout. (PDF parsing lives in `src/lib/pdf.js` and
only supports Discover statements; other banks should use their CSV export.)

### USAA (checking / savings)
1. Log in at usaa.com → select the account → **Export Transactions**.
2. Choose **CSV** and a date range, download.
3. Modern exports have: `Date, Description, Original Description, Category, Amount, Status`.
   - Negative `Amount` = money out; positive = money in.

> USAA has shipped several CSV formats over the years. If your file doesn't
> match, the app shows a **column-mapping screen** (below).

### Where to drop them
Click **Import statement** in the top bar (or drag the file onto the drop zone).
Discover statement PDFs and Discover/USAA CSV files are detected automatically. Re-importing the same file
is safe — duplicates (same account + date + description + amount) are skipped
and the count is reported.

### Unknown formats — column mapping
If headers don't match a known format, you get a mapping screen: assign each
required field (date, description, amount, optional category) to a column,
declare whether it's an **asset** or **liability** account, and pick the
**Amount sign convention**. The mapping is remembered, so future imports of the
same format are automatic.

---

## Categorization

Issuer categories are normalized into a clean set: *Food & Dining, Groceries,
Transport, Rent/Housing, Utilities, Shopping, Entertainment, Health, Transfers,
Income, Other.*

A **rules engine** (`src/lib/categories.js`) maps description text → category
via regex/substring rules, with sensible defaults shipped
(`/uber|lyft/ → Transport`, `/trader joe|safeway|harris teeter/ → Groceries`,
etc.). To customize, edit `DEFAULT_RULES` at the top of that file.

- Override any single transaction's category inline in the table (an ✎ marks
  manual overrides; they survive rule changes).
- Click **+ rule** on any row to add "always categorize merchant X as Y". New
  rules re-categorize existing non-overridden transactions immediately.
- **Transfers** and **card payments** are excluded from all spending totals —
  they're money moving, not expenses.

---

## Persistence (important)

This app does **not** use `localStorage` / `sessionStorage` (they break in some
embedded contexts). State lives in React (`useReducer`). To save your work:

- **Export data** → downloads the full state as a JSON file.
- **Import data** → reloads a previously exported JSON file.

That JSON file is your save game. Export before closing the tab.

---

## Project layout

```
src/
  lib/
    format.js      money/date formatting, week & month bucketing
    categories.js  normalized categories + rules engine (edit defaults here)
    csv.js         Discover/USAA detection, parsing, sign conventions
    goal.js        net-position pacing math (well commented)
  store/
    StoreContext.jsx  useReducer data store (no localStorage)
    selectors.js      derived data: net position, spending, goal stats, charts
  components/         TopBar, KpiCards, GoalProgress, SpendingSection,
                      AccountsPanel, TransactionsTable, ImportModal,
                      SettingsPanel, Toast, EmptyState, Modal
```
