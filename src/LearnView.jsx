import React, { useEffect, useMemo, useState } from 'react'
import { SECTOR_COLORS } from './data'
import { AnimatedNumber, useInView } from './motion'
import { Logo } from './Logo'
import { currency, preciseCurrency, signedPercent } from './live'
import DashboardMotion from './DashboardMotion'
import CompoundingMotion from './CompoundingMotion'
import RebalanceMotion from './RebalanceMotion'

const MOTION = { dashboard: DashboardMotion, compounding: CompoundingMotion, rebalancing: RebalanceMotion }

// Built-in lessons. The Sheet's "Videos" tab can change each lesson's title,
// order, length, credit and video (paste a YouTube link) without code changes.
// YouTube plays through youtube-nocookie.com and loads only after Play is clicked.
const BASE_LESSONS = [
  { id: 'stocks', title: 'What is a share of stock?', length: '4:30', summary: 'Owning a share means owning a slice of a real company. See what the club’s slices are worth.', video: { youtube: 'p7HKvqRI_Bo', credit: 'TED-Ed · “How does the stock market work?”' } },
  { id: 'diversification', title: 'Why we don’t put it all in one place', length: '1:38', summary: 'Diversification limits how much one bad sector can hurt. Test it on our portfolio.', video: { youtube: '0zP4yQGAiL4', credit: 'Moneysmart · “What Is Diversification?”' } },
  { id: 'valuation', title: 'Price vs. profit: the P/E ratio', length: '4:15', summary: 'P/E tells you how much investors pay for each $1 of a company’s yearly profit.', video: { youtube: 'J33ObDTsiOU', credit: 'Charles Schwab · “P/E Ratio Basics”' } },
  { id: 'compounding', title: 'How compounding works', length: '1:00', summary: 'Growth that stays invested earns growth of its own. Time turns small amounts into big ones.', video: { motion: 'compounding', credit: 'DCC Finance Club motion graphic' } },
  { id: 'rebalancing', title: 'Why we rebalance', length: '1:00', summary: 'Winners quietly grow into bigger risks. Rebalancing brings the portfolio back to the plan.', video: { motion: 'rebalancing', credit: 'DCC Finance Club motion graphic · uses our live data' } },
  { id: 'dashboard', title: 'Reading our dashboard', length: '1:00', summary: 'Value, cost basis, weight, tilt, and why balance isn’t return — in one minute, using our real numbers.', video: { motion: 'dashboard', credit: 'DCC Finance Club motion graphic · uses our live data' } },
]

export function lessonsFromSheet(rows = []) {
  return BASE_LESSONS
    .map((lesson, index) => {
      const row = rows.find((item) => item.lessonId === lesson.id)
      if (!row) return { ...lesson, order: index + 1 }
      const video = row.youtube
        ? { youtube: row.youtube, credit: row.credit || 'YouTube' }
        : lesson.video.motion ? { motion: lesson.video.motion, credit: row.credit || lesson.video.credit } : { ...lesson.video, credit: row.credit || lesson.video.credit }
      return { ...lesson, title: row.title || lesson.title, length: row.length || lesson.length, video, order: row.order ?? index + 1 }
    })
    .sort((a, b) => a.order - b.order)
}

function readWatched() {
  try {
    return JSON.parse(localStorage.getItem('fc-watched') || '[]')
  } catch {
    return []
  }
}

