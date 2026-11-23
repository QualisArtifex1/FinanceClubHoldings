import React, { useEffect, useMemo, useRef, useState } from 'react'
import { SECTOR_COLORS } from './data'
import { AnimatedNumber } from './motion'
import { Logo } from './Logo'
import { currency, signedPercent } from './live'
import { INDEXES, numberFrom, riskSentence } from './data'
import { returnTakeaway } from './Performance'

function sectorTilts(summary, benchmark) {
  const benchmarkMap = Object.fromEntries(benchmark.map((row) => [row.sector, row.weight]))
  const portfolio = summary.sectors.filter((sector) => !['Cash', 'Fund'].includes(sector.sector))
  const names = [...new Set([...portfolio.map((sector) => sector.sector), ...benchmark.map((row) => row.sector)])]
  const portfolioMap = Object.fromEntries(portfolio.map((sector) => [sector.sector, sector.weight]))
  return names
    .map((sector) => ({ sector, tilt: (portfolioMap[sector] || 0) - (benchmarkMap[sector] || 0) }))
    .sort((a, b) => Math.abs(b.tilt) - Math.abs(a.tilt))
}

export default function StoryView({ data, summary }) {
  const history = useMemo(() => {
    const rows = data.performance.map((point) => ({ year: point.year, value: point.portfolioValue }))
    if (rows.length) rows[rows.length - 1] = { ...rows.at(-1), value: summary.portfolioValue }
    return rows
  }, [data.performance, summary.portfolioValue])
  const tilts = useMemo(() => sectorTilts(summary, data.benchmark), [summary, data.benchmark])
  const equities = data.holdings.filter((holding) => !['Cash'].includes(holding.sector))

  const first = history[0]
  const peakBeforeDrop = history.reduce((best, point, index) => (index < history.length - 1 && history[index + 1].value < point.value && !best ? { point, next: history[index + 1] } : best), null)
  const dropYear = peakBeforeDrop?.next
  const dropPercent = peakBeforeDrop ? ((peakBeforeDrop.next.value - peakBeforeDrop.point.value) / peakBeforeDrop.point.value) * 100 : 0
  const growthEnd = peakBeforeDrop?.point || history.at(-1)
  const sinceDrop = dropYear ? ((summary.portfolioValue - dropYear.value) / dropYear.value) * 100 : 0
  const largest = equities[0]
  const over = tilts.find((item) => item.tilt > 0)
  const since = (data.returns || []).find((row) => row.period === 'since')
  const under = tilts.find((item) => item.tilt < 0)

  const members = numberFrom(data.settings?.memberCount, null)
  const membersYear = String(data.settings?.memberCountYear || '').trim()
  const foundedYear = first?.year

  const steps = [
    { kicker: `${foundedYear ?? ''} · How it began`, title: 'Founded by a teacher and a student', body: 'The DCC Finance Club was founded by Mr. Cornish, a Latin teacher and former financial advisor, and Steve Lanasky, the club’s first president. Mr. Griffin soon joined as a second teacher moderator.', graphic: 'founders' },
    { kicker: 'Real money, real lessons', title: `It started with ${currency.format(first?.value ?? 0)}`, body: `From the start, the club believed the only way to truly learn about risk and investing is with real money on the line. So members set out to raise as much as they could to fund the club’s first stock. By the end of ${foundedYear}, that effort had grown into a portfolio worth ${currency.format(first?.value ?? 0)}.`, graphic: 'line', upTo: first?.year },
    { kicker: `${first?.year}–${growthEnd?.year}`, title: `Growing to ${currency.format(growthEnd?.value ?? 0)}`, body: 'Part of this growth is new money from contributions, not just investment gains. That’s why a rising balance isn’t the same as a return.', graphic: 'line', upTo: growthEnd?.year },
    { kicker: String(dropYear?.year ?? ''), title: 'The pandemic-era test', body: `The balance fell ${Math.abs(dropPercent).toFixed(1)}% in the market downturn that followed the pandemic, as inflation and rising interest rates hit stocks. Staying invested through a bad year is one of the hardest lessons in investing.`, graphic: 'line', upTo: dropYear?.year, highlight: dropYear?.year },
    { kicker: 'Today', title: `${currency.format(summary.portfolioValue)} and counting`, body: dropYear ? `That’s ${signedPercent(sinceDrop, 0)} since the ${dropYear.year} low.` : 'The latest value from the club’s Sheet.', graphic: 'line', upTo: history.at(-1)?.year },
    ...(since ? [{ kicker: 'Our results', title: `${since.club.toFixed(2)}% a year since ${String(since.start).slice(0, 4)}`, body: data.risk?.maxDrawdown ? `${returnTakeaway(since)} ${riskSentence(data.risk.maxDrawdown)}` : `${returnTakeaway(since)} That rate removes the effect of money added and withdrawn — it’s what the investing itself earned.`, graphic: 'returns' }] : []),
    { kicker: 'What we own', title: `${equities.length} holdings across ${summary.sectors.length} sectors`, body: largest ? `Each logo is sized by its share of the portfolio. The largest stock position is ${largest.symbol} at ${((largest.marketValue / summary.portfolioValue) * 100).toFixed(1)}%.` : '', graphic: 'logos' },
    { kicker: 'Our choices', title: 'Where we differ from SCHD', body: `We lean hardest into ${over?.sector} (${signedPercent(over?.tilt ?? 0, 1)}) and away from ${under?.sector} (${signedPercent(under?.tilt ?? 0, 1)}). Every tilt is a decision the club can explain.`, graphic: 'tilts' },
    ...(Number.isFinite(members) ? [{ kicker: membersYear ? `As of ${membersYear}` : 'Today', title: 'The largest club at Detroit Catholic Central', body: `${foundedYear && membersYear ? `${yearsInWords(Number(membersYear) - foundedYear)} years after its founding, the` : 'The'} club has grown to more than ${members} members, the largest at DCC.`, graphic: 'members' }] : []),
    { kicker: 'Our mission', title: 'Grow the principal, then give back', body: `The club has two goals: grow the money students manage, and use it to help others through tuition assistance and support for the Basilian missions. Alongside the portfolio, a ${currency.format(summary.endowmentValue)} endowment has funded ${currency.format(summary.scholarshipDistributions)} in tuition assistance so far.`, graphic: 'flow' },
  ]

  const [active, setActive] = useState(0)
  const stepRefs = useRef([])
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(Number(entry.target.dataset.index))
      })
    }, { rootMargin: '-45% 0px -45% 0px' })
    stepRefs.current.forEach((element) => element && observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const step = steps[active]
  return (
    <div className="story">
      <div className="story-graphic" aria-hidden="true">
        <div className="story-stage">
          <StoryLine history={history} upTo={step.graphic === 'line' ? step.upTo : history.at(-1)?.year} highlight={step.highlight} visible={step.graphic === 'line'} />
          <StoryLogos holdings={equities} total={summary.portfolioValue} visible={step.graphic === 'logos'} />
          <StoryTilts tilts={tilts.slice(0, 7)} visible={step.graphic === 'tilts'} />
          <StoryFlow summary={summary} visible={step.graphic === 'flow'} />
          <StoryFounders year={foundedYear} visible={step.graphic === 'founders'} />
          {Number.isFinite(members) && <StoryMembers count={members} year={membersYear} visible={step.graphic === 'members'} />}
          {since && <StoryReturns row={since} drawdown={data.risk?.maxDrawdown} visible={step.graphic === 'returns'} />}
        </div>
        <div className="story-progress">{steps.map((item, index) => <i key={item.title} className={index <= active ? 'done' : ''} />)}</div>
      </div>
      <div className="story-steps">
        {steps.map((item, index) => (
          <section key={item.title} data-index={index} ref={(element) => { stepRefs.current[index] = element }} className={`story-step ${active === index ? 'active' : ''}`}>
            <span className="eyebrow">{item.kicker}</span>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </section>
        ))}
        <div className="story-end">
          <a href="#holdings">Explore every holding →</a>
          <a href="#simulator">Try the What-if simulator →</a>
        </div>
      </div>
    </div>
  )
}

