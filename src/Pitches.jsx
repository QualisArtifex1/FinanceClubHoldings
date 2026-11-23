import React, { createContext, useContext, useState } from 'react'
import { Logo } from './Logo'

// Pitches come from the Sheet's "Pitches" tab.
export const PitchContext = createContext([])

const DECISION_LABEL = { bought: 'Bought', passed: 'Passed', watching: 'Watching', sold: 'Sold' }

function formatDate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return value
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`
}

function PitchCard({ pitch, onSelect, owned, example }) {
  const [open, setOpen] = useState(false)
  const fields = [['Why now', pitch.whyNow], ['Risks', pitch.risks], ['What would make us sell', pitch.sellTrigger]].filter(([, value]) => value)
  return (
    <article className={`pitch-card ${example ? 'example' : ''}`}>
      <header>
        <Logo symbol={pitch.symbol} size={40} />
        <div>
          <button type="button" className="pitch-symbol" onClick={() => owned && onSelect?.(pitch.symbol)} disabled={!owned}>{pitch.symbol}</button>
          <small>{[formatDate(pitch.date), pitch.analyst && `pitched by ${pitch.analyst}`].filter(Boolean).join(' · ')}</small>
        </div>
        {pitch.decision && <span className={`decision decision-${pitch.decision}`}>{DECISION_LABEL[pitch.decision] || pitch.decision}</span>}
      </header>
      <p className="pitch-thesis">“{pitch.thesis}”</p>
      {fields.length > 0 && (
        <>
          {open && <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
          <button type="button" className="pitch-more" onClick={() => setOpen((value) => !value)}>{open ? 'Show less' : 'Read the full pitch'}</button>
        </>
      )}
      <footer>
        {pitch.nextReview && <span>Next review: {formatDate(pitch.nextReview)}</span>}
        {pitch.link && <a href={pitch.link} target="_blank" rel="noopener noreferrer">Slides / memo ↗</a>}
      </footer>
    </article>
  )
}

const EXAMPLE = {
  symbol: 'TICKER', date: 'Pitch date', analyst: 'analyst initials', decision: 'bought',
  thesis: 'One-sentence thesis: why this company deserves a place in our portfolio.',
  whyNow: 'What has changed that makes now a good time?', risks: 'The three biggest things that could go wrong.', sellTrigger: 'The specific signal that would make us sell.', nextReview: '',
}

export function PitchArchive({ holdings, onSelect }) {
  const pitches = useContext(PitchContext)
  const owned = new Set(holdings.map((holding) => holding.symbol))
  const [filter, setFilter] = useState('all')
  const visible = pitches.filter((pitch) => filter === 'all' || pitch.decision === filter)
  const decisions = ['all', ...new Set(pitches.map((pitch) => pitch.decision).filter(Boolean))]
  return (
    <section className="panel pitch-archive">
      <header className="panel-header">
        <div><span>From the Pitches tab</span><h2>Pitch archive</h2></div>
        {pitches.length > 0 && (
          <div className="segmented" aria-label="Filter pitches">
            {decisions.map((decision) => (
              <button key={decision} type="button" className={filter === decision ? 'active' : ''} aria-pressed={filter === decision} onClick={() => setFilter(decision)}>{decision === 'all' ? 'All' : DECISION_LABEL[decision] || decision}</button>
            ))}
          </div>
        )}
      </header>
      {pitches.length === 0 ? (
        <div className="pitch-empty">
          <p><strong>No pitches yet.</strong> Add a row to the Sheet’s <em>Pitches</em> tab each time someone pitches a stock, and it appears here and in that holding’s details. Here’s how a pitch will look:</p>
          <PitchCard pitch={EXAMPLE} example />
        </div>
      ) : (
        <div className="pitch-grid">{visible.map((pitch) => <PitchCard key={`${pitch.symbol}-${pitch.date}`} pitch={pitch} onSelect={onSelect} owned={owned.has(pitch.symbol)} />)}</div>
      )}
    </section>
  )
}

export function HoldingPitch({ symbol }) {
  const pitches = useContext(PitchContext)
  const pitch = pitches.find((item) => item.symbol === symbol)
  if (!pitch) return <p className="holding-pitch empty">No pitch recorded yet. Add one in the Sheet’s Pitches tab.</p>
  return (
    <div className="holding-pitch">
      <span>The club’s pitch · {formatDate(pitch.date)}{pitch.analyst ? ` · ${pitch.analyst}` : ''}</span>
      <p>“{pitch.thesis}”</p>
      {pitch.sellTrigger && <small><b>Sell if:</b> {pitch.sellTrigger}</small>}
    </div>
  )
}