export default function LearnView({ data, summary, lessonId }) {
  const LESSONS = useMemo(() => lessonsFromSheet(data.videos), [data.videos])
  const [watched, setWatched] = useState(readWatched)
  const [current, setCurrent] = useState(LESSONS.some((lesson) => lesson.id === lessonId) ? lessonId : LESSONS[0].id)
  useEffect(() => {
    if (LESSONS.some((lesson) => lesson.id === lessonId)) setCurrent(lessonId)
  }, [lessonId, LESSONS])
  useEffect(() => {
    try { localStorage.setItem('fc-watched', JSON.stringify(watched)) } catch { /* private mode */ }
  }, [watched])

  const lesson = LESSONS.find((item) => item.id === current)
  const index = LESSONS.indexOf(lesson)
  const done = watched.filter((id) => LESSONS.some((item) => item.id === id)).length
  const toggleWatched = () => setWatched((list) => (list.includes(current) ? list.filter((id) => id !== current) : [...list, current]))

  return (
    <div className="learn">
      <aside className="panel lesson-path">
        <div className="progress-ring" style={{ '--progress': `${(done / LESSONS.length) * 360}deg` }}>
          <span><strong>{done}/{LESSONS.length}</strong>lessons</span>
        </div>
        <ol>
          {LESSONS.map((item, itemIndex) => (
            <li key={item.id}>
              <a href={`#learn/${item.id}`} className={`${item.id === current ? 'current' : ''} ${watched.includes(item.id) ? 'watched' : ''}`} aria-current={item.id === current ? 'step' : undefined}>
                <span className="lesson-num">{watched.includes(item.id) ? '✓' : itemIndex + 1}</span>
                <span><strong>{item.title}</strong><small>{item.length} video · try it</small></span>
              </a>
            </li>
          ))}
        </ol>
      </aside>

      <div className="lesson-main" key={current}>
        <VideoFrame lesson={lesson} number={index + 1} data={data} summary={summary} />
        <div className="lesson-head">
          <div>
            <span className="eyebrow">Lesson {index + 1}</span>
            <h2>{lesson.title}</h2>
            <p>{lesson.summary}</p>
          </div>
          <button type="button" className={`watch-toggle ${watched.includes(current) ? 'on' : ''}`} onClick={toggleWatched}>
            {watched.includes(current) ? '✓ Watched' : 'Mark as watched'}
          </button>
        </div>
        <section className="panel try-it">
          <header className="panel-header"><div><span>Try it with our portfolio</span><h2>{tryTitle(current)}</h2></div></header>
          {current === 'stocks' && <SharesCheck holdings={data.holdings} />}
          {current === 'diversification' && <DiversificationExplainer holdings={data.holdings} summary={summary} />}
          {current === 'valuation' && <PeBars holdings={data.holdings} />}
          {current === 'compounding' && <CompoundCalculator />}
          {current === 'rebalancing' && <RebalanceCheck summary={summary} />}
          {current === 'dashboard' && <TiltCheck summary={summary} benchmark={data.benchmark} />}
        </section>
        {index < LESSONS.length - 1 && <a className="next-lesson" href={`#learn/${LESSONS[index + 1].id}`}>Next: {LESSONS[index + 1].title} →</a>}
      </div>
    </div>
  )
}

function tryTitle(id) {
  return {
    stocks: 'Quick check: what is a position worth?',
    diversification: 'Shock one sector and watch the portfolio',
    valuation: 'Compare P/E across our holdings',
    compounding: 'Build your own compounding curve',
    rebalancing: 'Set a sector cap and rebalance our portfolio',
    dashboard: 'Quick check: read the benchmark',
  }[id]
}

function VideoFrame({ lesson, number, data, summary }) {
  const [playing, setPlaying] = useState(false)
  if (playing && lesson.video?.youtube) {
    return (
      <figure className="video-shell">
        <div className="video-frame playing">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${lesson.video.youtube}?autoplay=1&rel=0&modestbranding=1&cc_load_policy=1`}
            title={lesson.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        <figcaption>Video: {lesson.video.credit}</figcaption>
      </figure>
    )
  }
  if (playing && lesson.video?.motion) {
    const Motion = MOTION[lesson.video.motion] || DashboardMotion
    return (
      <figure className="video-shell">
        <Motion data={data} summary={summary} />
        <figcaption>{lesson.video.credit}</figcaption>
      </figure>
    )
  }
  return (
    <div className={`video-frame ${playing ? 'playing' : ''}`}>
      <svg className="video-art" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path className="va va-1" d="M0 360 C120 330 200 380 320 300 S520 260 600 200 S740 120 800 90" />
        <path className="va va-2" d="M0 400 C160 380 260 410 380 350 S560 320 660 260 S760 220 800 200" />
        <g className="va-bars">{[0, 1, 2, 3, 4, 5, 6].map((bar) => <rect key={bar} x={480 + bar * 42} y={450 - (60 + bar * 32)} width="26" height={60 + bar * 32} rx="4" style={{ animationDelay: `${bar * 120}ms` }} />)}</g>
      </svg>
      <div className="video-title">
        <span>Lesson {number} · {lesson.length}</span>
        <strong>{lesson.title}</strong>
      </div>
      {!playing ? (
        <button type="button" className="play-button" onClick={() => setPlaying(true)} aria-label={`Play ${lesson.title}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        </button>
      ) : (
        <div className="video-placeholder" role="status">
          <strong>Your video plays here</strong>
          <span>In the real site this is the club’s YouTube video for this lesson, added by pasting its link into a “Videos” tab in the Sheet.</span>
          <button type="button" onClick={() => setPlaying(false)}>Back</button>
        </div>
      )}
    </div>
  )
}

