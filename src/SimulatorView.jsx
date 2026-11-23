import React, { useMemo, useState } from 'react'
import { SECTOR_COLORS } from './data'
import { AnimatedNumber } from './motion'
import { currency, signedPercent } from './live'

// Average beta of the holdings in each sector (cash = 0, unknown = 1).
function sectorBetas(holdings) {
  const groups = {}
  holdings.forEach((holding) => {
    if (!Number.isFinite(holding.beta)) return
    groups[holding.sector] ??= { value: 0, weighted: 0 }
    groups[holding.sector].value += holding.marketValue
    groups[holding.sector].weighted += holding.marketValue * holding.beta
  })
  const result = Object.fromEntries(Object.entries(groups).map(([sector, group]) => [sector, group.weighted / group.value]))
  result.Cash = 0
  return result
}

export function simulate(weights, benchmark, betas, from, to, amount) {
  const after = { ...weights }
  const moved = Math.min(amount, after[from] || 0)
  after[from] = (after[from] || 0) - moved
  after[to] = (after[to] || 0) + moved
  const names = [...new Set([...Object.keys(after), ...Object.keys(benchmark)])]
  const difference = names.reduce((sum, sector) => sum + Math.abs((after[sector] || 0) - (benchmark[sector] || 0)), 0) / 2
  const beta = Object.entries(after).reduce((sum, [sector, weight]) => sum + (weight / 100) * (betas[sector] ?? 1), 0)
  const largest = Object.entries(after).sort((a, b) => b[1] - a[1])[0]
  return { weights: after, difference, beta, largest, moved }
}

