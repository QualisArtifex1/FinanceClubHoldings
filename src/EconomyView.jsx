import React from 'react'
import { describe, pulseSummary, shortDate } from './economy'
import { useInView } from './motion'

const GROUP_INFO = {
  Sentiment: 'How consumers and investors feel right now.',
  Leading: 'Measures that tend to turn before the overall economy does.',
  Context: 'Background conditions that shape the market. These usually move after the economy turns.',
}

function Spark({ history, tone }) {
  const [ref, inView] = useInView(0.2)
  if (history.length < 2) return <div className="econ-spark empty" ref={ref} />
  const step = Math.max(1, Math.floor(history.length / 120))
  const points = history.filter((_, index) => index % step === 0 || index === history.length - 1)
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const width = 240
  const height = 56
  const x = (index) => (index / (points.length - 1)) * width
  const y = (value) => height - 4 - ((value - min) / Math.max(max - min, 1e-9)) * (height - 8)
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ')
  const zero = min < 0 && max > 0 ? y(0) : null
  return (
    <svg className={`econ-spark ${inView ? 'drawn' : ''} tone-${tone}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" ref={ref} aria-hidden="true">
      {zero !== null && <line x1="0" x2={width} y1={zero} y2={zero} className="econ-zero" />}
      <path d={`${line} L${width},${height} L0,${height} Z`} className="econ-area" />
      <path d={line} className="econ-line" pathLength="1" />
      <circle cx={x(points.length - 1)} cy={y(values.at(-1))} r="3.5" className="econ-dot" />
    </svg>
  )
}

export function IndicatorCard({ item }) {
  const { info, signal } = item
  return (
    <article className={`econ-card tone-${signal.tone}`}>
      <header>
        <span className="econ-label">{item.label}</span>
        <span className={`econ-chip tone-${signal.tone}`}>{signal.label}</span>
      </header>
      <div className="econ-value">
        <strong>{item.ready ? info.format(item.latest) : '—'}</strong>
        {item.change !== null && (
          <span className={`econ-change ${item.good}`}>
            {item.direction === 'up' ? '▲' : item.direction === 'down' ? '▼' : '•'} {info.format(Math.abs(item.change)).replace(/^\+/, '')} vs {shortDate(item.previousDate, item.frequency)}
          </span>
        )}
      </div>
      <Spark history={item.history} tone={signal.tone} />
      <p className="econ-note">{signal.note || info.what}</p>
      <footer>
        <span>{item.ready ? `${item.frequency || 'Latest'} · ${shortDate(item.latestDate, item.frequency)}` : ''}</span>
        <a href={`https://fred.stlouisfed.org/series/${item.id}`} target="_blank" rel="noopener noreferrer">FRED ↗</a>
      </footer>
      {signal.note && info.what && <details className="econ-what"><summary>What is this?</summary><p>{info.what}</p></details>}
    </article>
  )
}

export default function EconomyView({ data }) {
  const items = data.economy.map(describe)
  const ready = items.filter((item) => item.ready)
  if (!items.length || !ready.length) {
    return (
      <div className="page-stack">
        <section className="panel econ-empty">
          <h2>Economic data is on its way</h2>
          <p>The Sheet’s <strong>Economy</strong> tab pulls these indicators from FRED, the St. Louis Federal Reserve’s free database. If this message stays, open the Sheet’s <strong>EconomyData</strong> tab in a desktop browser and click <strong>Allow access</strong> once.</p>
        </section>
      </div>
    )
  }
  const pulse = pulseSummary(items)
  const groups = [...new Set(items.map((item) => item.group))]
  return (
    <div className="page-stack economy">
      <PulseSummary pulse={pulse} />
      {groups.map((group) => (
        <section className="econ-group" key={group}>
          <header><h2>{group === 'Leading' ? 'Leading indicators' : group}</h2>{GROUP_INFO[group] && <p>{GROUP_INFO[group]}</p>}</header>
          <div className="econ-grid">
            {items.filter((item) => item.group === group).map((item) => <IndicatorCard key={item.id} item={item} />)}
          </div>
        </section>
      ))}
      <p className="source-note">Data from FRED, Federal Reserve Bank of St. Louis, updated automatically through the club’s Google Sheet. Signals use simple, widely cited rules of thumb. They describe current conditions; they are not forecasts.</p>
    </div>
  )
}

function PulseSummary({ pulse }) {
  const [ref, inView] = useInView(0.3)
  const segments = [['caution', pulse.caution.length], ['watch', pulse.watch.length], ['ok', pulse.ok.length]]
  return (
    <section className="panel econ-pulse-summary" ref={ref}>
      <div>
        <span className="eyebrow">Economic pulse</span>
        <h2>
          {pulse.caution.length ? `${pulse.caution.length} of ${pulse.total} signals flashing caution` : `No warning signs among ${pulse.total} signals`}
        </h2>
        <p>
          {pulse.caution.length > 0 && <>Caution: {pulse.caution.map((item) => item.info.short).join(', ')}. </>}
          {pulse.watch.length > 0 && <>Worth watching: {pulse.watch.map((item) => item.info.short).join(', ')}. </>}
          {pulse.ok.length > 0 && <>Healthy: {pulse.ok.map((item) => item.info.short).join(', ')}.</>}
        </p>
      </div>
      <div className="pulse-bar" aria-hidden="true">
        {segments.map(([tone, count]) => count > 0 && <i key={tone} className={`tone-${tone}`} style={{ flexGrow: inView ? count : 0.001 }}><b>{count}</b></i>)}
      </div>
    </section>
  )
}

// Compact strip for the Portfolio page.
const PULSE_IDS = ['UMCSENT', 'VIXCLS', 'T10Y2Y', 'ICSA']

export function EconomicPulseStrip({ economy }) {
  const items = economy.map(describe).filter((item) => item.ready)
  if (!items.length) return null
  const picks = PULSE_IDS.map((id) => items.find((item) => item.id === id)).filter(Boolean)
  const shown = picks.length ? picks : items.slice(0, 4)
  const pulse = pulseSummary(items)
  return (
    <section className="econ-strip" aria-label="Economic pulse">
      <a className="econ-strip-head" href="#economy">
        <span>Economic pulse</span>
        <strong>{pulse.caution.length ? `${pulse.caution.length} caution · ${pulse.watch.length} watch` : `${pulse.ok.length} of ${pulse.total} healthy`}</strong>
        <em>See all indicators →</em>
      </a>
      {shown.map((item) => (
        <a className="econ-strip-item" href="#economy" key={item.id}>
          <span>{item.info.short}</span>
          <strong>{item.info.format(item.latest)}</strong>
          <em className={`econ-chip tone-${item.signal.tone}`}>{item.signal.label}</em>
        </a>
      ))}
    </section>
  )
}
