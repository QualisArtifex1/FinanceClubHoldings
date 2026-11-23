import React, { useMemo } from 'react'
import MotionPlayer, { GOLD, GREEN, Headline, LIGHT_BLUE, Label, Recap, SANS, SERIF, TitleCard, clamp, easeBack, money, step } from './MotionPlayer'

// "How compounding works": a 60-second motion graphic. Uses an illustrative
// $1,000 at 7% a year (not a forecast).

const START = 1000
const RATE = 0.07
const grow = (years) => START * (1 + RATE) ** years

export default function CompoundingMotion() {
  const scenes = useMemo(buildScenes, [])
  return <MotionPlayer scenes={scenes} label="How compounding works, 60-second motion graphic" note="Example: $1,000 at 7% a year. Real returns vary." />
}

function buildScenes() {
  return [
    { id: 'title', chapter: 'Intro', start: 0, end: 5, captions: ['How does $1,000 turn into $15,000 without adding a penny? Compounding.'], render: (p) => <TitleCard p={p} title="How compounding works" icon={<text y="34" textAnchor="middle" fill={GOLD} fontFamily={SERIF} fontSize="110" fontWeight="700">%</text>} /> },
    { id: 'simple', chapter: 'Simple growth', start: 5, end: 15, captions: ['Imagine $1,000 earning 7% a year. If you only earned on the original $1,000, you’d get the same $70 every year.', 'After 10 years: $1,700.'], render: (p) => <GrowthBars p={p} compound={false} /> },
    { id: 'compound', chapter: 'Growth on growth', start: 15, end: 27, captions: ['With compounding, last year’s growth stays invested — so it earns growth too.', 'Each year’s gain is a little bigger than the last. After 10 years: $1,967 instead of $1,700.'], render: (p) => <GrowthBars p={p} compound /> },
    { id: 'time', chapter: 'Time does the work', start: 27, end: 38, captions: ['The real magic is time. The curve starts slow…', '…then bends upward. In 40 years, $1,000 becomes almost $15,000.'], render: (p) => <Curve p={p} /> },
    { id: 'rule72', chapter: 'Rule of 72', start: 38, end: 48, captions: ['A handy shortcut: divide 72 by the growth rate to find how long it takes to double.', '72 ÷ 7 ≈ 10 years. So every 10 years, the money roughly doubles.'], render: (p) => <Doubling p={p} /> },
    { id: 'early', chapter: 'Start early', start: 48, end: 55, captions: ['That’s why starting early matters so much.', 'The same $1,000 invested at 15 instead of 25 grows to about twice as much by 65.'], render: (p) => <StartEarly p={p} /> },
    { id: 'recap', chapter: 'Recap', start: 55, end: 60, captions: ['Keep growth invested, give it time, and let compounding do the heavy lifting.'], render: (p) => <Recap p={p} title="Compounding in three ideas" items={['Growth earns more growth', 'Time matters most', 'Rule of 72: years to double']} /> },
  ]
}

