import React, { useMemo } from 'react'
import MotionPlayer, { GOLD, GREEN, H, Headline, Label, RED, Recap, SANS, SERIF, TitleCard, W, clamp, easeBack, step } from './MotionPlayer'
import { describe, pulseSummary } from './economy'

// "Reading leading indicators": a 60-second motion graphic drawn from the
// Sheet's live Economy data.

const TONE = { ok: GREEN, watch: GOLD, caution: RED, neutral: '#9db0c9' }

export default function IndicatorsMotion({ data }) {
  const items = useMemo(() => (data.economy || []).map(describe).filter((item) => item.ready), [data.economy])
  const byId = Object.fromEntries(items.map((item) => [item.id, item]))
  if (!byId.T10Y2Y || !byId.VIXCLS) {
    return <div className="video-frame"><div className="video-placeholder"><strong>Waiting for economic data</strong><span>This lesson uses live indicators from the Sheet’s Economy tab.</span></div></div>
  }
  return <Player items={items} byId={byId} />
}

function Player({ items, byId }) {
  const scenes = useMemo(() => buildScenes(items, byId), [items, byId])
  return <MotionPlayer scenes={scenes} label="Reading leading indicators, 60-second motion graphic" note="Live data from FRED" />
}

function buildScenes(items, byId) {
  const curve = byId.T10Y2Y
  const vix = byId.VIXCLS
  const claims = byId.ICSA
  const sentiment = byId.UMCSENT
  const unemployment = byId.UNRATE
  const pulse = pulseSummary(items)
  const fmt = (item) => (item ? item.info.format(item.latest) : '—')
  return [
    { id: 'title', chapter: 'Intro', start: 0, end: 5, captions: ['Investors watch the economy like a driver watches the road. Here’s how to read the signs.'], render: (p) => <TitleCard p={p} title="Reading leading indicators" icon={<path d="M-60 30 a60 60 0 1 1 120 0 M0 30 L35 -20" fill="none" stroke={GOLD} strokeWidth="12" strokeLinecap="round" />} /> },
    { id: 'mirror', chapter: 'Mirror vs headlights', start: 5, end: 15, captions: ['Lagging indicators, like unemployment, are the rear-view mirror: they confirm what already happened.', 'Leading indicators are the headlights: they tend to turn before the economy does.'], render: (p) => <Mirror p={p} unemployment={unemployment} leading={[curve, claims, byId.PERMIT, sentiment].filter(Boolean)} fmt={fmt} /> },
    { id: 'curve', chapter: 'The yield curve', start: 15, end: 27, captions: ['The yield curve compares 10-year and 2-year Treasury rates. When it drops below zero, it’s called “inverted.”', `It’s at ${fmt(curve)} now: ${curve.signal.label.toLowerCase()}. ${curve.signal.note}`], render: (p) => <CurveScene p={p} curve={curve} /> },
    { id: 'people', chapter: 'Jobs and moods', start: 27, end: 38, captions: ['Weekly jobless claims show layoffs almost in real time. Consumer sentiment shows how people feel about spending.', `Right now: claims are ${claims ? claims.signal.label.toLowerCase() : 'unavailable'}, and sentiment is ${sentiment ? sentiment.signal.label.toLowerCase() : 'unavailable'}.`], render: (p) => <PeopleScene p={p} cards={[claims, sentiment].filter(Boolean)} fmt={fmt} /> },
    { id: 'vix', chapter: 'The fear gauge', start: 38, end: 47, captions: ['The VIX measures how big a swing investors expect in stocks. Under 20 is calm; over 30 is fear.', `Today it reads ${fmt(vix)}: ${vix.signal.label.toLowerCase()}.`], render: (p) => <Gauge p={p} vix={vix} /> },
    { id: 'together', chapter: 'Put it together', start: 47, end: 55, captions: ['No single indicator predicts a recession. Look for several pointing the same way.', `Today: ${pulse.caution.length} flashing caution, ${pulse.watch.length} worth watching, ${pulse.ok.length} healthy.`], render: (p) => <Together p={p} pulse={pulse} /> },
    { id: 'recap', chapter: 'Recap', start: 55, end: 60, captions: ['Check the Economy page any time. It updates on its own.'], render: (p) => <Recap p={p} title="Reading the signs" items={['Lagging = mirror, leading = headlights', 'Inverted yield curve = classic warning', 'Watch claims, sentiment and the VIX', 'Look for several signals together']} /> },
  ]
}

