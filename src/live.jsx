import React from 'react'
import { AnimatedNumber, useInView } from './motion'
import { Logo } from './Logo'

export const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const preciseCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
export const signedCurrency = (value) => `${value >= 0 ? '+' : '−'}${currency.format(Math.abs(value))}`
export const signedPercent = (value, digits = 2) => (Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%` : '—')
export const toneOf = (value) => (!Number.isFinite(value) || Math.abs(value) < 0.005 ? '' : value > 0 ? 'positive' : 'negative')

export function SampleMark({ show }) {
  return show ? <span className="sample-mark" title="Estimated value: add a changepct column to the Holdings tab for real daily changes.">sample</span> : null
}

export function dailyTotals(holdings, portfolioValue) {
  const dayChange = holdings.reduce((sum, holding) => sum + (holding.dayChange || 0), 0)
  const previous = portfolioValue - dayChange
  return { dayChange, dayPercent: previous ? (dayChange / previous) * 100 : 0 }
}

function TickerItems({ holdings, hidden }) {
  return holdings.map((holding) => (
    <a className="ticker-item" href="#holdings" key={`${hidden ? 'b' : 'a'}-${holding.symbol}`} tabIndex={hidden ? -1 : undefined}>
      <Logo symbol={holding.symbol} size={20} />
      <b>{holding.symbol}</b>
      <span>{preciseCurrency.format(holding.price)}</span>
      <em className={toneOf(holding.dayChangePercent)}>{signedPercent(holding.dayChangePercent)}</em>
    </a>
  ))
}

export function TickerStrip({ holdings, usedSample }) {
  const items = holdings.filter((holding) => holding.symbol !== 'CASH')
  return (
    <section className="ticker-strip" aria-label="Today's moves for club holdings">
      <span className="ticker-label"><i className="live-dot" aria-hidden="true" /> Today<SampleMark show={usedSample} /></span>
      <div className="ticker-window">
        <div className="ticker-track" style={{ '--ticker-duration': `${items.length * 2.6}s` }}>
          <div className="ticker-group"><TickerItems holdings={items} /></div>
          <div className="ticker-group" aria-hidden="true"><TickerItems holdings={items} hidden /></div>
        </div>
      </div>
    </section>
  )
}

function Sparkline({ points, current }) {
  const [ref, inView] = useInView(0.3)
  const values = [...points.map((point) => point.portfolioValue).slice(0, -1), current]
  if (values.length < 2) return null
  const width = 320
  const height = 110
  const max = Math.max(...values)
  const min = Math.min(...values)
  const x = (index) => (index / (values.length - 1)) * (width - 8) + 4
  const y = (value) => height - 8 - ((value - min) / Math.max(max - min, 1)) * (height - 22)
  const line = values.map((value, index) => `${index ? 'L' : 'M'}${x(index)},${y(value)}`).join(' ')
  const area = `${line} L${x(values.length - 1)},${height} L${x(0)},${height} Z`
  return (
    <figure className="hero-spark" ref={ref}>
      <svg viewBox={`0 0 ${width} ${height}`} className={inView ? 'drawn' : ''} aria-hidden="true">
        <defs>
          <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffc20d" stopOpacity=".35" />
            <stop offset="100%" stopColor="#ffc20d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} className="spark-area" />
        <path d={line} className="spark-line" pathLength="1" />
        <circle cx={x(values.length - 1)} cy={y(values.at(-1))} r="5" className="spark-dot" />
      </svg>
      <figcaption>{points[0]?.year} → today</figcaption>
    </figure>
  )
}

export function LiveHero({ summary, holdings, performance, usedSample }) {
  const { dayChange, dayPercent } = dailyTotals(holdings, summary.portfolioValue)
  const cashWeight = summary.portfolioValue ? (summary.cash / summary.portfolioValue) * 100 : 0
  return (
    <article className="portfolio-hero live-hero">
      <svg className="hero-waves" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
        <path className="wave wave-1" d="M0 220 C150 180 300 240 450 190 S750 120 900 150 S1100 90 1200 110 L1200 300 L0 300Z" />
        <path className="wave wave-2" d="M0 250 C200 230 350 260 520 220 S800 170 980 190 S1150 150 1200 160" />
        <path className="wave wave-3" d="M0 200 C180 230 330 170 500 180 S820 110 960 120 S1130 70 1200 60" />
      </svg>
      <div className="live-hero-main">
        <span className="live-label"><i className="live-dot" aria-hidden="true" /> Portfolio value</span>
        <strong className="live-value"><AnimatedNumber value={summary.portfolioValue} format={(value) => currency.format(value)} duration={1500} /></strong>
        <p className="live-today">
          <span className={toneOf(dayChange)}><AnimatedNumber value={dayChange} format={signedCurrency} duration={1500} /> ({signedPercent(dayPercent)})</span>
          <span className="live-today-label">today</span>
          <SampleMark show={usedSample} />
        </p>
        <div className="hero-meta">
          <span><b><AnimatedNumber value={holdings.length} format={(value) => Math.round(value)} /></b> positions</span>
          <span><b><AnimatedNumber value={summary.sectors.length} format={(value) => Math.round(value)} /></b> sectors</span>
          <span><b>{cashWeight.toFixed(1)}%</b> cash</span>
        </div>
      </div>
      <Sparkline points={performance} current={summary.portfolioValue} />
    </article>
  )
}

export function TodayMovers({ holdings, usedSample, onSelect }) {
  const [ref, inView] = useInView(0.25)
  const equities = holdings.filter((holding) => holding.symbol !== 'CASH' && Number.isFinite(holding.dayChangePercent))
  const sorted = [...equities].sort((a, b) => b.dayChangePercent - a.dayChangePercent)
  const groups = [['Biggest gains', sorted.slice(0, 3)], ['Biggest drops', sorted.slice(-3).reverse()]]
  const max = Math.max(...equities.map((holding) => Math.abs(holding.dayChangePercent)), 0.1)
  return (
    <section className="panel movers-panel" ref={ref}>
      <header className="panel-header">
        <div><span>Today’s movers <SampleMark show={usedSample} /></span><h2>What moved the portfolio</h2></div>
      </header>
      <div className="movers-grid">
        {groups.map(([title, list]) => (
          <div key={title}>
            <h3>{title}</h3>
            {list.map((holding, index) => (
              <button type="button" className="mover-row" key={holding.symbol} onClick={() => onSelect(holding.symbol)} style={{ '--delay': `${index * 90}ms` }}>
                <Logo symbol={holding.symbol} size={32} />
                <span><b>{holding.symbol}</b><small>{holding.name}</small></span>
                <span className="mover-bar"><i className={toneOf(holding.dayChangePercent) === 'negative' ? 'down' : 'up'} style={{ width: inView ? `${(Math.abs(holding.dayChangePercent) / max) * 100}%` : 0 }} /></span>
                <em className={toneOf(holding.dayChangePercent)}>{signedPercent(holding.dayChangePercent)}</em>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