function GrowthBars({ p, compound }) {
  const years = 10
  const base = 700
  const scale = 330 / grow(10)
  const width = 90
  const gap = 26
  const x0 = 800 - (years * (width + gap) - gap) / 2
  const final = compound ? grow(years) : START * (1 + RATE * years)
  const shown = Math.min(years, Math.floor(step(p, 0.05, 0.75) * years + 0.0001))
  const partial = step(p, 0.05, 0.75) * years - shown
  return (
    <g>
      <Label y={170}>{compound ? 'GROWTH EARNS GROWTH' : 'SAME $70 EVERY YEAR'}</Label>
      <line x1={x0 - 20} x2={x0 + years * (width + gap)} y1={base} y2={base} stroke="rgba(255,255,255,.35)" strokeWidth="3" />
      {Array.from({ length: years }, (_, index) => {
        const year = index + 1
        const total = compound ? grow(year) : START * (1 + RATE * year)
        const lastYearGain = compound ? grow(year) - grow(year - 1) : START * RATE
        const show = year <= shown ? 1 : year === shown + 1 ? partial : 0
        const x = x0 + index * (width + gap)
        const baseH = START * scale * Math.min(1, show * 3)
        const earlierGain = (total - START - lastYearGain) * scale
        const newGain = lastYearGain * scale * show
        return (
          <g key={year} opacity={show > 0 ? 1 : 0.15}>
            <rect x={x} y={base - baseH} width={width} height={baseH} rx="6" fill="url(#mg-blue)" />
            <rect x={x} y={base - START * scale - earlierGain} width={width} height={Math.max(earlierGain, 0)} fill="rgba(255,194,13,.55)" />
            <rect x={x} y={base - START * scale - earlierGain - newGain} width={width} height={newGain} rx="4" fill={GOLD} />
            {compound && year > 1 && show > 0.6 && <rect x={x} y={base - (START * (1 + RATE * year)) * scale} width={width} height="3" fill="#fff" opacity=".7" />}
            <text x={x + width / 2} y={base + 36} textAnchor="middle" fill="rgba(255,255,255,.7)" fontFamily={SANS} fontSize="22">{`Yr ${year}`}</text>
          </g>
        )
      })}
      <g opacity={step(p, 0.72, 0.85)}>
        <Headline x={x0 + years * (width + gap) - gap} y={base - final * scale - 30} anchor="end" size={56} fill={compound ? GREEN : GOLD}>{money.format(final)}</Headline>
      </g>
      <g transform={`translate(${x0} 245)`} opacity={step(p, 0.1, 0.25)}>
        <rect width="22" height="22" rx="4" fill="#3d8bff" /><text x="32" y="19" fill="#fff" fontFamily={SANS} fontSize="22" fontWeight="700">Original $1,000</text>
        <rect x="240" width="22" height="22" rx="4" fill={GOLD} /><text x="272" y="19" fill="#fff" fontFamily={SANS} fontSize="22" fontWeight="700">Growth</text>
        {compound && <><rect x="400" y="9" width="22" height="4" fill="#fff" /><text x="432" y="19" fill="#fff" fontFamily={SANS} fontSize="22" fontWeight="700">Simple growth, for comparison</text></>}
      </g>
    </g>
  )
}

function Curve({ p }) {
  const x0 = 220
  const x1 = 1380
  const yBase = 680
  const top = 200
  const maxValue = grow(40)
  const x = (year) => x0 + (year / 40) * (x1 - x0)
  const y = (value) => yBase - (value / maxValue) * (yBase - top)
  const path = Array.from({ length: 81 }, (_, index) => index / 2).map((year, index) => `${index ? 'L' : 'M'}${x(year)},${y(grow(year))}`).join(' ')
  const reveal = step(p, 0.05, 0.85)
  const nowYear = 40 * reveal
  const markers = [10, 20, 30, 40]
  return (
    <g>
      <line x1={x0} x2={x1} y1={yBase} y2={yBase} stroke="rgba(255,255,255,.35)" strokeWidth="3" />
      <clipPath id="mg-curve-clip"><rect x={x0 - 10} y="0" width={(x1 - x0) * reveal + 20} height="900" /></clipPath>
      <g clipPath="url(#mg-curve-clip)">
        <path d={`${path} L${x1},${yBase} L${x0},${yBase} Z`} fill="rgba(76,199,122,.18)" />
        <path d={path} fill="none" stroke={GREEN} strokeWidth="6" strokeLinecap="round" />
      </g>
      <circle cx={x(nowYear)} cy={y(grow(nowYear))} r="12" fill={GREEN} stroke="#fff" strokeWidth="4" />
      {markers.map((year) => (
        <g key={year} opacity={nowYear >= year - 0.2 ? 1 : 0}>
          <line x1={x(year)} x2={x(year)} y1={yBase} y2={y(grow(year))} stroke="rgba(255,255,255,.3)" strokeDasharray="6 6" />
          <text x={x(year)} y={y(grow(year)) - 24} textAnchor="middle" fill="#fff" fontFamily={SERIF} fontSize="36" fontWeight="700">{money.format(grow(year))}</text>
          <text x={x(year)} y={yBase + 40} textAnchor="middle" fill="rgba(255,255,255,.7)" fontFamily={SANS} fontSize="24" fontWeight="700">{`${year} yrs`}</text>
        </g>
      ))}
      <text x={x0} y={yBase + 40} textAnchor="middle" fill="rgba(255,255,255,.7)" fontFamily={SANS} fontSize="24" fontWeight="700">Start</text>
      <Headline x={x0} y={180} anchor="start" size={80}>{money.format(grow(nowYear))}</Headline>
      <Label x={x0} y={220} anchor="start" size={22}>{`AFTER ${Math.floor(nowYear)} YEARS`}</Label>
    </g>
  )
}