function Mirror({ p, unemployment, leading, fmt }) {
  const left = step(p, 0.05, 0.3)
  const right = step(p, 0.45, 0.65)
  return (
    <g>
      <g opacity={left} transform={`translate(${430 - (1 - left) * 40} 420)`}>
        <rect x="-260" y="-230" width="520" height="400" rx="24" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.25)" strokeWidth="2" />
        <text y="-170" textAnchor="middle" fill="rgba(255,255,255,.75)" fontFamily={SANS} fontSize="26" fontWeight="800" letterSpacing="4">LAGGING</text>
        <Headline x={0} y={-110} size={44}>Rear-view mirror</Headline>
        <text y="-20" textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize="30" fontWeight="700">Unemployment rate</text>
        <Headline x={0} y={70} size={90} fill={GOLD}>{fmt(unemployment)}</Headline>
        <text y="130" textAnchor="middle" fill="rgba(255,255,255,.65)" fontFamily={SANS} fontSize="22">confirms what already happened</text>
      </g>
      <g opacity={right} transform={`translate(${1170 + (1 - right) * 40} 420)`}>
        <rect x="-260" y="-230" width="520" height="400" rx="24" fill="rgba(255,194,13,.1)" stroke={GOLD} strokeWidth="2" />
        <text y="-170" textAnchor="middle" fill={GOLD} fontFamily={SANS} fontSize="26" fontWeight="800" letterSpacing="4">LEADING</text>
        <Headline x={0} y={-110} size={44}>Headlights</Headline>
        {leading.map((item, index) => (
          <g key={item.id} opacity={step(p, 0.55 + index * 0.08, 0.7 + index * 0.08)} transform={`translate(-210 ${-40 + index * 52})`}>
            <circle cx="12" cy="-9" r="9" fill={TONE[item.signal.tone]} />
            <text x="36" fill="#fff" fontFamily={SANS} fontSize="27" fontWeight="700">{item.info.short}</text>
            <text x="420" textAnchor="end" fill="#fff" fontFamily={SERIF} fontSize="30" fontWeight="700">{fmt(item)}</text>
          </g>
        ))}
      </g>
    </g>
  )
}

function CurveScene({ p, curve }) {
  const points = curve.history
  const values = points.map((point) => point.value)
  const min = Math.min(...values, -0.2)
  const max = Math.max(...values, 0.2)
  const x0 = 180
  const x1 = 1420
  const top = 220
  const bottom = 640
  const x = (index) => x0 + (index / Math.max(points.length - 1, 1)) * (x1 - x0)
  const y = (value) => bottom - ((value - min) / (max - min)) * (bottom - top)
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ')
  const reveal = step(p, 0.05, 0.6)
  const badge = step(p, 0.6, 0.75)
  return (
    <g>
      <rect x={x0} y={y(0)} width={x1 - x0} height={bottom - y(0)} fill="rgba(255,107,107,.12)" />
      <text x={x1} y={y(0) + 34} textAnchor="end" fill={RED} fontFamily={SANS} fontSize="22" fontWeight="800">BELOW ZERO = INVERTED</text>
      <line x1={x0} x2={x1} y1={y(0)} y2={y(0)} stroke="#fff" strokeWidth="2" strokeDasharray="8 8" opacity=".7" />
      <text x={x0 - 14} y={y(0) + 8} textAnchor="end" fill="#fff" fontFamily={SANS} fontSize="22">0%</text>
      <clipPath id="mg-curve2"><rect x={x0 - 10} y="0" width={(x1 - x0) * reveal + 20} height={H} /></clipPath>
      <path d={line} clipPath="url(#mg-curve2)" fill="none" stroke={GOLD} strokeWidth="5" strokeLinejoin="round" />
      <text x={x0} y={bottom + 40} fill="rgba(255,255,255,.7)" fontFamily={SANS} fontSize="22">{points[0]?.date.slice(0, 7)}</text>
      <text x={x1} y={bottom + 40} textAnchor="end" fill="rgba(255,255,255,.7)" fontFamily={SANS} fontSize="22">{points.at(-1)?.date.slice(0, 7)}</text>
      <g opacity={badge} transform={`translate(${x1 - 160} ${top - 40}) scale(${0.7 + 0.3 * easeBack(clamp(badge))})`}>
        <rect x="-160" y="-46" width="320" height="92" rx="46" fill="rgba(0,0,0,.4)" stroke={TONE[curve.signal.tone]} strokeWidth="4" />
        <text y="14" textAnchor="middle" fill={TONE[curve.signal.tone]} fontFamily={SANS} fontSize="34" fontWeight="900">{`${curve.info.format(curve.latest)} · ${curve.signal.label}`}</text>
      </g>
    </g>
  )
}

