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
- Live price status and a "positions last entered" date
- Holdings ticker, animated portfolio hero, today's movers, company logos, and dark mode; refreshes every 5 minutes during market hours
- Performance panel from the brokerage statement: rate of return by period, where the ending value came from, and comparison with the S&P 500, NASDAQ, and Dow
- Our Story: a scroll-driven history of the portfolio, its results, and its risk
- What If? simulator for moving money between sectors
- Learn: lessons with YouTube explainers and built-in 60-second motion graphics (compounding, rebalancing, reading the dashboard), each with an activity using the club's data
- Pitch archive on the Research page and in each holding's details
- Honest loading, partial-data, refresh, and failure states
- Official Detroit Catholic Central crest, primary blue, gold accent, and approved typography roles

## Google Sheet tabs

The application reads CSV exports from spreadsheet `1Zo7-zIo5SppN4yok494w4ufIuOMIRtFkgxdoXsdpHRo`.

| Tab | GID | Purpose |
| --- | --- | --- |
| Holdings | `2018330312` | Positions, prices, values, cost basis, sector, industry, and fundamentals |
| SCHD benchmark | `202600101` | Benchmark sector weights |
| Performance | `202600102` | Annual portfolio, endowment, and total-club balances |
| Club settings | `202600103` | Endowment, corpus/net contributions, scholarship distributions, and positions-last-edited date |
| Videos | `202600105` | Learn-page video for each lesson (YouTube link or built-in motion graphic) |
| Pitches | `202600106` | Stock pitches: thesis, risks, sell trigger, decision, review date |
| Returns | `202600107` | Brokerage rate of return and value breakdown by period, with S&P 500 / NASDAQ / Dow returns |
| Risk | `202600108` | Worst drop, volatility, and beta for today's holdings vs the indexes (refresh with `python3 scripts/measure_risk.py`) |

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

Annual balances are not investment returns because contributions and withdrawals affect them. Rates of return come from the club's brokerage statement (Returns tab), which removes those effects. SCHD analysis covers sector allocation. Risk figures apply today's holdings to past prices, so they describe the current portfolio rather than the club's historical holdings.

This website is an educational tool and is not investment advice. Prices and fundamentals may be delayed.
