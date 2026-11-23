import React, { useMemo } from 'react'
import { SECTOR_COLORS } from './data'
import { logoUrl } from './Logo'
import MotionPlayer, { BLUE, GOLD, GREEN, H, Headline, Recap, SANS, SERIF, TAN, TitleCard, W, clamp, easeBack, money, signed, step } from './MotionPlayer'

// "Reading our dashboard": a 60-second motion graphic drawn from the club's live Sheet data.

export default function DashboardMotion({ data, summary }) {
  const scenes = useMemo(() => buildScenes(buildFacts(data, summary)), [data, summary])
  return <MotionPlayer scenes={scenes} label="Reading our dashboard, 60-second motion graphic" />
}

function buildFacts(data, summary) {
  const total = summary.portfolioValue
  const equities = data.holdings.filter((holding) => holding.symbol !== 'CASH' && holding.sector !== 'Fund')
  const star = equities[0] || data.holdings[0]
  const benchmark = Object.fromEntries(data.benchmark.map((row) => [row.sector, row.weight]))
  const tilts = summary.sectors
    .filter((sector) => !['Cash', 'Fund'].includes(sector.sector))
    .map((sector) => ({ sector: sector.sector, ours: sector.weight, schd: benchmark[sector.sector] || 0, tilt: sector.weight - (benchmark[sector.sector] || 0) }))
    .sort((a, b) => Math.abs(b.tilt) - Math.abs(a.tilt))
    .slice(0, 4)
  // Prefer the brokerage's own breakdown (Returns tab); fall back to Club Settings.
  const since = (data.returns || []).find((row) => row.period === 'since' && [row.beginning, row.net, row.change, row.ending].every(Number.isFinite))
  const contributions = since ? since.beginning + since.net : Math.min(summary.corpus, summary.totalClubValue)
  return {
    total,
    positions: data.holdings.length,
    sectors: summary.sectors.length,
    costBasis: summary.costBasis,
    gain: summary.unrealizedGain,
    star,
    starWeight: total ? (star.marketValue / total) * 100 : 0,
    holdings: data.holdings,
    tilts,
    clubValue: since ? since.ending : summary.totalClubValue,
    valueLabel: since ? 'PORTFOLIO VALUE' : 'TOTAL CLUB VALUE',
    contributions,
    contributionsLabel: since ? 'starting balance + money added' : 'money put in (contributions)',
    growth: since ? since.change : summary.totalClubValue - contributions,
    rate: since?.club,
    sinceYear: since ? String(since.start).slice(0, 4) : '',
  }
}

function buildScenes(f) {
  return [
    {
      id: 'title', chapter: 'Intro', start: 0, end: 5,
      captions: ['Let’s learn to read the club’s dashboard — in one minute.'],
      render: (p) => <TitleCard p={p} title="Reading our dashboard" />,
    },
    {
      id: 'value', chapter: 'Portfolio value', start: 5, end: 14,
      captions: ['Portfolio value is what everything the club owns is worth right now.', 'Prices update during the trading day, about 20 minutes behind the market.'],
      render: (p, s) => <ValueScene p={p} s={s} f={f} />,
    },
    {
      id: 'basis', chapter: 'Cost basis', start: 14, end: 25,
      captions: ['Cost basis is what the club originally paid for its investments.', 'The gap between what we paid and what it’s worth is the unrealized gain — “unrealized” because we haven’t sold.'],
      render: (p) => <BasisScene p={p} f={f} />,
    },
    {
      id: 'weight', chapter: 'Weight', start: 25, end: 35,
      captions: ['Weight shows how big one holding is compared with the whole portfolio.', `Divide its value by the total: ${f.star.symbol} is ${f.starWeight.toFixed(1)}% of everything we own.`],
      render: (p) => <WeightScene p={p} f={f} />,
    },
    {
      id: 'tilt', chapter: 'Tilt vs SCHD', start: 35, end: 46,
      captions: ['We compare our sectors with SCHD, the fund we use as a benchmark.', 'A tilt is our weight minus SCHD’s. Big tilts are choices the club should be able to explain.'],
      render: (p) => <TiltScene p={p} f={f} />,
    },
    {
      id: 'return', chapter: 'Balance vs return', start: 46, end: 55,
      captions: ['A growing balance comes from two places: new money put in, and investment growth.', Number.isFinite(f.rate) ? `Only the growth is return: ${money.format(f.growth)}, or ${f.rate.toFixed(2)}% a year since ${f.sinceYear}.` : 'Only the growth is return — so the balance chart is not a performance chart.'],
      render: (p) => <ReturnScene p={p} f={f} />,
    },
    {
      id: 'outro', chapter: 'Recap', start: 55, end: 60,
      captions: ['Now you can read the dashboard. Try the quick check below!'],
      render: (p) => <OutroScene p={p} />,
    },
  ]
}

