import React, { useEffect, useMemo, useState } from 'react'
import { loadDashboardData, SECTOR_COLORS, summarize } from './data'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const preciseCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

const ROUTES = {
  portfolio: { label: 'Portfolio', eyebrow: 'Portfolio overview', title: 'Understand the club’s portfolio at a glance' },
  holdings: { label: 'Holdings', eyebrow: 'Holdings workbench', title: 'Explore every position and its role' },
  benchmark: { label: 'Benchmark', eyebrow: 'Benchmark review', title: 'Compare diversification with SCHD' },
  research: { label: 'Research', eyebrow: 'Research desk', title: 'Turn portfolio data into better questions' },
}

const GLOSSARY = [
  ['Cost basis', 'The original amount paid for an investment, adjusted for events such as splits.'],
  ['Corpus', 'Cumulative net contributions to the club. It is not the same as the current portfolio value.'],
  ['Sector tilt', 'The difference between the portfolio’s sector weight and the benchmark’s sector weight.'],
  ['Unrealized gain/loss', 'The change in value of an investment that is still owned.'],
  ['Beta', 'A historical measure of how strongly a stock moved relative to the broader market.'],
  ['P/E ratio', 'Share price divided by earnings per share. It is one valuation measure, not a complete thesis.'],
]

function percent(value, digits = 1) {
  if (!Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`
}

function updatedText(settings, fetchedAt) {
  const value = settings.lastUpdated
  if (!value) return `Loaded ${fetchedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? `Sheet updated ${value}` : `Sheet updated ${parsed.toLocaleString()}`
}

function routeFromHash() {
  const route = window.location.hash.replace('#', '')
  return ROUTES[route] ? route : 'portfolio'
}

function App() {
  const [route, setRoute] = useState(routeFromHash)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedSymbol, setSelectedSymbol] = useState('')

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    loadDashboardData(controller.signal)
      .then((loaded) => {
        setData(loaded)
        setSelectedSymbol((current) => current || loaded.holdings.find((holding) => holding.sector !== 'Cash')?.symbol || '')
      })
      .catch((reason) => {
        if (reason.name !== 'AbortError') setError(reason.message || 'The Google Sheet could not be loaded.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [refreshKey])

  const summary = useMemo(() => (data ? summarize(data.holdings, data.settings) : null), [data])
  const selectedHolding = data?.holdings.find((holding) => holding.symbol === selectedSymbol) || null
  const routeInfo = ROUTES[route]

  return (
    <div className="app-shell">
      <Sidebar route={route} />
      <main id="main-content" className="main-content" tabIndex="-1">
        <header className="page-header">
          <div>
            <p className="eyebrow">{routeInfo.eyebrow}</p>
            <h1>{routeInfo.title}</h1>
          </div>
          <div className="data-status" aria-live="polite">
            <span className={`status-pill ${error ? 'error' : loading ? 'loading' : ''}`}>
              <i aria-hidden="true" /> {loading ? 'Loading Google Sheet' : error ? 'Sheet unavailable' : 'Google Sheet connected'}
            </span>
            {data && <span className="time-pill">{updatedText(data.settings, data.fetchedAt)}</span>}
            <button className="refresh-button" type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
              Refresh data
            </button>
          </div>
        </header>

        {loading && !data && <LoadingState />}
        {error && !data && <ErrorState message={error} onRetry={() => setRefreshKey((key) => key + 1)} />}
        {data && summary && (
          <>
            {error && (
              <div className="notice warning" role="status">
                <strong>The latest refresh failed.</strong> The last successfully loaded Sheet data remains visible. Try refreshing again in a moment.
              </div>
            )}
            {data.errors.length > 0 && (
              <div className="notice warning" role="status">
                <strong>Some sheet tabs are unavailable.</strong> Available data is shown; missing sections are clearly marked.
              </div>
            )}
            {route === 'portfolio' && (
              <PortfolioView
                data={data}
                summary={summary}
                selectedHolding={selectedHolding}
                onSelect={setSelectedSymbol}
              />
            )}
            {route === 'holdings' && (
              <HoldingsView
                holdings={data.holdings}
                summary={summary}
                selectedHolding={selectedHolding}
                onSelect={setSelectedSymbol}
              />
            )}
            {route === 'benchmark' && <BenchmarkView data={data} summary={summary} />}
            {route === 'research' && (
              <ResearchView
                data={data}
                summary={summary}
                selectedHolding={selectedHolding}
                onSelect={setSelectedSymbol}
              />
            )}
            <LearningFooter />
          </>
        )}
      </main>
    </div>
  )
}

function Sidebar({ route }) {
  return (
    <aside className="sidebar" aria-label="Dashboard navigation">
      <div className="brand">
        <img src="./dcc-crest.png" alt="Detroit Catholic Central crest" />
        <div>
          <span>Detroit Catholic Central</span>
          <strong>Finance Club</strong>
        </div>
      </div>
      <nav aria-label="Dashboard sections">
        {Object.entries(ROUTES).map(([key, item]) => (
          <a key={key} href={`#${key}`} className={route === key ? 'active' : ''} aria-current={route === key ? 'page' : undefined}>
            <NavIcon name={key} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
      <div className="sidebar-note">
        <strong>Student-managed portfolio</strong>
        <span>Benchmark: SCHD</span>
      </div>
    </aside>
  )
}

function NavIcon({ name }) {
  const paths = {
    portfolio: 'M3 7h18v12H3z M8 7V4h8v3 M8 12h8',
    holdings: 'M4 19V9 M10 19V4 M16 19v-7 M22 19H2',
    benchmark: 'M3 18l5-6 4 3 7-9 M19 6h-5',
    research: 'M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21',
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d={paths[name]} />
    </svg>
  )
}

function LoadingState() {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <h2>Loading the club’s Google Sheet</h2>
      <p>Holdings and analysis will appear when the latest rows are ready.</p>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <span aria-hidden="true">!</span>
      <div>
        <h2>We couldn’t load the holdings sheet</h2>
        <p>{message}</p>
        <p>Confirm that the Google Sheet is published or shared for anyone with the link.</p>
        <button type="button" onClick={onRetry}>Try again</button>
      </div>
    </div>
  )
}

function PortfolioView({ data, summary, selectedHolding, onSelect }) {
  const equities = data.holdings.filter((holding) => holding.sector !== 'Cash' && holding.sector !== 'Fund')
  return (
    <div className="page-stack">
      <KpiGrid summary={summary} holdings={data.holdings} />
      <section className="insight-strip" aria-label="Portfolio health indicators">
        <Insight label="Largest position" value={data.holdings[0]?.symbol || '—'} detail={`${weightOf(data.holdings[0], summary).toFixed(1)}% of portfolio`} />
        <Insight label="Top five concentration" value={`${summary.topFiveWeight.toFixed(1)}%`} detail="Combined portfolio weight" />
        <Insight label="Cash reserve" value={`${ratio(summary.cash, summary.portfolioValue).toFixed(1)}%`} detail={currency.format(summary.cash)} />
        <Insight label="Equity positions" value={String(equities.length)} detail={`${summary.sectors.length} asset sectors`} />
      </section>
      <BalanceChart points={data.performance} />
      <div className="two-column">
        <AllocationPanel sectors={summary.sectors} benchmark={data.benchmark} />
        <ConcentrationPanel holdings={data.holdings} summary={summary} />
      </div>
      <div className="content-with-detail">
        <HoldingsTable holdings={data.holdings.slice(0, 10)} total={summary.portfolioValue} selected={selectedHolding?.symbol} onSelect={onSelect} compact />
        <HoldingDetail holding={selectedHolding} total={summary.portfolioValue} />
      </div>
    </div>
  )
}

function KpiGrid({ summary, holdings }) {
  return (
    <section className="kpi-grid" aria-label="Portfolio summary">
      <Kpi label="Portfolio value" value={currency.format(summary.portfolioValue)} note="Holdings from Google Sheet" />
      <Kpi label="Total club value" value={currency.format(summary.totalClubValue)} note="Portfolio plus endowment" />
      <Kpi label="Endowment" value={currency.format(summary.endowmentValue)} note="From Club Settings tab" />
      <Kpi label="Unrealized gain" value={currency.format(summary.unrealizedGain)} note="Market value minus cost basis" tone={summary.unrealizedGain >= 0 ? 'positive' : 'negative'} />
      <Kpi label="Positions" value={String(holdings.length)} note={`${summary.sectors.length} represented sectors`} />
    </section>
  )
}

function Kpi({ label, value, note, tone = '' }) {
  return (
    <article className="kpi-card">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
      <small>{note}</small>
    </article>
  )
}

function Insight({ label, value, detail }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function BalanceChart({ points }) {
  const [range, setRange] = useState('All')
  const visible = range === 'All' ? points : points.slice(-(range === '5Y' ? 5 : 3))
  if (!points.length) return <UnavailablePanel title="Balance history" />

  const width = 800
  const height = 265
  const plot = { left: 92, right: 24, top: 24, bottom: 42 }
  const values = visible.map((point) => point.portfolioValue)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = Math.max((max - min) * 0.12, 1000)
  const low = Math.max(0, min - padding)
  const high = max + padding
  const x = (index) => plot.left + (index / Math.max(visible.length - 1, 1)) * (width - plot.left - plot.right)
  const y = (value) => plot.top + ((high - value) / Math.max(high - low, 1)) * (height - plot.top - plot.bottom)
  const polyline = visible.map((point, index) => `${x(index)},${y(point.portfolioValue)}`).join(' ')
  const ticks = Array.from({ length: 5 }, (_, index) => low + ((high - low) * index) / 4).reverse()

  return (
    <section className="panel chart-panel">
      <PanelHeading eyebrow="Annual history" title="Portfolio balance" trailing={(
        <div className="segmented" aria-label="Balance history range">
          {['All', '5Y', '3Y'].map((option) => (
            <button key={option} type="button" className={range === option ? 'active' : ''} aria-pressed={range === option} onClick={() => setRange(option)}>{option}</button>
          ))}
        </div>
      )} />
      <div className="chart-scroll">
        <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="balance-title balance-desc">
          <title id="balance-title">Annual portfolio balance</title>
          <desc id="balance-desc">Portfolio balance by year. This chart does not adjust for contributions or withdrawals and should not be read as investment return.</desc>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={plot.left} x2={width - plot.right} y1={y(tick)} y2={y(tick)} className="grid-line" />
              <text x={plot.left - 12} y={y(tick) + 4} textAnchor="end">{currency.format(tick)}</text>
            </g>
          ))}
          <polyline points={polyline} className="balance-area-line" />
          {visible.map((point, index) => (
            <g key={point.year}>
              <circle cx={x(index)} cy={y(point.portfolioValue)} r="4" />
              <text x={x(index)} y={height - 14} textAnchor="middle">{point.year}</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="data-explainer"><strong>Balance is not return.</strong> Deposits and withdrawals affect these totals. A contribution-adjusted performance comparison requires transaction or cash-flow history in the Sheet.</p>
      <table className="sr-only">
        <caption>Annual portfolio balance data</caption>
        <thead><tr><th>Year</th><th>Portfolio balance</th></tr></thead>
        <tbody>{visible.map((point) => <tr key={point.year}><td>{point.year}</td><td>{currency.format(point.portfolioValue)}</td></tr>)}</tbody>
      </table>
    </section>
  )
}

function AllocationPanel({ sectors, benchmark }) {
  const benchmarkMap = Object.fromEntries(benchmark.map((row) => [row.sector, row.weight]))
  return (
    <section className="panel">
      <PanelHeading eyebrow="Diversification" title="Sector allocation" />
      <div className="allocation-summary">
        <div className="donut" style={{ background: sectorGradient(sectors) }} role="img" aria-label={sectors.map((sector) => `${sector.sector} ${sector.weight.toFixed(1)} percent`).join(', ')}>
          <span><strong>{sectors.length}</strong>sectors</span>
        </div>
        <div className="sector-list">
          {sectors.slice(0, 8).map((sector) => (
            <div className="sector-row" key={sector.sector}>
              <div><i style={{ background: sector.color }} aria-hidden="true" /><strong>{sector.sector}</strong></div>
              <b>{sector.weight.toFixed(1)}%</b>
              <span>{benchmark.length ? `SCHD ${(benchmarkMap[sector.sector] || 0).toFixed(1)}%` : currency.format(sector.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ConcentrationPanel({ holdings, summary }) {
  const top = holdings.slice(0, 5)
  return (
    <section className="panel">
      <PanelHeading eyebrow="Position sizing" title="Largest portfolio weights" />
      <div className="bar-list">
        {top.map((holding) => {
          const weight = weightOf(holding, summary)
          return (
            <div className="bar-row" key={holding.symbol}>
              <div><strong>{holding.symbol}</strong><span>{holding.name}</span><b>{weight.toFixed(1)}%</b></div>
              <div className="bar-track"><i style={{ width: `${Math.min(weight * 8, 100)}%` }} /></div>
            </div>
          )
        })}
      </div>
      <p className="source-note">The five largest positions represent {summary.topFiveWeight.toFixed(1)}% of the portfolio.</p>
    </section>
  )
}

function HoldingsView({ holdings, summary, selectedHolding, onSelect }) {
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('All')
  const [assetClass, setAssetClass] = useState('All')
  const sectors = ['All', ...new Set(holdings.map((holding) => holding.sector))]
  const filtered = holdings.filter((holding) => {
    const matchesQuery = `${holding.symbol} ${holding.name} ${holding.sector} ${holding.industry}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesSector = sector === 'All' || holding.sector === sector
    const matchesClass = assetClass === 'All' || (assetClass === 'Equities' ? !['Cash', 'Fund'].includes(holding.sector) : holding.sector === assetClass)
    return matchesQuery && matchesSector && matchesClass
  })

  return (
    <div className="page-stack">
      <section className="filter-bar">
        <label className="search-field">
          <span>Search holdings</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticker, company, sector, or industry" />
        </label>
        <label>
          <span>Sector</span>
          <select value={sector} onChange={(event) => setSector(event.target.value)}>{sectors.map((option) => <option key={option}>{option}</option>)}</select>
        </label>
        <label>
          <span>Asset class</span>
          <select value={assetClass} onChange={(event) => setAssetClass(event.target.value)}>
            <option>All</option><option>Equities</option><option>Fund</option><option>Cash</option>
          </select>
        </label>
      </section>
      <section className="insight-strip" aria-label="Filtered holdings summary">
        <Insight label="Visible positions" value={String(filtered.length)} detail={`${holdings.length} total positions`} />
        <Insight label="Visible market value" value={currency.format(filtered.reduce((sum, holding) => sum + holding.marketValue, 0))} detail="After current filters" />
        <Insight label="Largest position" value={filtered[0]?.symbol || '—'} detail={filtered[0] ? `${weightOf(filtered[0], summary).toFixed(1)}% of portfolio` : 'No match'} />
      </section>
      <div className="content-with-detail">
        <HoldingsTable holdings={filtered} total={summary.portfolioValue} selected={selectedHolding?.symbol} onSelect={onSelect} />
        <HoldingDetail holding={selectedHolding} total={summary.portfolioValue} />
      </div>
    </div>
  )
}

function HoldingsTable({ holdings, total, selected, onSelect, compact = false }) {
  const [sort, setSort] = useState({ key: 'marketValue', direction: 'desc' })
  const rows = [...holdings].sort((a, b) => {
    const left = sort.key === 'weight' ? ratio(a.marketValue, total) : a[sort.key]
    const right = sort.key === 'weight' ? ratio(b.marketValue, total) : b[sort.key]
    const comparison = typeof left === 'string' ? left.localeCompare(right) : left - right
    return sort.direction === 'asc' ? comparison : -comparison
  })
  const updateSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' }))
  const SortButton = ({ column, children }) => (
    <button type="button" onClick={() => updateSort(column)} aria-label={`Sort by ${children}`}>{children}{sort.key === column ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</button>
  )

  return (
    <section className="panel holdings-panel">
      <PanelHeading eyebrow="Current positions" title={compact ? 'Largest holdings' : 'All holdings'} trailing={<span className="count-pill">{rows.length} positions</span>} />
      <div className="table-wrap">
        <table className="holdings-table">
          <thead>
            <tr>
              <th><SortButton column="symbol">Symbol</SortButton></th>
              <th><SortButton column="name">Company</SortButton></th>
              <th><SortButton column="sector">Sector</SortButton></th>
              <th className="numeric"><SortButton column="marketValue">Market value</SortButton></th>
              <th className="numeric"><SortButton column="weight">Weight</SortButton></th>
              <th className="numeric"><SortButton column="costBasis">Cost basis</SortButton></th>
              <th className="numeric"><SortButton column="gainLossPercent">Return</SortButton></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((holding) => (
              <tr key={holding.symbol} className={selected === holding.symbol ? 'selected' : ''}>
                <td data-label="Symbol"><button className="ticker-button" type="button" onClick={() => onSelect(holding.symbol)} aria-label={`Show details for ${holding.symbol}`}>{holding.symbol}</button></td>
                <td data-label="Company"><strong>{holding.name}</strong><small>{number.format(holding.quantity)} shares at {preciseCurrency.format(holding.price)}</small></td>
                <td data-label="Sector"><span className="sector-chip"><i style={{ background: SECTOR_COLORS[holding.sector] || SECTOR_COLORS.Unknown }} />{holding.sector}</span></td>
                <td data-label="Market value" className="numeric">{currency.format(holding.marketValue)}</td>
                <td data-label="Weight" className="numeric">{ratio(holding.marketValue, total).toFixed(1)}%</td>
                <td data-label="Cost basis" className="numeric">{currency.format(holding.costBasis)}</td>
                <td data-label="Return" className={`numeric ${holding.gainLossPercent >= 0 ? 'positive' : 'negative'}`}>{percent(holding.gainLossPercent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="empty-state">No holdings match these filters.</p>}
      </div>
    </section>
  )
}

function HoldingDetail({ holding, total }) {
  if (!holding) return null
  const rangePosition = holding.high52 && holding.low52 && holding.high52 !== holding.low52
    ? ((holding.price - holding.low52) / (holding.high52 - holding.low52)) * 100
    : null
  return (
    <aside className="panel detail-panel" aria-label={`Details for ${holding.symbol}`}>
      <div className="detail-title"><span>{holding.symbol.slice(0, 2)}</span><div><p className="eyebrow">Selected holding</p><h2>{holding.symbol}</h2><p>{holding.name}</p></div></div>
      <div className="detail-price"><strong>{preciseCurrency.format(holding.price)}</strong><span>{ratio(holding.marketValue, total).toFixed(1)}% weight</span></div>
      <dl className="metric-list">
        <div><dt>Market value</dt><dd>{currency.format(holding.marketValue)}</dd></div>
        <div><dt>Shares</dt><dd>{number.format(holding.quantity)}</dd></div>
        <div><dt>Cost basis</dt><dd>{currency.format(holding.costBasis)}</dd></div>
        <div><dt>Unrealized return</dt><dd className={holding.gainLossPercent >= 0 ? 'positive' : 'negative'}>{percent(holding.gainLossPercent)}</dd></div>
        <div><dt>P/E</dt><dd>{holding.pe ?? '—'}</dd></div>
        <div><dt>Beta</dt><dd>{holding.beta ?? '—'}</dd></div>
      </dl>
      {rangePosition !== null && (
        <div className="range-meter">
          <div><span>52-week low<br /><strong>{preciseCurrency.format(holding.low52)}</strong></span><span>52-week high<br /><strong>{preciseCurrency.format(holding.high52)}</strong></span></div>
          <div className="range-track"><i style={{ left: `${Math.max(0, Math.min(rangePosition, 100))}%` }} /></div>
        </div>
      )}
      <div className="company-facts"><span>Sector<strong>{holding.sector}</strong></span><span>Industry<strong>{holding.industry}</strong></span><span>EPS<strong>{holding.eps ?? '—'}</strong></span></div>
      <p className="source-note">Fundamentals and prices come from the holdings tab and may be delayed.</p>
    </aside>
  )
}

function BenchmarkView({ data, summary }) {
  if (!data.benchmark.length) return <UnavailablePanel title="SCHD benchmark sectors" />
  const portfolioSectors = summary.sectors.filter((sector) => !['Cash', 'Fund'].includes(sector.sector))
  const names = [...new Set([...portfolioSectors.map((sector) => sector.sector), ...data.benchmark.map((row) => row.sector)])]
  const portfolioMap = Object.fromEntries(portfolioSectors.map((sector) => [sector.sector, sector.weight]))
  const benchmarkMap = Object.fromEntries(data.benchmark.map((row) => [row.sector, row.weight]))
  const tilts = names.map((sector) => ({ sector, portfolio: portfolioMap[sector] || 0, benchmark: benchmarkMap[sector] || 0, tilt: (portfolioMap[sector] || 0) - (benchmarkMap[sector] || 0) })).sort((a, b) => Math.abs(b.tilt) - Math.abs(a.tilt))
  return (
    <div className="page-stack">
      <div className="notice info"><strong>What this comparison means:</strong> The Sheet currently provides SCHD sector weights, not historical SCHD returns. This page compares diversification and does not claim to measure relative investment performance.</div>
      <section className="insight-strip">
        <Insight label="Largest overweight" value={tilts.find((item) => item.tilt > 0)?.sector || '—'} detail={percent(tilts.find((item) => item.tilt > 0)?.tilt || 0)} />
        <Insight label="Largest underweight" value={tilts.find((item) => item.tilt < 0)?.sector || '—'} detail={percent(tilts.find((item) => item.tilt < 0)?.tilt || 0)} />
        <Insight label="Portfolio sectors" value={String(portfolioSectors.length)} detail={`SCHD lists ${data.benchmark.length}`} />
        <Insight label="Cash difference" value={`${ratio(summary.cash, summary.portfolioValue).toFixed(1)}%`} detail="SCHD sector data excludes cash" />
      </section>
      <section className="panel">
        <PanelHeading eyebrow="Allocation gaps" title="Portfolio sector tilts versus SCHD" />
        <div className="tilt-chart" role="img" aria-label={tilts.map((item) => `${item.sector} tilt ${percent(item.tilt)}`).join(', ')}>
          {tilts.map((item) => (
            <div className="tilt-row" key={item.sector}>
              <strong>{item.sector}</strong>
              <div className="tilt-scale"><i className={item.tilt >= 0 ? 'over' : 'under'} style={{ width: `${Math.min(Math.abs(item.tilt) * 2.1, 50)}%`, [item.tilt >= 0 ? 'left' : 'right']: '50%' }} /></div>
              <b className={item.tilt >= 0 ? 'positive' : 'negative'}>{percent(item.tilt)}</b>
              <small>Portfolio {item.portfolio.toFixed(1)}% · SCHD {item.benchmark.toFixed(1)}%</small>
            </div>
          ))}
        </div>
      </section>
      <div className="two-column"><AllocationPanel sectors={summary.sectors} benchmark={data.benchmark} /><BenchmarkQuestions tilts={tilts} /></div>
      <BalanceChart points={data.performance} />
    </div>
  )
}

function BenchmarkQuestions({ tilts }) {
  return (
    <section className="panel discussion-panel">
      <PanelHeading eyebrow="Club discussion" title="Questions worth asking" />
      <ol>
        <li><strong>Is our largest overweight intentional?</strong><span>Explain why {tilts[0]?.sector} deserves a {percent(tilts[0]?.tilt || 0)} tilt.</span></li>
        <li><strong>What risk does the benchmark hold that we do not?</strong><span>Review the largest underweight and decide whether it reflects conviction or neglect.</span></li>
        <li><strong>Is SCHD still the right benchmark?</strong><span>A growth-heavy portfolio may also benefit from an S&amp;P 500 comparison.</span></li>
      </ol>
    </section>
  )
}

function ResearchView({ data, summary, selectedHolding, onSelect }) {
  const equities = data.holdings.filter((holding) => !['Cash', 'Fund'].includes(holding.sector))
  const winner = [...equities].sort((a, b) => b.gainLossPercent - a.gainLossPercent)[0]
  const laggard = [...equities].sort((a, b) => a.gainLossPercent - b.gainLossPercent)[0]
  const largest = equities[0]
  const benchmarkMap = Object.fromEntries(data.benchmark.map((row) => [row.sector, row.weight]))
  const biggestTilt = summary.sectors.filter((sector) => !['Cash', 'Fund'].includes(sector.sector)).map((sector) => ({ ...sector, tilt: sector.weight - (benchmarkMap[sector.sector] || 0) })).sort((a, b) => Math.abs(b.tilt) - Math.abs(a.tilt))[0]
  const priorities = equities.map((holding) => ({ ...holding, weight: ratio(holding.marketValue, summary.portfolioValue), score: ratio(holding.marketValue, summary.portfolioValue) + Math.abs(holding.gainLossPercent) / 100 })).sort((a, b) => b.score - a.score)

  return (
    <div className="page-stack">
      <section className="research-cards" aria-label="Research priorities">
        <ResearchCard label="Revisit a winner" holding={winner} detail={`${percent(winner?.gainLossPercent)} since cost basis. Test whether the thesis still supports today’s weight.`} onSelect={onSelect} />
        <ResearchCard label="Pressure-test a laggard" holding={laggard} detail={`${percent(laggard?.gainLossPercent)} since cost basis. Revisit risks, catalysts, and opportunity cost.`} onSelect={onSelect} />
        <ResearchCard label="Concentration review" holding={largest} detail={`${ratio(largest?.marketValue || 0, summary.portfolioValue).toFixed(1)}% of the portfolio. Decide on a maximum position size.`} onSelect={onSelect} />
        <ResearchCard label="Benchmark discussion" title={biggestTilt?.sector} detail={`${percent(biggestTilt?.tilt || 0)} versus SCHD. Is the difference intentional?`} />
      </section>
      <div className="content-with-detail">
        <section className="panel priority-panel">
          <PanelHeading eyebrow="Meeting agenda" title="Holdings to review first" trailing={<span className="count-pill">Weight + outcome</span>} />
          <div className="priority-list">
            {priorities.slice(0, 12).map((holding, index) => (
              <button type="button" key={holding.symbol} onClick={() => onSelect(holding.symbol)} className={selectedHolding?.symbol === holding.symbol ? 'selected' : ''}>
                <span>{index + 1}</span><strong>{holding.symbol}<small>{holding.name}</small></strong><b>{holding.weight.toFixed(1)}%</b><em className={holding.gainLossPercent >= 0 ? 'positive' : 'negative'}>{percent(holding.gainLossPercent)}</em>
              </button>
            ))}
          </div>
        </section>
        <HoldingDetail holding={selectedHolding} total={summary.portfolioValue} />
      </div>
      <section className="panel thesis-template">
        <PanelHeading eyebrow="Student analyst template" title="A repeatable investment memo" />
        <div className="memo-grid">
          {['One-sentence thesis', 'Why now?', 'Valuation and expectations', 'Three key risks', 'What would make us sell?', 'Next review date'].map((item, index) => <article key={item}><span>0{index + 1}</span><strong>{item}</strong><p>Record this in a future Research tab so the club can compare decisions with outcomes.</p></article>)}
        </div>
      </section>
    </div>
  )
}

function ResearchCard({ label, holding, title, detail, onSelect }) {
  const content = <><span>{label}</span><strong>{holding?.symbol || title || '—'}</strong><p>{detail}</p></>
  return onSelect && holding ? <button type="button" onClick={() => onSelect(holding.symbol)}>{content}</button> : <article>{content}</article>
}

function PanelHeading({ eyebrow, title, trailing }) {
  return <header className="panel-header"><div><span>{eyebrow}</span><h2>{title}</h2></div>{trailing}</header>
}

function UnavailablePanel({ title }) {
  return <section className="panel unavailable"><h2>{title} is unavailable</h2><p>Check the corresponding Google Sheet tab and refresh this page.</p></section>
}

function LearningFooter() {
  return (
    <footer className="learning-footer">
      <div><strong>About the data</strong><p>All portfolio figures are loaded directly from the club’s published Google Sheet. Prices and fundamentals may be delayed. This dashboard is for education and club discussion—not investment advice.</p></div>
      <details><summary>Finance glossary</summary><dl>{GLOSSARY.map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl></details>
    </footer>
  )
}

function ratio(value, total) {
  return total ? (value / total) * 100 : 0
}

function weightOf(holding, summary) {
  return holding ? ratio(holding.marketValue, summary.portfolioValue) : 0
}

function sectorGradient(sectors) {
  let current = 0
  const stops = sectors.map((sector) => {
    const start = current
    current += sector.weight
    return `${sector.color} ${start}% ${current}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

export default App
