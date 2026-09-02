# DCC Finance Club Portfolio Dashboard

A static, student-friendly dashboard for the Detroit Catholic Central Finance Club portfolio. All portfolio figures are loaded directly in the browser from a published Google Sheet; there is no server or private data service.

## What the dashboard includes

- Portfolio, endowment, corpus, scholarship-distribution, cost-basis, and concentration summaries
- Searchable and sortable holdings with mobile-friendly position cards and an immediate holding-detail drawer
- Two-holding comparison mode for valuation, portfolio weight, return, risk, range, sector, and industry
- One-click Yahoo Finance research links for each investable holding
- Responsive, selectable annual balance history with an explicit balance-versus-return explanation
- Portfolio sector allocation and SCHD sector-tilt comparison
- Research priorities based on position size and unrealized outcomes
- Student investment-memo prompts and a built-in finance glossary
- Separate source-update and retrieval timestamps, including an old-source warning
- Honest loading, partial-data, refresh, and failure states
- Official Detroit Catholic Central crest, primary blue, gold accent, and approved typography roles

## Google Sheet tabs

The application reads CSV exports from spreadsheet `1Zo7-zIo5SppN4yok494w4ufIuOMIRtFkgxdoXsdpHRo`.

| Tab | GID | Purpose |
| --- | --- | --- |
| Holdings | `2018330312` | Positions, prices, values, cost basis, sector, industry, and fundamentals |
| SCHD benchmark | `202600101` | Benchmark sector weights |
| Performance | `202600102` | Annual portfolio, endowment, and total-club balances |
| Club settings | `202600103` | Endowment, corpus/net contributions, scholarship distributions, and last-updated timestamp |

The spreadsheet must remain published or shared so that anyone with the link can read it. If a tab fails, the dashboard never substitutes invented financial data.

## Local development

```bash
npm install
npm run dev
```

Run validation with:

```bash
npm test
npm run build
```

## Static GitHub Pages deployment

Vite uses a relative asset base, so the build works from the repository subpath on GitHub Pages. The workflow in `.github/workflows/deploy-pages.yml` tests, builds, and deploys the `dist` directory whenever `main` changes.

In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

## Data interpretation

Annual balances are not investment returns because contributions and withdrawals affect them. A valid time-weighted return and historical portfolio-versus-SCHD chart require dated transaction or cash-flow data plus historical benchmark values. Until those exist in the Sheet, the dashboard labels the annual series as balance history and limits SCHD analysis to sector allocation.

This website is an educational tool and is not investment advice. Prices and fundamentals may be delayed.