/* ---------- Scenes ---------- */

function ValueScene({ p, s, f }) {
  const count = step(p, 0.05, 0.5)
  const chips = [[`${f.positions}`, 'positions'], [`${f.sectors}`, 'sectors'], ['~20 min', 'price delay']]
  const pulse = 1 + Math.sin(s * 5) * 0.25
  return (
    <g>
      <text x="800" y="230" textAnchor="middle" fill="rgba(255,255,255,.75)" fontFamily={SANS} fontSize="30" fontWeight="800" letterSpacing="6">PORTFOLIO VALUE</text>
      <circle cx="560" cy="220" r={9 * pulse} fill={GREEN} opacity={step(p, 0.1, 0.2)} />
      <Headline y={400} size={170}>{money.format(f.total * count)}</Headline>
      {chips.map(([value, label], index) => {
        const show = step(p, 0.5 + index * 0.08, 0.7 + index * 0.08)
        return (
          <g key={label} transform={`translate(${470 + index * 330} ${520 + (1 - show) * 30})`} opacity={show}>
            <rect x="-130" y="-60" width="260" height="120" rx="20" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.18)" />
            <text y="0" textAnchor="middle" fill="#fff" fontFamily={SERIF} fontSize="52" fontWeight="700">{value}</text>
            <text y="38" textAnchor="middle" fill="rgba(255,255,255,.7)" fontFamily={SANS} fontSize="22" fontWeight="700">{label}</text>
          </g>
        )
      })}
    </g>
  )
}

function BasisScene({ p, f }) {
  const base = 640
  const maxHeight = 420
  const scale = maxHeight / Math.max(f.total, f.costBasis)
  const paid = step(p, 0.05, 0.35) * f.costBasis * scale
  const worth = step(p, 0.3, 0.6) * f.total * scale
  const bracket = step(p, 0.6, 0.8)
  const gapTop = base - f.total * scale
  const gapBottom = base - f.costBasis * scale
  return (
    <g>
      <line x1="420" x2="1180" y1={base} y2={base} stroke="rgba(255,255,255,.35)" strokeWidth="3" />
      <rect x="520" y={base - paid} width="200" height={paid} rx="10" fill="url(#mg-gold)" />
      <text x="620" y={base + 50} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize="28" fontWeight="800">What we paid</text>
      <text x="620" y={base - paid - 20} textAnchor="middle" fill={GOLD} fontFamily={SERIF} fontSize="40" fontWeight="700" opacity={step(p, 0.25, 0.35)}>{money.format(f.costBasis)}</text>
      <text x="620" y={base + 84} textAnchor="middle" fill="rgba(255,255,255,.6)" fontFamily={SANS} fontSize="22">(cost basis)</text>
      <rect x="880" y={base - worth} width="200" height={worth} rx="10" fill="url(#mg-blue)" />
      <text x="980" y={base + 50} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize="28" fontWeight="800">What it’s worth</text>
      <text x="980" y={base - worth - 20} textAnchor="middle" fill="#9cc6ff" fontFamily={SERIF} fontSize="40" fontWeight="700" opacity={step(p, 0.55, 0.62)}>{money.format(f.total)}</text>
      <g opacity={bracket}>
        <rect x="880" y={gapTop} width="200" height={(gapBottom - gapTop) * bracket} rx="10" fill="rgba(76,199,122,.35)" stroke={GREEN} strokeWidth="3" strokeDasharray="10 8" />
        <path d={`M1110 ${gapTop + 6} h30 V${gapBottom - 6} h-30`} fill="none" stroke={GREEN} strokeWidth="4" />
        <text x="1165" y={(gapTop + gapBottom) / 2 - 8} fill={GREEN} fontFamily={SERIF} fontSize="52" fontWeight="700">{`+${money.format(f.gain)}`}</text>
        <text x="1165" y={(gapTop + gapBottom) / 2 + 30} fill="#fff" fontFamily={SANS} fontSize="24" fontWeight="700">unrealized gain</text>
      </g>
    </g>
  )
}

