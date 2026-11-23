import React, { useMemo } from 'react'
import MotionPlayer, { BLUE, GOLD, GREEN, Headline, LIGHT_BLUE, Label, RED, Recap, SANS, SERIF, TitleCard, clamp, easeBack, signed, step } from './MotionPlayer'

// "Why we rebalance": a 60-second motion graphic. Scenes 1–4 use a simple
// four-sector example; scene 5 uses the club's live sector weights vs SCHD.

const BUCKETS = ['Tech', 'Health Care', 'Staples', 'Energy']
const COLORS = ['#3d8bff', '#ff8a8a', '#e0b56e', '#6fe39a']
const PLAN = 25
const TECH_GROWTH = 0.6
const TECH_DROP = 0.3
const drifted = (() => {
  const values = [PLAN * (1 + TECH_GROWTH), PLAN, PLAN, PLAN]
  const total = values.reduce((sum, value) => sum + value, 0)
  return values.map((value) => (value / total) * 100)
})()

export default function RebalanceMotion({ data, summary }) {
  const club = useMemo(() => clubFacts(data, summary), [data, summary])
  const scenes = useMemo(() => buildScenes(club), [club])
  return <MotionPlayer scenes={scenes} label="Why we rebalance, 60-second motion graphic" note="Scenes 1–4 use example numbers." />
}

function clubFacts(data, summary) {
  const schd = Object.fromEntries(data.benchmark.map((row) => [row.sector, row.weight]))
  const sectors = summary.sectors
    .filter((sector) => !['Cash', 'Fund'].includes(sector.sector))
    .slice(0, 5)
    .map((sector) => ({ sector: sector.sector, weight: sector.weight, schd: schd[sector.sector] || 0 }))
  const biggest = [...sectors].sort((a, b) => (b.weight - b.schd) - (a.weight - a.schd))[0]
  return { sectors, biggest }
}

function buildScenes(club) {
  const sell = drifted[0] - PLAN
  const buy = (PLAN * 4 - PLAN - drifted.slice(1).reduce((sum, value) => sum + value, 0)) / 3
  return [
    { id: 'title', chapter: 'Intro', start: 0, end: 5, captions: ['Why would a club sell some of its best-performing stocks? Let’s find out.'], render: (p) => <TitleCard p={p} title="Why we rebalance" icon={<path d="M-50 -10 a55 55 0 0 1 95 -25 l8 -20 M50 10 a55 55 0 0 1 -95 25 l-8 20" fill="none" stroke={GOLD} strokeWidth="12" strokeLinecap="round" />} /> },
    { id: 'plan', chapter: 'Set a plan', start: 5, end: 15, captions: ['Start with a plan. Say we want our money split evenly: 25% in each of four sectors.', 'That target is a choice about how much risk we want in any one place.'], render: (p) => <Buckets p={p} from={[0, 0, 0, 0]} to={[PLAN, PLAN, PLAN, PLAN]} title="OUR PLAN: 25% EACH" /> },
    { id: 'drift', chapter: 'Winners drift', start: 15, end: 26, captions: ['Then tech has a great year and grows 60%. Everything else stays flat.', `Without us buying a single share, tech is now ${drifted[0].toFixed(0)}% of the portfolio. That’s called drift.`], render: (p) => <Buckets p={p} from={[PLAN, PLAN, PLAN, PLAN]} to={drifted} title="AFTER TECH GROWS 60%" badge="Tech +60%" /> },
    { id: 'risk', chapter: 'Hidden risk', start: 26, end: 36, captions: ['Drift quietly adds risk. If tech then falls 30%…', `…the drifted portfolio loses ${(drifted[0] * TECH_DROP).toFixed(1)}%, versus ${(PLAN * TECH_DROP).toFixed(1)}% if we had stayed on plan.`], render: (p) => <RiskCompare p={p} /> },
    { id: 'rebalance', chapter: 'Trim and refill', start: 36, end: 47, captions: [`Rebalancing fixes it: sell about ${sell.toFixed(0)}% of the portfolio’s tech, and buy about ${buy.toFixed(0)}% of each other sector.`, 'Back to the plan — and we sold some of what went up and bought what lagged.'], render: (p) => <Buckets p={p} from={drifted} to={[PLAN, PLAN, PLAN, PLAN]} title="BACK TO 25% EACH" arrows /> },
    { id: 'club', chapter: 'Our portfolio', start: 47, end: 55, captions: ['Now look at our real portfolio next to SCHD.', `${club.biggest?.sector} is ${club.biggest?.weight.toFixed(1)}% of our portfolio, versus ${club.biggest?.schd.toFixed(1)}% for SCHD. Is that our plan — or drift?`], render: (p) => <ClubDrift p={p} club={club} /> },
    { id: 'recap', chapter: 'Recap', start: 55, end: 60, captions: ['Set a target, watch for drift, and rebalance on purpose — then talk it through as a club.'], render: (p) => <Recap p={p} title="Rebalancing in four steps" items={['Set a target mix', 'Watch for drift', 'Trim winners, refill laggards', 'Decide together as a club']} /> },
  ]
}