function PeopleScene({ p, cards, fmt }) {
  return (
    <g>
      {cards.map((item, index) => {
        const show = step(p, 0.08 + index * 0.25, 0.3 + index * 0.25)
        const x = cards.length === 1 ? 800 : 470 + index * 660
        return (
          <g key={item.id} opacity={show} transform={`translate(${x} ${430 + (1 - show) * 40})`}>
            <rect x="-280" y="-240" width="560" height="440" rx="26" fill="rgba(255,255,255,.07)" stroke={TONE[item.signal.tone]} strokeWidth="3" />
            <text y="-170" textAnchor="middle" fill="rgba(255,255,255,.8)" fontFamily={SANS} fontSize="28" fontWeight="800">{item.info.short.toUpperCase()}</text>
            <Headline x={0} y={-40} size={120}>{fmt(item)}</Headline>
            <rect x="-120" y="10" width="240" height="56" rx="28" fill={TONE[item.signal.tone]} opacity=".25" />
            <text y="48" textAnchor="middle" fill={TONE[item.signal.tone]} fontFamily={SANS} fontSize="28" fontWeight="900">{item.signal.label}</text>
            <foreignObject x="-250" y="90" width="500" height="100">
              <div xmlns="http://www.w3.org/1999/xhtml" className="mg-card-note">{item.info.what}</div>
            </foreignObject>
          </g>
        )
      })}
    </g>
  )
}

function Gauge({ p, vix }) {
  const maxV = 50
  const angle = (value) => Math.PI * (1 - clamp(value / maxV))
  const cx = 800
  const cy = 600
  const r = 330
  const arc = (from, to, color) => {
    const a = angle(from)
    const b = angle(to)
    return <path d={`M${cx + r * Math.cos(a)} ${cy - r * Math.sin(a)} A${r} ${r} 0 0 1 ${cx + r * Math.cos(b)} ${cy - r * Math.sin(b)}`} fill="none" stroke={color} strokeWidth="56" opacity=".85" />
  }
  const needle = step(p, 0.15, 0.6)
  const value = vix.latest * needle
  const a = angle(value)
  return (
    <g>
      {arc(0, 20, GREEN)}{arc(20, 30, GOLD)}{arc(30, 50, RED)}
      {[['Calm', 10], ['Elevated', 25], ['High fear', 40]].map(([label, at]) => (
        <text key={label} x={cx + (r + 70) * Math.cos(angle(at))} y={cy - (r + 70) * Math.sin(angle(at))} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize="26" fontWeight="800">{label}</text>
      ))}
      <line x1={cx} y1={cy} x2={cx + (r - 40) * Math.cos(a)} y2={cy - (r - 40) * Math.sin(a)} stroke="#fff" strokeWidth="10" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="22" fill="#fff" />
      <Headline x={cx} y={cy + 110} size={80} fill={TONE[vix.signal.tone]}>{`VIX ${value.toFixed(1)}`}</Headline>
      <Label y={cy + 150} size={22}>{vix.signal.label.toUpperCase()}</Label>
    </g>
  )
}

function Together({ p, pulse }) {
  const groups = [['Caution', pulse.caution, RED], ['Watch', pulse.watch, GOLD], ['Healthy', pulse.ok, GREEN]]
  return (
    <g>
      <Label y={190}>{`${pulse.total} SIGNALS, TODAY`}</Label>
      {groups.map(([title, list, color], column) => (
        <g key={title} transform={`translate(${330 + column * 470} 260)`} opacity={step(p, 0.05 + column * 0.12, 0.25 + column * 0.12)}>
          <text textAnchor="middle" fill={color} fontFamily={SANS} fontSize="34" fontWeight="900">{`${title} (${list.length})`}</text>
          {list.map((item, index) => (
            <g key={item.id} transform={`translate(0 ${70 + index * 66})`} opacity={step(p, 0.2 + column * 0.12 + index * 0.05, 0.35 + column * 0.12 + index * 0.05)}>
              <rect x="-200" y="-40" width="400" height="54" rx="27" fill={color} opacity=".2" />
              <text y="-4" textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize="26" fontWeight="700">{item.info.short}</text>
            </g>
          ))}
        </g>
      ))}
    </g>
  )
}
