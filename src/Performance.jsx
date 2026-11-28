import React, { useState } from 'react'
import { INDEXES, cumulativeFrom, parseSheetDate } from './data'
import { AnimatedNumber, useInView } from './motion'
import { currency } from './live'

const SHORT = { since: 'Since 2016', '5y': '5 years', '1y': '1 year', ytd: 'Year to date' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function niceDate(value) {
  const date = parseSheetDate(value)
  return date ? `${MONTHS[date.m - 1]} ${date.d}, ${date.y}` : value
}

const pct = (value, digits = 2) => (Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%` : '—')
const money = (value) => `${value < 0 ? '−' : ''}${currency.format(Math.abs(value))}`
const signedMoney = (value) => `${value >= 0 ? '+' : '−'}${currency.format(Math.abs(value))}`

// One plain-English sentence comparing the club with the indexes for a period.
export function returnTakeaway(row) {
  const name = row.period === 'since' ? `Since ${niceDate(row.start).split(', ')[1] || 'inception'}` : row.period === 'ytd' ? 'This year' : `Over the last ${{ '5y': 'five years', '1y': 'year' }[row.period] || SHORT[row.period]}`
  const rate = `${row.club.toFixed(2)}%${row.annualized && row.period !== '1y' ? ' a year' : ''}`
  const beat = INDEXES.filter((index) => row.club > row[index.key])
  const trail = INDEXES.filter((index) => row.club <= row[index.key])
  if (!trail.length) return `${name} the club earned ${rate}, ahead of all three indexes.`
  if (!beat.length) return `${name} the club earned ${rate}, behind all three indexes.`
  return `${name} the club earned ${rate}: ahead of the ${beat.map((index) => index.label).join(' and ')}, behind the ${trail.map((index) => index.label).join(' and ')}.`
}

export default function PerformancePanel({ returns, showComparison = true }) {
  const [period, setPeriod] = useState(returns[0]?.period)
  const [view, setView] = useState('rate')
  const [ref, inView] = useInView(0.2)
  const row = returns.find((item) => item.period === period) || returns[0]
  if (!row) return null

  const perYear = row.annualized && row.period !== '1y'
  const entries = [{ key: 'club', label: 'Club portfolio' }, ...INDEXES].map((item) => {
    const rate = row[item.key]
    const total = item.key === 'club' && Number.isFinite(row.cumulative) ? row.cumulative : cumulativeFrom(rate, row)
    return { ...item, rate, total, grown: 1000 * (1 + total / 100) }
  })
  const metric = (entry) => (view === 'rate' ? entry.rate : entry.grown)
  const max = Math.max(...entries.map((entry) => Math.abs(metric(entry))), 0.01)

  return (
    <section className="panel performance" ref={ref}>
      <header className="panel-header">
        <div><span>From the brokerage statement</span><h2>How the portfolio has done</h2></div>
        <div className="segmented" aria-label="Return period">
          {returns.map((item) => (
            <button key={item.period} type="button" className={item.period === row.period ? 'active' : ''} aria-pressed={item.period === row.period} onClick={() => setPeriod(item.period)}>{SHORT[item.period] || item.label}</button>
          ))}
        </div>
      </header>

      <div className="perf-top">
        <div className="perf-headline">
          <span>{row.label || SHORT[row.period]} · rate of return</span>
          <strong className={row.club >= 0 ? 'up' : 'down'}><AnimatedNumber value={row.club} format={(value) => pct(value)} duration={700} start={inView} /></strong>
          <small>{perYear ? `per year (annualized)${Number.isFinite(row.cumulative) ? ` · ${pct(row.cumulative)} in total` : ''}` : 'for the period'}</small>
          {Number.isFinite(row.change) && <p><b className={row.change >= 0 ? 'up' : 'down'}>{signedMoney(row.change)}</b> from investing, not counting money added or withdrawn.</p>}
        </div>
        <Waterfall row={row} inView={inView} />
      </div>

      {showComparison && <div className="perf-compare">
        <div className="perf-compare-head">
          <h3>Compared with the market</h3>
          <div className="segmented small" aria-label="Comparison view">
            <button type="button" className={view === 'rate' ? 'active' : ''} aria-pressed={view === 'rate'} onClick={() => setView('rate')}>{perYear ? 'Per year' : 'Return'}</button>
            <button type="button" className={view === 'grown' ? 'active' : ''} aria-pressed={view === 'grown'} onClick={() => setView('grown')}>Growth of $1,000</button>
          </div>
        </div>
        <div className="perf-bars">
          {entries.map((entry, index) => {
            const value = metric(entry)
            const diff = entry.key === 'club' ? null : row.club - entry.rate
            return (
              <div className={`perf-row ${entry.key === 'club' ? 'club' : ''}`} key={entry.key} style={{ '--delay': `${index * 90}ms` }}>
                <strong>{entry.label}</strong>
                <div className="perf-track"><i style={{ width: inView && Number.isFinite(value) ? `${(Math.abs(value) / max) * 100}%` : 0 }} /></div>
                <b>{view === 'rate' ? pct(entry.rate) : currency.format(entry.grown)}</b>
                <small>{diff === null ? '' : `${diff >= 0 ? 'club +' : 'club −'}${Math.abs(diff).toFixed(2)} pts`}</small>
              </div>
            )
          })}
        </div>
        <p className="perf-takeaway">{returnTakeaway(row)}</p>
      </div>}
      <p className="source-note">
        As of {niceDate(row.end)}, from the club’s brokerage account ({niceDate(row.start)} – {niceDate(row.end)}). Rates of return{showComparison ? ' and index returns' : ''} are as reported by the brokerage{showComparison && view === 'grown' ? '; growth of $1,000 is calculated from them' : ''}. Past results don’t predict future returns.
      </p>
    </section>
  )
}

function Waterfall({ row, inView }) {
  if (![row.beginning, row.net, row.change, row.ending].every(Number.isFinite)) return null
  const top = Math.max(row.beginning, row.beginning + row.net, row.ending, 1)
  const steps = [
    { label: 'Starting value', from: 0, to: row.beginning, kind: 'base', value: money(row.beginning) },
    { label: 'Money added (net)', from: row.beginning, to: row.beginning + row.net, kind: row.net >= 0 ? 'add' : 'sub', value: signedMoney(row.net), note: Number.isFinite(row.contributions) && Number.isFinite(row.withdrawals) ? `${currency.format(row.contributions)} in − ${currency.format(row.withdrawals)} out` : '' },
    { label: 'Investment growth', from: row.beginning + row.net, to: row.ending, kind: row.change >= 0 ? 'gain' : 'sub', value: signedMoney(row.change) },
    { label: 'Ending value', from: 0, to: row.ending, kind: 'end', value: money(row.ending) },
  ]
  return (
    <div className="waterfall" aria-label="Where the ending value came from">
      {steps.map((stepRow, index) => {
        const left = (Math.min(stepRow.from, stepRow.to) / top) * 100
        const width = Math.max((Math.abs(stepRow.to - stepRow.from) / top) * 100, 0.6)
        return (
          <div className="wf-row" key={stepRow.label} style={{ '--delay': `${index * 220}ms` }}>
            <span>{stepRow.label}{stepRow.note && <small>{stepRow.note}</small>}</span>
            <div className="wf-track"><i className={`wf-${stepRow.kind} ${inView ? 'in' : ''}`} style={{ left: `${left}%`, width: `${width}%` }} /></div>
            <b className={stepRow.kind === 'gain' ? 'up' : stepRow.kind === 'sub' ? 'down' : ''}>{stepRow.value}</b>
          </div>
        )
      })}
    </div>
  )
}