function Buckets({ p, from, to, title, badge, arrows }) {
  const move = step(p, 0.15, 0.65)
  const base = 650
  const unit = 9.5
  const width = 180
  const gap = 90
  const x0 = 800 - (4 * width + 3 * gap) / 2
  return (
    <g>
      <Label y={170}>{title}</Label>
      <line x1={x0 - 40} x2={x0 + 4 * width + 3 * gap + 40} y1={base - PLAN * unit} y2={base - PLAN * unit} stroke={GOLD} strokeWidth="3" strokeDasharray="12 10" opacity=".8" />
      <text x={x0 + 4 * width + 3 * gap + 50} y={base - PLAN * unit + 8} fill={GOLD} fontFamily={SANS} fontSize="22" fontWeight="800">plan 25%</text>
      <line x1={x0 - 40} x2={x0 + 4 * width + 3 * gap + 40} y1={base} y2={base} stroke="rgba(255,255,255,.35)" strokeWidth="3" />
      {BUCKETS.map((name, index) => {
        const value = from[index] + (to[index] - from[index]) * move
        const x = x0 + index * (width + gap)
        const change = to[index] - from[index]
        return (
          <g key={name}>
            <rect x={x} y={base - value * unit} width={width} height={value * unit} rx="10" fill={COLORS[index]} />
            <text x={x + width / 2} y={base - value * unit - 18} textAnchor="middle" fill="#fff" fontFamily={SERIF} fontSize="44" fontWeight="700">{`${value.toFixed(0)}%`}</text>
            <text x={x + width / 2} y={base + 40} textAnchor="middle" fill="rgba(255,255,255,.85)" fontFamily={SANS} fontSize="26" fontWeight="800">{name}</text>
            {arrows && Math.abs(change) > 0.5 && (
              <g opacity={step(p, 0.05, 0.2) * (1 - step(p, 0.75, 0.9))} transform={`translate(${x + width / 2} ${base - 41 * unit})`}>
                <rect x="-78" y="-26" width="156" height="52" rx="26" fill={change < 0 ? 'rgba(255,107,107,.25)' : 'rgba(76,199,122,.25)'} stroke={change < 0 ? RED : GREEN} strokeWidth="3" />
                <text y="10" textAnchor="middle" fill={change < 0 ? RED : GREEN} fontFamily={SANS} fontSize="26" fontWeight="900">{change < 0 ? `Sell ${Math.abs(change).toFixed(0)}%` : `Buy ${change.toFixed(0)}%`}</text>
              </g>
            )}
          </g>
        )
      })}
      {badge && (
        <g opacity={step(p, 0.1, 0.25)} transform={`translate(${x0 + width / 2} 250) scale(${0.6 + 0.4 * easeBack(clamp(step(p, 0.1, 0.3)))})`}>
          <rect x="-110" y="-30" width="220" height="60" rx="30" fill="rgba(76,199,122,.25)" stroke={GREEN} strokeWidth="3" />
          <text y="11" textAnchor="middle" fill={GREEN} fontFamily={SANS} fontSize="30" fontWeight="900">{badge}</text>
        </g>
      )}
    </g>
  )
}