function WeightScene({ p, f }) {
  const x0 = 160
  const width = 1280
  const y = 330
  const reveal = step(p, 0.05, 0.4)
  const focus = step(p, 0.42, 0.6)
  const formula = step(p, 0.55, 0.8)
  let cursor = 0
  const pieces = f.holdings.map((holding) => {
    const share = holding.marketValue / f.total
    const piece = { holding, x: x0 + cursor * width, w: share * width }
    cursor += share
    return piece
  })
  const starPiece = pieces.find((piece) => piece.holding.symbol === f.star.symbol)
  return (
    <g>
      <text x={x0} y={y - 40} fill="rgba(255,255,255,.75)" fontFamily={SANS} fontSize="26" fontWeight="800" letterSpacing="3">THE WHOLE PORTFOLIO = 100%</text>
      <clipPath id="mg-weight-clip"><rect x={x0} y={y - 10} width={width * reveal} height="140" /></clipPath>
      <g clipPath="url(#mg-weight-clip)">
        {pieces.map((piece) => {
          const isStar = piece === starPiece
          return (
            <rect
              key={piece.holding.symbol}
              x={piece.x + 1}
              y={isStar ? y - 30 * focus : y}
              width={Math.max(piece.w - 2, 1)}
              height="110"
              rx="6"
              fill={SECTOR_COLORS[piece.holding.sector] || SECTOR_COLORS.Unknown}
              opacity={isStar ? 1 : 1 - focus * 0.65}
              stroke={isStar ? '#fff' : 'none'}
              strokeWidth={isStar ? 4 * focus : 0}
            />
          )
        })}
      </g>
      {starPiece && (
        <g opacity={focus}>
          <path d={`M${starPiece.x + starPiece.w / 2} ${y + 100} v70`} stroke="#fff" strokeWidth="3" strokeDasharray="6 6" />
          <image href={logoUrl(f.star.symbol)} x={starPiece.x + starPiece.w / 2 - 36} y={y + 180} width="72" height="72" />
        </g>
      )}
      <g opacity={formula} transform={`translate(0 ${(1 - formula) * 20})`}>
        <text x="800" y="680" textAnchor="middle" fill="#fff" fontFamily={SERIF} fontSize="60" fontWeight="700">
          <tspan fill="#9cc6ff">{money.format(f.star.marketValue)}</tspan>
          <tspan fill="rgba(255,255,255,.7)">{'  ÷  '}</tspan>
          <tspan>{money.format(f.total)}</tspan>
          <tspan fill="rgba(255,255,255,.7)">{'  =  '}</tspan>
          <tspan fill={GOLD}>{`${f.starWeight.toFixed(1)}%`}</tspan>
        </text>
      </g>
    </g>
  )
}

