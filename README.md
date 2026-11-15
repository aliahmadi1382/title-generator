# Seat Cover Title Batch Generator

A small, fast, **100% local** web app that generates eBay-style titles for
automotive seat cover listings — **one title per eBay account**. Rule-based
only: **no AI, no external API, no backend**. History and account configuration
are stored in your browser's `localStorage`.

Built with **React + TypeScript + Vite**.

## Windows application

Download the **Title-Generator-Setup-…-x64.exe** installer from
[the latest GitHub release](https://github.com/aliahmadi1382/title-generator/releases/latest).
It runs on **Windows 10/11, 64-bit** without Node.js, Git, a browser server or a
GitHub account. Share the installer or the release link with the team.

The installed application contains this repository's complete interface and
generation engine, including the Variation Matrix, custom variations, SEO,
CSV account conversion, History and Account Settings. Generation works offline.
There is no separate copy of the title rules to maintain.

## CPIS rules

The title and SEO engine is synchronized from CPIS commit
`85cb5c3f6765a7cb901018bc5f992ea021238d64`. **Rules Summary** shows the source
revision in the app; saved sessions record the revision used to generate them.

- Regular titles use CPIS account defaults, shortening and variation rules.
  DSA writes **Beige** for Tan; other accounts keep their own colour rules.
- **Competitor research rules** are opt-in for U.S.AutoNation,
  U.S.AutoSeatFactory and Elite, with an explicit recorded trim field.
- Premium and DSA support **Regular**, **Multi (front collection)** and
  **Multi Bottoms**. Each Multi collection shares one parent title; editing
  one of its rows updates all rows in that collection.
- **Center Console** and **Foam Cushion** custom products are Premium-only.
  Foam requires its own seat row, physical side, seat part, A/C configuration
  and colour; it does not inherit seat-cover material or colour.
- Matrix SEO uses the original vehicle/product facts and the edited title,
  preserving full years even after title shortening. Manual SEO lets users
  review parsed facts. DSA UK wording and special-product SEO follow CPIS.
- Imported unstructured console/foam titles go to manual review; use the
  structured custom-product form to supply their required facts.

Existing saved results and account customizations remain intact. Reopen and
regenerate older sessions to apply the current rules. Account customizations
can intentionally differ from CPIS defaults; reset accounts only if desired.

### Maintaining the CPIS source snapshot

`src/cpis/` is generated from an explicit allowlist of pure CPIS modules and
selected declarations. Do not edit generated files. The manifest records the
source commit and hashes; lint verifies all generated files. The adapter in
`src/lib/matrix.ts` supplies the standalone interface and CPIS preparation order.

From a trusted local CPIS checkout with a current `origin/main`:

```powershell
npm run sync:cpis -- --source 'C:\Users\Asus\Desktop\Git-Hub\cpis'
npm run sync:cpis -- --source 'C:\Users\Asus\Desktop\Git-Hub\cpis' --check
npm run lint
npm test
npm run build
npm run test:desktop
```

An optional `--ref <commit>` pins a reviewed revision. The sync reads committed
Git objects, not uncommitted files. Review the source changes and test fixtures
before pushing this repository. A changed source declaration fails extraction
instead of silently dropping a rule. The desktop release uses the checked-in
snapshot; it does **not** automatically read private CPIS commits. No CPIS
credentials, database access or marketplace API is included. After a reviewed
sync is pushed to this repository, its normal release flow updates teammates.

**Updates:** every push to `main` starts the Windows desktop release workflow.
It runs lint, tests, the production build and an end-to-end smoke test of the
packaged application, then publishes the installer, blockmap and `latest.yml`
together in a GitHub release. Failed builds are not published. The desktop
checks at launch and every four hours, downloads the latest stable release,
and shows **Restart to update**. Save unsaved work to History or export first;
installation only begins after the user confirms the restart. Offline users
can continue working and choose **Check for updates** when connected.

Settings, saved history and theme are kept in `%APPDATA%\USF Title Generator`,
outside the installation folder, under a stable application origin. Updating
does not clear them. Each teammate has their own local data; browser history
from the Vercel website is separate and is not imported automatically. Saved
account customizations also remain; new default account settings are available
through the existing reset-to-defaults control (which replaces custom settings).

The installer is currently **not code-signed**. Windows may show an Unknown
publisher / SmartScreen notice; distribute the exact file from the release
linked above. Corporate Windows policies may require a signed installer.

### Building and maintaining the desktop app

```bash
npm ci
npm run lint
npm test
npm run build
npm run desktop:dist
npm run test:desktop
```

`desktop:dist` packages the existing production `dist/` into an NSIS installer
under `release/`. `npm run desktop` builds and opens a local preview (updating
is disabled for previews). To smoke-test the packaged executable, set
`TITLE_GENERATOR_EXE` to the absolute path of
`release/win-unpacked/Title Generator.exe` before running `test:desktop`.
Smoke tests use a separate temporary profile and synthetic data.

The release workflow derives a unique version from the base `package.json`
version plus its GitHub run number, without committing a version bump back to
the repository. Keep the base version stable for a release series and bump
its minor or major number when starting a new series. A rerun never overwrites
an already published release. A partial draft can be retried, and an older
commit cannot replace a release built from the current `main`. The workflow
uses GitHub's scoped `GITHUB_TOKEN`; no personal token is shipped in the app.

Desktop entry points live in `desktop/`; the only addition to the existing web
interface is an update bar, visible only in the desktop app. Renderer Node.js
access is disabled, context isolation and sandboxing are enabled, and a custom
local protocol serves only built UI assets with a restrictive CSP.

References: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security),
[electron-builder v26 updates](https://www.electron.build/v26/docs/features/auto-update/).

---

## What it does

- **Account-based titles** — every active account has its own title *style*
  (token order + preferred fitment word + product wording), so each account
  gets a distinct title while the product meaning stays identical.
- **Variation Matrix** (default tab) — enter a vehicle/product base once, pick
  one or more accounts, and generate one title per selected account for the
  **9 main seat-cover variations** (e.g. 9 × 8 accounts = 72 titles), plus an
  on-demand picker for ~60 additional variations. Custom variations use the
  exact same title/shortening rules as the main 9.
- **SEO** — generate **Meta Tags**, a **Meta Description**, and an
  account-specific **Mobile Description** from a Variation Matrix title and
  its original facts, or from a manual title with editable parsed facts.
  Edit inline, Copy All, or **Export SEO CSV**
  (`title, account_name, meta_tags, meta_description, mobile_description`).
  Mobile templates are editable per account in Account Settings.
- **CSV Account Title Generator** — upload a CSV of existing `item_id,title`
  rows, pick one account style, and rewrite every title in that account's style
  (cleaned + parsed, then run through the same shortening pipeline). Rows split
  into two outputs:
  - `converted_titles.csv` — confident rows. Columns: `item_id, old_title,
    new_title, pattern_used` (pattern_used = account name).
  - `manual_check_titles.csv` — uncertain/risky rows for human review. Columns:
    `item_id, old_title, attempted_new_title, selected_account, status,
    risk_flag, notes`.
  The pre-conversion cleanup strips clutter (`+`, quotes, decorative `-TAN-`,
  trailing `Trim #`/`code` numbers, `2x` markers), fixes broken year ranges
  (`2003-2007-09 → 2003-2009`), and corrects common typos (`Diver → Driver`),
  while preserving real hyphens (`CR-V`, `F-150`).
- The older general **CSV Batch Processor** is hidden from the navbar (its view
  still opens if a legacy batch history record is reopened) to keep one clear
  CSV workflow.
- **Two CSV exports** — *Selected Titles* (one chosen title per item) and
  *All Account Title Options* (every account option for every item).
- **History** — save batch / matrix sessions, reopen, delete, or clear all.
- **Account Settings** — view/add/edit/enable/disable accounts and edit each
  account's title style. Fully dynamic — add as many accounts as you like.
- **Light / dark theme** — toggle in the header; the choice persists in
  `localStorage`.

### Status badges (character count includes spaces, hyphens, slashes, commas, symbols, periods)

| Characters | Status     |
| ---------- | ---------- |
| ≤ 70       | Good       |
| 71–75      | Safe       |
| 76–80      | Near Limit |
| > 80       | Too Long → `risk_flag = CHECK`, note "Needs manual shortening" |

Titles are never faked. If a title can't fit 80 chars without dropping
important info, it is shown as **Too Long** and flagged for manual review.

---

## Accounts (configurable)

Accounts live in [`src/config/accounts.ts`](src/config/accounts.ts). Each one is:

```ts
{
  id, name, enabled, styleId,
  preferredFitmentWord,      // "Fits" | "For"
  preferredProductWording,   // e.g. "Seat Cover" | "" to inherit the listing
  usesVariation,             // weave the Variation field in?
  titleStructure             // ordered tokens, e.g. ["year","fitment","make",...]
}
```

**To add an account locally:** use the in-app **Account Settings** panel.
Default account changes belong in CPIS and are brought across by the sync.
The Manual Generator, Batch Processor,
exports, and History all pick it up automatically — no other code changes. The
generator simply loops over the enabled accounts
([`generateForAllAccounts`](src/titleGenerator.ts)).

The 8 shipped accounts: `U.S.AutoNation`, `U.S.AutoSeatCover`,
`U.S.AutoSeatFactory`, `DIY`, `Master`, `Premium`, `Elite`, `DSA`.

> Exports use `account_name` and `account_style_id` — there are no
> `pattern_used` / `Pattern A`-style labels anywhere.

---

## Variations (configurable)

Variations live in [`src/config/variations.ts`](src/config/variations.ts):
`MAIN_VARIATIONS` (the 9 primary ones) and `CUSTOM_VARIATIONS` (the larger
optional list, built from a simple label array). A variation just supplies the
seat-component wording placed into each account's title, so all title and
abbreviation rules apply automatically.

**To add a variation:** use the custom-label field for a local variation.
Changes to the shared main/custom lists belong in CPIS and are synchronized.

**Main variation phrase fallback** — each of the 9 main variations has an
ordered `phraseStages` list (in
[`src/config/variationPhraseStages.ts`](src/config/variationPhraseStages.ts)),
most-complete-first (e.g. `Driver Top Replacement Seat Cover` → `Driver Top
Replacement Cover` → `Driver Top Seat Cover` → `Driver Top Cover`). The Variation
Matrix tries them in order and keeps the first that fits 80 chars (after
`Fits`→`For` and year shortening); slash forms (`Driver/Passenger`, `Top/Bottom`)
keep the full words, and `Front …` is used only for the full front variation when
accurate. If none fit, the shortest is used and flagged `Too Long`/`CHECK`. Any
fallback is recorded in `notes`.

The Variation Matrix exports use these columns:
`variation_name, variation_type, account_name, year_range, make, model,
material, color, product_type, generated_title, selected_new_title,
title_length, status, risk_flag, notes`.

---

## Local Development

Node.js is required (use the **LTS** build from <https://nodejs.org/>). Then in
this folder:

```bash
npm install
npm run dev
```

Then open: **http://localhost:5173**

## Production Build Test

```bash
npm run build     # tsc (type-check) + vite build -> /dist
npm run preview   # serves the built /dist locally
```

`npm run build` must finish with **no TypeScript errors** and create the `dist/`
folder. `npm run preview` lets you smoke-test the production bundle before
deploying.

---

## Deploy to Vercel

The app is a 100% static, client-side Vite SPA (no server, no backend) — it
deploys to Vercel as static assets. [`vercel.json`](vercel.json) sets the build
command, output directory, and SPA rewrites (so a hard refresh on any route
serves `index.html` instead of 404).

### Option A — GitHub (recommended)

1. Push the project to GitHub.
2. Go to <https://vercel.com> and sign in.
3. Click **Add New… → Project**.
4. Import the GitHub repository.
5. **Framework Preset:** `Vite`
6. **Build Command:** `npm run build`
7. **Output Directory:** `dist`
8. Click **Deploy**.

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel          # preview deployment
vercel --prod   # production deployment
```

### Environment Variables

- The app currently needs **no** environment variables — settings and history
  are stored in the browser's `localStorage`.
- For any future frontend variables, the name **must start with `VITE_`** to be
  exposed to the client (see [`.env.example`](.env.example)).
- Add variables in **Vercel → Project → Settings → Environment Variables** if
  needed.
- **Never** expose service-role keys or private secrets in frontend code.

---

## CSV input format

Upload a CSV with a header row. Column names are matched flexibly
(case/spacing/underscores ignored). Recommended columns:

```
item-id, url, image url, quantity sold, old_title,
year_range, make, model, seat_position, material, variation, color, product_type
```

`make, model, year_range, seat_position, material, color` are required to build
a title; `variation`, `fitment`, and `product_type` are optional (accounts can
override fitment/product wording). Use **Download Template** in the app for a
ready-made sample, or **Load Sample (5 rows)** to try it instantly.

### Export columns

**Export Selected Titles** — one row per item:
`item-id, url, image url, quantity sold, old_title, account_name,
selected_new_title, new_title_length, status, risk_flag, notes`

**Export All Account Title Options** — one row per item × account:
`item-id, url, image url, quantity sold, old_title, account_name,
generated_title, title_length, status, risk_flag, notes`

---

## Reference catalog & autocomplete

The Variation Matrix form fields (Make, Model, Material, Color, Additional
Variation) offer searchable autocomplete driven by a local reference catalog
([`src/data/catalog.ts`](src/data/catalog.ts)). Make/Model data comes from
`US_Make_Model_List.xlsx` (sheet **Make Model** — the authoritative source;
numeric models like `300`, `911`, `1500` are kept as clean strings);
materials, factory colors, and variations come from `USF GENERATOR.xlsx`
(sheets **Material**, **ColorFactory**, **Variation** — other sheets ignored).
No Google authentication or network access is needed at runtime. Searches
tolerate case, extra spaces, and hyphen-vs-space differences
(`mercedes benz` finds `Mercedes-Benz`); the canonical spreadsheet value is
stored on selection. Suggestions are ranked
exact → starts-with → contains (case-insensitive, max 8 shown), fully keyboard
accessible (↑/↓/Enter/Escape), and Model suggestions are **dependent on the
selected Make** (changing the make clears an incompatible model). Manual typing
is still allowed everywhere.

The **ColorFactory** sheet also drives the *visual color protection* in the
title shortener: each factory color (e.g. `Saddle Brown`) maps to its main
visual color (`Brown`). When a title is over 80 chars the color is reduced one
word at a time — approved modifier abbreviations first (`Light`→`Lt`), then
modifier removal, then factory descriptors (`Saddle`, `Titanium`, `Parchment`) —
and the visual color word is **never** removed.

## Title rules (built in)

- Preserves year range, make, model, seat position, material meaning, color,
  variation (if present), and product type. No invented trims, fitment, item
  IDs, random words, or full-vehicle implications.
- **Every entered field is preserved** — including an **Additional Variation**
  (Armrest, Headrest, Center Console, Foam Cushion, …), which is woven into
  **every** account's title and never dropped to save space. If keeping all data
  pushes a title past 80 chars, the title is still shown and flagged
  `Too Long` / `CHECK` (note: "Additional variation preserved; manual shortening
  needed" or "Required input preserved over 80-character limit") rather than
  losing information.
- **Cross-account uniqueness** (Variation Matrix) — for each variation, the
  title each account produces must be meaningfully different from the others.
  Titles are compared after normalization (case, spacing, punctuation,
  `Fits`/`For`, `&`/`/`/`and`, and approved abbreviation pairs are all collapsed);
  identical → duplicate, ≥ 85% similar → too similar (see
  [`src/lib/uniqueness.ts`](src/lib/uniqueness.ts)). A clashing title is
  regenerated with a different accurate product wording; if it still can't be
  made distinct it is flagged `CHECK` for manual review (notes: "Duplicate
  avoided with alternate account pattern" / "Duplicate title detected" /
  "Similar title detected" / "Manual review needed for uniqueness or length").
- Fitment uses each account's **Fits** / **For** preference unless explicitly
  overridden in the form. When a title is over 80,
  shortening is applied in order: approved abbreviations → switch `Fits`→`For` →
  shorten the year ending (`2000-2010`→`2000-10`) → shorten the year fully
  (`00-10`) → shorter product wording (`Cover`) → otherwise flag `Too Long` /
  `CHECK`. Each step is taken only if still needed; fallbacks are recorded in `notes`.
- Never abbreviates `Genuine` (`Gen.` ✗), `Driver` (`Drvr` ✗), `Passenger`
  (`Pass`/`Pass.`/`Psgr` ✗), or `Bottom` (`Btm` ✗ — uses `Lower`).
- **Protected materials** — `Leather` and `Leatherette` are always written in
  full and are never abbreviated (`Lthr.` ✗, `Lthr` ✗, `Leath.` ✗) or removed to
  fit. A title that keeps the correct material is preferred over a shorter one
  that abbreviates it, so an over-limit title is shown as `Too Long` / `CHECK`
  instead. A legacy `Lthr.` arriving in an imported CSV is normalized back to
  `Leather` and never survives into a generated title.
  Leatherette/Vinyl/Cloth/Suede/MB-Tex/Synthetic Leather are never turned into
  "Leather".
- **`Replacement` fallback** (each step only while still over 80):
  `Replacement`→`Repl.` (note "Replacement shortened to Repl."), then `Repl.`
  removed (note "Replacement removed to meet character limit"). The product
  wording (`Seat Cover`/`Seat Covers`/`Cover`/`Covers`) always remains.
- Allowed only when needed: `Perforated→Perf.`, `Replacement→Repl.`,
  `With→w/`, `Without→w/o`, `And→&`, `Bottom→Lower`,
  `Backrest→Back`, `Lean Back→Leanback`.

Canonical rules live in [`src/cpis/`](src/cpis/); the historical import paths
re-export them so the web and desktop applications use the same engine.

---

## Project structure

```
Title Generator/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx                  # React entry point
    ├── App.tsx                   # app shell + tabs + shared state
    ├── types.ts                  # shared types
    ├── cpis/                     # generated CPIS rules and source manifest
    ├── titleGenerator.ts         # re-export of the canonical CPIS engine
    ├── config/
    │   ├── accounts.ts           # CPIS default account re-export
    │   └── variations.ts         # CPIS variation configuration re-export
    ├── lib/
    │   ├── csv.ts                # CSV parse + batch export builders
    │   ├── matrix.ts             # variation-matrix generation + export builders
    │   ├── titleParser.ts        # parse an existing title -> structured fields
    │   ├── converter.ts          # CSV Account Title Converter logic + export
    │   ├── storage.ts            # localStorage (history + accounts)
    │   └── download.ts           # file download helper
    ├── components/
    │   ├── ui.tsx                # CopyButton, badges, Field, option lists
    │   ├── MatrixGenerator.tsx   # Variation Matrix (9 main + custom)
    │   ├── BatchProcessor.tsx
    │   ├── TitleConverter.tsx    # CSV Account Title Converter
    │   ├── HistoryPanel.tsx
    │   ├── AccountSettings.tsx
    │   └── RulesSummary.tsx
    └── styles.css
```