function RiskCompare({ p }) {
  const drop = step(p, 0.2, 0.55)
  const rows = [
    ['Drifted portfolio', drifted[0], RED],
    ['On-plan portfolio', PLAN, LIGHT_BLUE],
  ]
  return (
    <g>
      <g opacity={step(p, 0, 0.15)}>
        <rect x="560" y="150" width="480" height="76" rx="38" fill="rgba(255,107,107,.18)" stroke={RED} strokeWidth="3" />
        <text x="800" y="200" textAnchor="middle" fill={RED} fontFamily={SANS} fontSize="34" fontWeight="900">Then tech falls 30%</text>
      </g>
      {rows.map(([label, techWeight, color], index) => {
        const x = 420 + index * 760
        const loss = techWeight * TECH_DROP * drop
        return (
          <g key={label} opacity={step(p, 0.1 + index * 0.1, 0.3 + index * 0.1)}>
            <text x={x} y="340" textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize="30" fontWeight="800">{label}</text>
            <text x={x} y="385" textAnchor="middle" fill="rgba(255,255,255,.65)" fontFamily={SANS} fontSize="24">{`${techWeight.toFixed(0)}% in tech`}</text>
            <Headline x={x} y={540} size={140} fill={color}>{`−${loss.toFixed(1)}%`}</Headline>
          </g>
        )
      })}
      <Headline y={680} size={44} fill={GOLD} opacity={step(p, 0.7, 0.85)}>Same news, bigger loss — because we drifted</Headline>
    </g>
  )
}

function ClubDrift({ p, club }) {
  const max = Math.max(...club.sectors.flatMap((row) => [row.weight, row.schd]), 1)
  const barMax = 640
  return (
    <g>
      <g transform="translate(560 170)">
        <rect width="22" height="22" rx="4" fill={BLUE} /><text x="32" y="19" fill="#fff" fontFamily={SANS} fontSize="22" fontWeight="700">Our portfolio</text>
        <rect x="230" y="-2" width="5" height="26" fill="#fff" /><text x="248" y="19" fill="#fff" fontFamily={SANS} fontSize="22" fontWeight="700">SCHD</text>
      </g>
      {club.sectors.map((row, index) => {
        const y = 240 + index * 100
        const grow = step(p, 0.05 + index * 0.05, 0.4 + index * 0.05)
        const focus = row === club.biggest
        const highlight = step(p, 0.5, 0.65)
        return (
          <g key={row.sector} opacity={focus ? 1 : 1 - highlight * 0.55}>
            <text x="520" y={y + 34} textAnchor="end" fill="#fff" fontFamily={SANS} fontSize="28" fontWeight="800">{row.sector}</text>
            <rect x="560" y={y} width={(row.weight / max) * barMax * grow} height="50" rx="10" fill={focus ? GOLD : BLUE} />
            <rect x={560 + (row.schd / max) * barMax - 2} y={y - 8} width="5" height="66" rx="2" fill="#fff" opacity={grow} />
            <text x={580 + (row.weight / max) * barMax * grow} y={y + 36} fill="#fff" fontFamily={SANS} fontSize="26" fontWeight="800" opacity={grow}>{`${row.weight.toFixed(1)}%`}</text>
            {focus && <text x={560} y={y + 84} fill={GOLD} fontFamily={SANS} fontSize="24" fontWeight="900" opacity={highlight}>{`${signed(row.weight - row.schd)} vs SCHD`}</text>}
          </g>
        )
      })}
      <Headline y={740} size={46} fill={GOLD} opacity={step(p, 0.7, 0.85)}>Planned — or drift?</Headline>
    </g>
  )
}