function TiltScene({ p, f }) {
  const max = Math.max(...f.tilts.flatMap((row) => [row.ours, row.schd]), 1)
  const barMax = 560
  return (
    <g>
      <g transform="translate(700 175)">
        <rect width="22" height="22" rx="4" fill={BLUE} /><text x="32" y="19" fill="#fff" fontFamily={SANS} fontSize="22" fontWeight="700">Our portfolio</text>
        <rect x="230" width="22" height="22" rx="4" fill="rgba(255,255,255,.4)" /><text x="262" y="19" fill="#fff" fontFamily={SANS} fontSize="22" fontWeight="700">SCHD</text>
      </g>
      {f.tilts.map((row, index) => {
        const y = 250 + index * 125
        const grow = step(p, 0.05 + index * 0.06, 0.38 + index * 0.06)
        const badge = step(p, 0.45 + index * 0.06, 0.6 + index * 0.06)
        const color = row.tilt >= 0 ? '#9cc6ff' : '#e0b56e'
        return (
          <g key={row.sector}>
            <text x="660" y={y + 34} textAnchor="end" fill="#fff" fontFamily={SANS} fontSize="30" fontWeight="800">{row.sector}</text>
            <rect x="700" y={y} width={(row.ours / max) * barMax * grow} height="36" rx="8" fill={BLUE} />
            <rect x="700" y={y + 44} width={(row.schd / max) * barMax * grow} height="26" rx="7" fill="rgba(255,255,255,.4)" />
            <g opacity={badge} transform={`translate(${700 + barMax + 70} ${y + 36}) scale(${0.6 + 0.4 * easeBack(clamp(badge))})`}>
              <rect x="-80" y="-34" width="180" height="68" rx="34" fill="rgba(0,0,0,.35)" stroke={color} strokeWidth="3" />
              <text x="10" y="13" textAnchor="middle" fill={color} fontFamily={SANS} fontSize="34" fontWeight="900">{signed(row.tilt)}</text>
            </g>
          </g>
        )
      })}
      <text x="1340" y="225" textAnchor="middle" fill={GOLD} fontFamily={SANS} fontSize="22" fontWeight="800" letterSpacing="3" opacity={step(p, 0.45, 0.55)}>TILT</text>
    </g>
  )
}

function ReturnScene({ p, f }) {
  const x0 = 200
  const width = 1200
  const y = 360
  const putIn = step(p, 0.05, 0.4) * (f.contributions / f.clubValue) * width
  const growth = step(p, 0.42, 0.72) * (f.growth / f.clubValue) * width
  const stamp = step(p, 0.72, 0.85)
  return (
    <g>
      <text x="800" y="250" textAnchor="middle" fill="rgba(255,255,255,.75)" fontFamily={SANS} fontSize="28" fontWeight="800" letterSpacing="4">{`${f.valueLabel} · ${money.format(f.clubValue)}`}</text>
      <rect x={x0} y={y} width={width} height="130" rx="16" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.2)" />
      <rect x={x0} y={y} width={putIn} height="130" rx="16" fill="url(#mg-gold)" />
      <rect x={x0 + putIn} y={y} width={growth} height="130" rx="16" fill="url(#mg-green)" />
      <g opacity={step(p, 0.25, 0.4)}>
        <text x={x0 + 20} y={y + 190} fill={GOLD} fontFamily={SERIF} fontSize="46" fontWeight="700">{money.format(f.contributions)}</text>
        <text x={x0 + 20} y={y + 228} fill="#fff" fontFamily={SANS} fontSize="24" fontWeight="700">{f.contributionsLabel}</text>
      </g>
      <g opacity={step(p, 0.62, 0.75)}>
        <text x={x0 + width - 20} y={y + 190} textAnchor="end" fill={GREEN} fontFamily={SERIF} fontSize="46" fontWeight="700">{money.format(f.growth)}</text>
        <text x={x0 + width - 20} y={y + 228} textAnchor="end" fill="#fff" fontFamily={SANS} fontSize="24" fontWeight="700">investment growth ← this is return</text>
      </g>
      <g opacity={stamp} transform={`translate(800 ${y + 65}) rotate(-6) scale(${0.7 + 0.3 * easeBack(clamp(stamp))})`}>
        <rect x="-230" y="-48" width="460" height="96" rx="14" fill="rgba(6,22,51,.85)" stroke="#fff" strokeWidth="4" />
        <text y="18" textAnchor="middle" fill="#fff" fontFamily={SERIF} fontSize="50" fontWeight="700">Balance ≠ Return</text>
      </g>
    </g>
  )
}

function OutroScene({ p }) {
  return <Recap p={p} title="You can read the dashboard" items={['Portfolio value', 'Cost basis & gain', 'Weight', 'Tilt vs SCHD', 'Balance vs return']} />
}