function StoryLine({ history, upTo, highlight, visible }) {
  const width = 640
  const height = 320
  const pad = { left: 20, right: 30, top: 30, bottom: 40 }
  const max = Math.max(...history.map((point) => point.value))
  const x = (index) => pad.left + (index / Math.max(history.length - 1, 1)) * (width - pad.left - pad.right)
  const y = (value) => pad.top + (1 - value / max) * (height - pad.top - pad.bottom)
  const limitIndex = Math.max(0, history.findIndex((point) => point.year === upTo))
  const line = history.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.value)}`).join(' ')
  const area = `${line} L${x(history.length - 1)},${height - pad.bottom} L${x(0)},${height - pad.bottom} Z`
  const current = history[limitIndex]
  return (
    <div className={`story-layer story-line-layer ${visible ? 'visible' : ''}`}>
      <div className="story-big">
        <span>{current?.year}</span>
        <strong><AnimatedNumber value={current?.value ?? 0} format={(value) => currency.format(value)} duration={900} /></strong>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="story-line">
        <defs>
          <clipPath id="story-clip"><rect x="0" y="0" height={height} width={x(limitIndex) + 8} className="story-clip-rect" /></clipPath>
          <linearGradient id="story-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--story-accent)" stopOpacity=".32" />
            <stop offset="100%" stopColor="var(--story-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={line} className="story-ghost" />
        <g clipPath="url(#story-clip)">
          <path d={area} fill="url(#story-fill)" />
          <path d={line} className="story-path" />
        </g>
        {history.map((point, index) => (
          <g key={point.year} className={index <= limitIndex ? 'shown' : ''}>
            <circle cx={x(index)} cy={y(point.value)} r={point.year === highlight ? 9 : index === limitIndex ? 7 : 4} className={point.year === highlight ? 'story-dot drop' : 'story-dot'} />
            <text x={x(index)} y={height - 14} textAnchor="middle">{String(point.year).slice(2)}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function StoryLogos({ holdings, total, visible }) {
  return (
    <div className={`story-layer story-logos ${visible ? 'visible' : ''}`}>
      {holdings.map((holding, index) => {
        const size = 34 + Math.sqrt((holding.marketValue / total) * 100) * 22
        return (
          <span key={holding.symbol} className="story-logo" style={{ '--delay': `${index * 35}ms`, '--ring': SECTOR_COLORS[holding.sector] || SECTOR_COLORS.Unknown }}>
            <Logo symbol={holding.symbol} size={size} />
            <small>{holding.symbol}</small>
          </span>
        )
      })}
    </div>
  )
}

function StoryTilts({ tilts, visible }) {
  const max = Math.max(...tilts.map((item) => Math.abs(item.tilt)), 1)
  return (
    <div className={`story-layer story-tilts ${visible ? 'visible' : ''}`}>
      <p className="story-tilt-key"><span>◀ Less than SCHD</span><span>More than SCHD ▶</span></p>
      {tilts.map((item, index) => (
        <div className="story-tilt" key={item.sector} style={{ '--delay': `${index * 80}ms` }}>
          <strong>{item.sector}</strong>
          <div className="story-tilt-track">
            <i className={item.tilt >= 0 ? 'over' : 'under'} style={{ '--w': `${(Math.abs(item.tilt) / max) * 50}%` }} />
          </div>
          <b className={item.tilt >= 0 ? 'tilt-over' : 'tilt-under'}>{signedPercent(item.tilt, 1)}</b>
        </div>
      ))}
    </div>
  )
}

function StoryFlow({ summary, visible }) {
  const money = (value) => (visible ? <AnimatedNumber value={value} format={(number) => currency.format(number)} duration={1200} /> : currency.format(value))
  const link = <svg className="flow-link" viewBox="0 0 40 70" aria-hidden="true"><path d="M20 0 V70" /></svg>
  return (
    <div className={`story-layer story-flow ${visible ? 'visible' : ''}`}>
      <div className="flow-node" style={{ '--delay': '0ms' }}><span>Grow the portfolio</span><strong>{money(summary.portfolioValue)}</strong></div>
      {link}
      <div className="flow-node" style={{ '--delay': '260ms' }}><span>Endowment</span><strong>{money(summary.endowmentValue)}</strong></div>
      {link}
      <div className="flow-give">
        <div className="flow-node give" style={{ '--delay': '520ms' }}><span>Tuition assistance</span><strong>{money(summary.scholarshipDistributions)}</strong><small>given so far</small></div>
        <div className="flow-node give" style={{ '--delay': '700ms' }}><span>Basilian missions</span><strong className="flow-word">Giving goal</strong><small>supporting the Basilian Fathers’ work</small></div>
      </div>
    </div>
  )
}

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty']
function yearsInWords(count) {
  return NUMBER_WORDS[count] || String(count)
}

const FOUNDERS = [
  { initials: 'C', name: 'Mr. Cornish', role: 'Founder & moderator', detail: 'Latin teacher, former financial advisor' },
  { initials: 'SL', name: 'Steve Lanasky', role: 'First club president', detail: 'Founding student leader' },
  { initials: 'G', name: 'Mr. Griffin', role: 'Teacher moderator', detail: 'Joined soon after the founding' },
]

function StoryFounders({ year, visible }) {
  return (
    <div className={`story-layer story-founders ${visible ? 'visible' : ''}`}>
      <div className="founders-head">
        <img src="./dcc-crest.png" alt="" />
        <span>Founded {year}</span>
      </div>
      {FOUNDERS.map((person, index) => (
        <div className="founder" key={person.name} style={{ '--delay': `${200 + index * 220}ms` }}>
          <span className="founder-badge">{person.initials}</span>
          <div>
            <strong>{person.name}</strong>
            <em>{person.role}</em>
            <small>{person.detail}</small>
          </div>
        </div>
      ))}
    </div>
  )
}

function StoryMembers({ count, year, visible }) {
  const dots = Math.min(Math.round(count), 400)
  return (
    <div className={`story-layer story-members ${visible ? 'visible' : ''}`}>
      <div className="members-number">
        <strong>{visible ? <AnimatedNumber value={count} format={(value) => `${Math.round(value)}+`} duration={1600} /> : `${count}+`}</strong>
        <span>members{year ? ` · ${year}` : ''}</span>
      </div>
      <div className="members-dots" aria-hidden="true">
        {Array.from({ length: dots }, (_, index) => <i key={index} style={{ '--delay': `${index * 6}ms` }} />)}
      </div>
      <p className="members-caption">The largest club at Detroit Catholic Central</p>
    </div>
  )
}

function StoryReturns({ row, drawdown, visible }) {
  const entries = [{ key: 'club', label: 'Our club' }, ...INDEXES].map((item) => ({ ...item, rate: row[item.key], drop: drawdown?.[item.key] }))
  const shown = entries.filter((item) => Number.isFinite(item.rate))
  const maxRate = Math.max(...shown.map((item) => item.rate), 1)
  const drops = entries.filter((item) => Number.isFinite(item.drop))
  const maxDrop = Math.max(...drops.map((item) => Math.abs(item.drop)), 1)
  return (
    <div className={`story-layer story-returns ${visible ? 'visible' : ''}`}>
      <p className="story-returns-title">Return per year, {String(row.start).slice(0, 4)}–{String(row.end).slice(0, 4)} <span>higher is better</span></p>
      {shown.map((item, index) => (
        <div className={`story-return ${item.key === 'club' ? 'club' : ''}`} key={item.key} style={{ '--delay': `${index * 120}ms`, '--w': `${(item.rate / maxRate) * 100}%` }}>
          <strong>{item.label}</strong>
          <div className="story-return-track"><i /></div>
          <b>{item.rate.toFixed(2)}%</b>
        </div>
      ))}
      {drops.length > 0 && (
        <>
          <p className="story-returns-title risk">Worst drop, past {drawdown.window || '5 years'} <span>smaller is safer</span></p>
          {drops.map((item, index) => (
            <div className={`story-return drop ${item.key === 'club' ? 'club' : ''}`} key={`${item.key}-drop`} style={{ '--delay': `${600 + index * 120}ms`, '--w': `${(Math.abs(item.drop) / maxDrop) * 100}%` }}>
              <strong>{item.label}</strong>
              <div className="story-return-track"><i /></div>
              <b>{item.drop.toFixed(1)}%</b>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