function QuickCheck({ question, options, answer, explanation }) {
  const [picked, setPicked] = useState(null)
  return (
    <div className="quick-check">
      <p className="qc-question">{question}</p>
      <div className="qc-options">
        {options.map((option, index) => {
          const state = picked === null ? '' : index === answer ? 'correct' : index === picked ? 'wrong' : 'dim'
          return (
            <button type="button" key={option} className={state} onClick={() => setPicked(index)} disabled={picked !== null}>
              {option}
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <div className={`qc-feedback ${picked === answer ? 'good' : 'bad'}`} role="status">
          <strong>{picked === answer ? 'Nice — that’s right.' : 'Not quite.'}</strong> {explanation}
          <button type="button" onClick={() => setPicked(null)}>Try again</button>
        </div>
      )}
    </div>
  )
}

function SharesCheck({ holdings }) {
  const holding = holdings.find((item) => item.symbol !== 'CASH' && item.quantity >= 5) || holdings[0]
  const value = holding.quantity * holding.price
  const round = (number) => Math.round(number / 100) * 100
  const options = [value * 0.1, value, value * 3.2, holding.price].map(round).map((number) => currency.format(number))
  return (
    <div className="shares-check">
      <div className="share-visual">
        <Logo symbol={holding.symbol} size={56} />
        <div>
          <strong>{holding.name}</strong>
          <span>{Math.round(holding.quantity)} shares × {preciseCurrency.format(holding.price)}</span>
        </div>
      </div>
      <QuickCheck
        question={`The club owns ${Math.round(holding.quantity)} shares of ${holding.symbol} at ${preciseCurrency.format(holding.price)} each. About how much is the position worth?`}
        options={options}
        answer={1}
        explanation={`Shares × price = ${currency.format(value)}. That’s the “market value” column on the Holdings page.`}
      />
    </div>
  )
}

function DiversificationExplainer({ holdings, summary }) {
  const sectors = summary.sectors.filter((sector) => !['Cash', 'Fund'].includes(sector.sector)).map((sector) => sector.sector)
  const [sector, setSector] = useState(sectors[0])
  const [shocked, setShocked] = useState(false)
  const [ref, inView] = useInView(0.2)
  const weight = summary.sectors.find((item) => item.sector === sector)?.weight || 0
  const hit = shocked ? -(weight * 0.2) : 0
  const total = summary.portfolioValue
  return (
    <div className="diversify" ref={ref}>
      <div className="diversify-controls">
        <label>
          <span>If this sector falls 20%</span>
          <select value={sector} onChange={(event) => { setSector(event.target.value); setShocked(false) }}>
            {sectors.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <button type="button" className={shocked ? 'reset' : ''} onClick={() => setShocked((value) => !value)}>{shocked ? 'Reset' : 'Run the shock'}</button>
      </div>
      <div className="bubble-field">
        {holdings.filter((holding) => holding.symbol !== 'CASH').map((holding, index) => {
          const size = 26 + Math.sqrt((holding.marketValue / total) * 100) * 18
          const hitHere = shocked && holding.sector === sector
          return (
            <span
              key={holding.symbol}
              className={`bubble ${inView ? 'in' : ''} ${hitHere ? 'hit' : ''} ${shocked && !hitHere ? 'safe' : ''}`}
              style={{ width: size, height: size, '--c': SECTOR_COLORS[holding.sector] || SECTOR_COLORS.Unknown, '--delay': `${index * 25}ms` }}
              title={`${holding.symbol} · ${holding.sector}`}
            >
              {size > 40 && holding.symbol}
            </span>
          )
        })}
      </div>
      <div className="diversify-readout">
        <div>
          <span>Our diversified portfolio</span>
          <strong className={hit < 0 ? 'negative' : ''}><AnimatedNumber value={hit} format={(value) => signedPercent(value, 1)} duration={800} /></strong>
          <small>{sector} is {weight.toFixed(1)}% of the portfolio</small>
        </div>
        <div>
          <span>A portfolio of only {sector}</span>
          <strong className={shocked ? 'negative' : ''}><AnimatedNumber value={shocked ? -20 : 0} format={(value) => signedPercent(value, 1)} duration={800} /></strong>
          <small>Takes the full hit</small>
        </div>
      </div>
      {shocked && <p className="diversify-note">Same bad news, much smaller damage: {currency.format((Math.abs(hit) / 100) * total)} instead of {currency.format(total * 0.2)}. That’s diversification.</p>}
    </div>
  )
}

function PeBars({ holdings }) {
  const list = holdings.filter((holding) => Number.isFinite(holding.pe) && holding.pe > 0 && holding.pe < 150).sort((a, b) => a.pe - b.pe)
  const [selected, setSelected] = useState(list[Math.floor(list.length / 2)]?.symbol)
  const [ref, inView] = useInView(0.2)
  const max = Math.max(...list.map((holding) => holding.pe), 1)
  const pick = list.find((holding) => holding.symbol === selected)
  return (
    <div className="pe" ref={ref}>
      {pick && (
        <p className="pe-callout">
          <Logo symbol={pick.symbol} size={28} />
          <span>Investors pay <strong>{currency.format(pick.pe)}</strong> for every <strong>$1</strong> of {pick.name}’s yearly profit.</span>
        </p>
      )}
      <div className="pe-bars">
        {list.map((holding, index) => (
          <button type="button" key={holding.symbol} className={holding.symbol === selected ? 'selected' : ''} onClick={() => setSelected(holding.symbol)} style={{ '--delay': `${index * 30}ms` }} aria-label={`${holding.symbol} P/E ${holding.pe.toFixed(1)}`}>
            <i style={{ height: inView ? `${(holding.pe / max) * 100}%` : 0 }} />
            <span>{holding.symbol}</span>
          </button>
        ))}
      </div>
      <p className="source-note">Lower P/E can mean “cheap” — or that investors expect slower growth. Click a bar to compare.</p>
    </div>
  )
}

function TiltCheck({ summary, benchmark }) {
  const map = Object.fromEntries(benchmark.map((row) => [row.sector, row.weight]))
  const tilts = summary.sectors
    .filter((sector) => !['Cash', 'Fund'].includes(sector.sector))
    .map((sector) => ({ sector: sector.sector, tilt: sector.weight - (map[sector.sector] || 0) }))
    .sort((a, b) => b.tilt - a.tilt)
  const options = useMemo(() => {
    const picks = [tilts[0], tilts.at(-1), tilts[Math.floor(tilts.length / 2)], tilts[1]].filter(Boolean)
    const unique = [...new Map(picks.map((item) => [item.sector, item])).values()]
    return unique.sort((a, b) => a.sector.localeCompare(b.sector))
  }, [summary, benchmark]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <QuickCheck
      question="Compared with SCHD, which sector is the club most overweight in?"
      options={options.map((item) => item.sector)}
      answer={options.findIndex((item) => item.sector === tilts[0]?.sector)}
      explanation={`${tilts[0]?.sector} is ${signedPercent(tilts[0]?.tilt ?? 0, 1)} versus SCHD. You can see every tilt on the Benchmark page.`}
    />
  )
}

function CompoundCalculator() {
  const [amount, setAmount] = useState(1000)
  const [rate, setRate] = useState(7)
  const [years, setYears] = useState(40)
  const [ref, inView] = useInView(0.2)
  const final = amount * (1 + rate / 100) ** years
  const growth = final - amount
  const marks = Array.from({ length: Math.min(10, years) }, (_, index) => Math.round(((index + 1) / Math.min(10, years)) * years))
  const max = final
  return (
    <div className="compound" ref={ref}>
      <div className="compound-controls">
        <label><span>Invest once</span><strong>{currency.format(amount)}</strong><input type="range" min="100" max="10000" step="100" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label>
        <label><span>Growth per year</span><strong>{rate}%</strong><input type="range" min="1" max="12" step="0.5" value={rate} onChange={(event) => setRate(Number(event.target.value))} /></label>
        <label><span>Years invested</span><strong>{years}</strong><input type="range" min="1" max="50" value={years} onChange={(event) => setYears(Number(event.target.value))} /></label>
      </div>
      <div className="compound-result">
        <div><span>You’d have</span><strong><AnimatedNumber value={final} format={(value) => currency.format(value)} duration={500} /></strong></div>
        <div><span>You put in</span><strong className="c-in">{currency.format(amount)}</strong></div>
        <div><span>Compounding added</span><strong className="c-growth"><AnimatedNumber value={growth} format={(value) => currency.format(value)} duration={500} /></strong></div>
        <div><span>Rule of 72</span><strong>{(72 / rate).toFixed(1)} yrs</strong><small>to double</small></div>
      </div>
      <div className="compound-bars" aria-hidden="true">
        {marks.map((year, index) => {
          const value = amount * (1 + rate / 100) ** year
          return (
            <div key={year} style={{ '--delay': `${index * 40}ms` }}>
              <i style={{ height: inView ? `${(value / max) * 100}%` : 0 }}><b style={{ height: `${(amount / value) * 100}%` }} /></i>
              <span>{year}y</span>
            </div>
          )
        })}
      </div>
      <p className="source-note">A steady rate is a simplification: real markets go up and down, and returns aren’t guaranteed.</p>
    </div>
  )
}

function rebalanceToCap(weights, cap) {
  const result = { ...weights }
  for (let pass = 0; pass < 10; pass += 1) {
    const over = Object.keys(result).filter((key) => result[key] > cap + 1e-9)
    if (!over.length) break
    const excess = over.reduce((sum, key) => sum + (result[key] - cap), 0)
    over.forEach((key) => { result[key] = cap })
    const room = Object.keys(result).filter((key) => result[key] < cap - 1e-9)
    const roomTotal = room.reduce((sum, key) => sum + result[key], 0)
    if (!room.length || !roomTotal) break
    room.forEach((key) => { result[key] += excess * (result[key] / roomTotal) })
  }
  return result
}

function RebalanceCheck({ summary }) {
  const sectors = summary.sectors.filter((sector) => !['Cash', 'Fund'].includes(sector.sector))
  const investable = sectors.reduce((sum, sector) => sum + sector.weight, 0)
  const weights = Object.fromEntries(sectors.map((sector) => [sector.sector, (sector.weight / investable) * 100]))
  const [cap, setCap] = useState(20)
  const [done, setDone] = useState(false)
  const target = rebalanceToCap(weights, cap)
  const shown = done ? target : weights
  const dollars = (summary.portfolioValue * investable) / 100
  const over = sectors.filter((sector) => weights[sector.sector] > cap + 0.05)
  const sold = over.reduce((sum, sector) => sum + (weights[sector.sector] - target[sector.sector]), 0)
  const max = Math.max(...Object.values(weights), cap) * 1.1
  return (
    <div className="rebalance">
      <div className="rebalance-controls">
        <label><span>Max weight per sector</span><strong>{cap}%</strong><input type="range" min="10" max="30" value={cap} onChange={(event) => { setCap(Number(event.target.value)); setDone(false) }} /></label>
        <button type="button" onClick={() => setDone((value) => !value)} disabled={!over.length}>{done ? 'Undo' : over.length ? 'Rebalance' : 'Nothing to rebalance'}</button>
      </div>
      <div className="rebalance-bars">
        <i className="cap-line" style={{ left: `calc((100% - 66px) * ${cap / max})` }}><span>cap {cap}%</span></i>
        {sectors.map((sector) => {
          const isOver = weights[sector.sector] > cap + 0.05
          return (
            <div className={`rb-row ${isOver ? 'over' : ''} ${done ? 'done' : ''}`} key={sector.sector}>
              <strong>{sector.sector}</strong>
              <div className="rb-track"><i style={{ width: `${(shown[sector.sector] / max) * 100}%`, background: SECTOR_COLORS[sector.sector] || SECTOR_COLORS.Unknown }} /></div>
              <b>{shown[sector.sector].toFixed(1)}%</b>
            </div>
          )
        })}
      </div>
      <p className="sim-takeaway">
        {!over.length
          ? `No sector is above ${cap}%. Try a lower cap.`
          : done
            ? `Sold about ${currency.format((sold / 100) * dollars)} from ${over.map((sector) => sector.sector).join(' and ')}, and spread it across the other sectors in proportion to their size.`
            : `${over.map((sector) => `${sector.sector} (${weights[sector.sector].toFixed(1)}%)`).join(', ')} ${over.length === 1 ? 'is' : 'are'} over the ${cap}% cap. Press Rebalance to trim back to the plan.`}
      </p>
      <p className="source-note">Weights here exclude cash and funds. Real rebalancing also weighs trading costs and taxes, and the club decides together.</p>
    </div>
  )
}