export default function SimulatorView({ data, summary }) {
  const weights = useMemo(() => Object.fromEntries(summary.sectors.map((sector) => [sector.sector, sector.weight])), [summary])
  const benchmark = useMemo(() => Object.fromEntries(data.benchmark.map((row) => [row.sector, row.weight])), [data.benchmark])
  const betas = useMemo(() => sectorBetas(data.holdings), [data.holdings])
  const tilts = Object.keys({ ...weights, ...benchmark })
    .filter((sector) => !['Cash', 'Fund'].includes(sector))
    .map((sector) => ({ sector, tilt: (weights[sector] || 0) - (benchmark[sector] || 0) }))
    .sort((a, b) => b.tilt - a.tilt)
  const defaultFrom = tilts[0]?.sector || summary.sectors[0]?.sector
  const defaultTo = tilts.at(-1)?.sector || 'Cash'

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [amount, setAmount] = useState(5)

  const maxAmount = Math.max(1, Math.floor(Math.min(weights[from] || 0, 30)))
  const safeAmount = Math.min(amount, maxAmount)
  const before = simulate(weights, benchmark, betas, from, to, 0)
  const after = simulate(weights, benchmark, betas, from, to, safeAmount)
  const sectorsShown = [...new Set([...Object.keys(weights), ...Object.keys(benchmark)])]
    .sort((a, b) => (after.weights[b] || 0) - (after.weights[a] || 0))
  const scale = Math.max(...sectorsShown.map((sector) => Math.max(after.weights[sector] || 0, weights[sector] || 0, benchmark[sector] || 0)), 1)
  const fromOptions = summary.sectors.filter((sector) => sector.weight >= 1).map((sector) => sector.sector)
  const toOptions = [...new Set([...Object.keys(benchmark), ...Object.keys(weights)])].filter((sector) => sector !== from)

  const fromTiltBefore = (weights[from] || 0) - (benchmark[from] || 0)
  const fromTiltAfter = (after.weights[from] || 0) - (benchmark[from] || 0)

  return (
    <div className="page-stack simulator">
      <section className="panel sim-controls">
        <span className="eyebrow">What if…</span>
        <p className="sim-sentence">
          Move
          <output className="sim-amount">{safeAmount}%</output>
          <span className="sim-dollars">({currency.format((safeAmount / 100) * summary.portfolioValue)})</span>
          of the portfolio out of
          <select value={from} onChange={(event) => { setFrom(event.target.value); if (event.target.value === to) setTo(defaultFrom === event.target.value ? defaultTo : defaultFrom) }} aria-label="Sector to sell">
            {fromOptions.map((sector) => <option key={sector}>{sector}</option>)}
          </select>
          and into
          <select value={to} onChange={(event) => setTo(event.target.value)} aria-label="Sector to buy">
            {toOptions.map((sector) => <option key={sector}>{sector}</option>)}
          </select>
        </p>
        <input className="sim-slider" type="range" min="0" max={maxAmount} step="0.5" value={safeAmount} onChange={(event) => setAmount(Number(event.target.value))} aria-label="Percent of portfolio to move" style={{ '--fill': `${(safeAmount / maxAmount) * 100}%` }} />
        <div className="sim-slider-scale"><span>0%</span><span>{maxAmount}%</span></div>
      </section>

      <section className="sim-metrics" aria-live="polite">
        <SimMetric label="Difference from SCHD" hint="Share of the portfolio that would have to move to match SCHD’s sectors" before={before.difference} after={after.difference} format={(value) => `${value.toFixed(1)}%`} lowerIsCloser />
        <SimMetric label="Estimated beta" hint="How much the portfolio tends to swing with the market (1.0 = same as market)" before={before.beta} after={after.beta} format={(value) => value.toFixed(2)} />
        <SimMetric label={`${from} tilt`} hint="This sector’s weight minus SCHD’s" before={fromTiltBefore} after={fromTiltAfter} format={(value) => signedPercent(value, 1)} />
      </section>

      <section className="panel">
        <header className="panel-header">
          <div><span>Sector weights</span><h2>Before and after</h2></div>
          <div className="sim-legend"><span><i className="k-before" />Now</span><span><i className="k-after" />After move</span><span><i className="k-schd" />SCHD</span></div>
        </header>
        <div className="sim-bars">
          {sectorsShown.map((sector) => {
            const changed = sector === from || sector === to
            return (
              <div className={`sim-row ${changed ? 'changed' : ''}`} key={sector}>
                <strong>{sector}</strong>
                <div className="sim-track">
                  <i className="sim-before" style={{ width: `${((weights[sector] || 0) / scale) * 100}%` }} />
                  <i className="sim-after" style={{ width: `${((after.weights[sector] || 0) / scale) * 100}%`, background: SECTOR_COLORS[sector] || SECTOR_COLORS.Unknown }} />
                  {benchmark[sector] !== undefined && <i className="sim-schd" style={{ left: `${(benchmark[sector] / scale) * 100}%` }} />}
                </div>
                <b>{(after.weights[sector] || 0).toFixed(1)}%</b>
              </div>
            )
          })}
        </div>
        <p className="sim-takeaway">
          {safeAmount === 0
            ? 'Drag the slider to see how one trade would reshape the portfolio.'
            : `Moving ${safeAmount}% from ${from} to ${to} ${Math.abs(fromTiltAfter) < Math.abs(fromTiltBefore) ? 'shrinks' : 'grows'} the ${from} tilt from ${signedPercent(fromTiltBefore, 1)} to ${signedPercent(fromTiltAfter, 1)}, ${after.difference < before.difference ? 'brings the portfolio closer to' : 'moves the portfolio further from'} SCHD, and ${after.beta < before.beta ? 'lowers' : 'raises'} estimated beta from ${before.beta.toFixed(2)} to ${after.beta.toFixed(2)}.`}
        </p>
        <p className="source-note">Estimates use each sector’s current average beta (sectors the club doesn’t own count as 1.0). This is a teaching tool, not a trade recommendation.</p>
      </section>
    </div>
  )
}

function SimMetric({ label, hint, before, after, format, lowerIsCloser }) {
  const delta = after - before
  const changed = Math.abs(delta) > 0.0001
  return (
    <article className="sim-metric">
      <span title={hint}>{label}</span>
      <strong><AnimatedNumber value={after} format={format} duration={450} /></strong>
      <small className={changed ? 'sim-delta' : ''}>{changed ? `${format(before)} now → ${format(after)}${lowerIsCloser ? (delta < 0 ? ' · closer' : ' · further') : ''}` : `${format(before)} now`}</small>
    </article>
  )
}