function Doubling({ p }) {
  const steps = [0, 10, 20, 30, 40]
  return (
    <g>
      <g opacity={step(p, 0, 0.2)}>
        <Headline y={210} size={76}>
          <tspan fill={GOLD}>72</tspan><tspan fill="rgba(255,255,255,.7)">{' ÷ '}</tspan><tspan>7%</tspan><tspan fill="rgba(255,255,255,.7)">{' ≈ '}</tspan><tspan fill={GREEN}>10 years</tspan>
        </Headline>
        <Label y={260} size={22}>TO DOUBLE YOUR MONEY</Label>
      </g>
      {steps.map((year, index) => {
        const show = step(p, 0.25 + index * 0.1, 0.4 + index * 0.1)
        const value = START * 2 ** index
        const radius = 34 * Math.sqrt(2 ** index)
        const x = 230 + index * 285
        return (
          <g key={year} opacity={show} transform={`translate(${x} 520) scale(${0.4 + 0.6 * easeBack(clamp(show))})`}>
            {index > 0 && <path d={`M${-285 + 34 * Math.sqrt(2 ** (index - 1)) + 14} 0 H${-radius - 14}`} stroke="rgba(255,255,255,.5)" strokeWidth="4" strokeDasharray="8 8" />}
            <circle r={radius} fill="url(#mg-gold)" />
            <text y="10" textAnchor="middle" fill="#3b2a00" fontFamily={SANS} fontSize="28" fontWeight="900">{`$${value / 1000}k`}</text>
            <text y={radius + 44} textAnchor="middle" fill="rgba(255,255,255,.8)" fontFamily={SANS} fontSize="24" fontWeight="700">{year === 0 ? 'Start' : `~${year} yrs`}</text>
          </g>
        )
      })}
      <text x="800" y="740" textAnchor="middle" fill="rgba(255,255,255,.6)" fontFamily={SANS} fontSize="22" opacity={step(p, 0.75, 0.9)}>It’s a shortcut: the exact 40-year result is {money.format(grow(40))}.</text>
    </g>
  )
}

function StartEarly({ p }) {
  const early = grow(50)
  const late = grow(40)
  const maxW = 900
  const rows = [
    ['Invest $1,000 at 15', early, GREEN, 0],
    ['Invest $1,000 at 25', late, LIGHT_BLUE, 0.15],
  ]
  return (
    <g>
      <Label y={220}>VALUE AT AGE 65</Label>
      {rows.map(([label, value, color, delay], index) => {
        const grown = step(p, 0.1 + delay, 0.6 + delay)
        const y = 320 + index * 170
        return (
          <g key={label}>
            <text x="230" y={y - 18} fill="#fff" fontFamily={SANS} fontSize="30" fontWeight="800">{label}</text>
            <rect x="230" y={y} width={(value / early) * maxW * grown} height="80" rx="12" fill={color} />
            <text x={240 + (value / early) * maxW * grown + 20} y={y + 56} fill="#fff" fontFamily={SERIF} fontSize="50" fontWeight="700">{money.format(value * grown)}</text>
          </g>
        )
      })}
      <Headline y={700} size={48} fill={GOLD} opacity={step(p, 0.7, 0.85)}>10 years earlier ≈ twice the money</Headline>
    </g>
  )
}
