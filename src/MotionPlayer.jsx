import React, { useEffect, useRef, useState } from 'react'

// Shared player for the Learn page's motion graphics. A graphic is a list of
// scenes; each scene renders from its own progress (0→1), so the whole thing
// can be paused, scrubbed and replayed like a video.

export const W = 1600
export const H = 900
export const SERIF = 'Garamond, Palatino, "Palatino Linotype", serif'
export const SANS = 'Helvetica, Arial, sans-serif'
export const GOLD = '#ffc20d'
export const TAN = '#c9a978'
export const GREEN = '#4cc77a'
export const RED = '#ff6b6b'
export const BLUE = '#3d8bff'
export const LIGHT_BLUE = '#9cc6ff'

export const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value))
export const ease = (value) => 1 - (1 - value) ** 3
export const easeBack = (value) => 1 + 2.4 * (value - 1) ** 3 + 1.4 * (value - 1) ** 2
// Eased progress of a step that runs from a to b within a scene.
export const step = (p, a, b) => ease(clamp((p - a) / (b - a)))
export const signed = (value, digits = 1) => `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`

export function Headline({ x = 800, y, children, size = 64, anchor = 'middle', opacity = 1, fill = '#fff' }) {
  return <text x={x} y={y} textAnchor={anchor} fill={fill} fontFamily={SERIF} fontSize={size} fontWeight="700" opacity={opacity}>{children}</text>
}

export function Label({ x = 800, y, children, anchor = 'middle', opacity = 1, fill = 'rgba(255,255,255,.75)', size = 28 }) {
  return <text x={x} y={y} textAnchor={anchor} fill={fill} fontFamily={SANS} fontSize={size} fontWeight="800" letterSpacing="4" opacity={opacity}>{children}</text>
}

export function TitleCard({ p, title, subtitle = 'DCC FINANCE CLUB · 60 SECONDS', icon }) {
  const pop = easeBack(clamp(p / 0.35))
  return (
    <g>
      <g transform={`translate(800 300) scale(${pop})`}>
        <circle r="110" fill="rgba(255,255,255,.08)" stroke={GOLD} strokeWidth="4" strokeDasharray={`${691 * step(p, 0.1, 0.6)} 691`} transform="rotate(-90)" />
        {icon || <image href="./dcc-crest.png" x="-80" y="-80" width="160" height="160" />}
      </g>
      <Headline y={510} size={84} opacity={step(p, 0.25, 0.55)}>{title}</Headline>
      <Label y={570} fill={GOLD} size={26} opacity={step(p, 0.45, 0.75)}>{subtitle}</Label>
    </g>
  )
}

export function Recap({ p, title, items }) {
  return (
    <g>
      <Headline y={230} size={72} opacity={step(p, 0, 0.2)}>{title}</Headline>
      {items.map((item, index) => {
        const show = step(p, 0.1 + index * 0.08, 0.3 + index * 0.08)
        return (
          <g key={item} opacity={show} transform={`translate(${600 + (1 - show) * -40} ${320 + index * 74})`}>
            <circle r="24" fill={GREEN} />
            <path d="M-11 0 l7 8 l15 -16" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <text x="50" y="11" fill="#fff" fontFamily={SANS} fontSize="34" fontWeight="700">{item}</text>
          </g>
        )
      })}
    </g>
  )
}

function Backdrop({ t }) {
  const shift = (t * 18) % 400
  return (
    <g opacity=".22" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => (
        <line key={index} x1="0" x2={W} y1={150 + index * 110} y2={150 + index * 110} stroke="#6aa8ff" strokeWidth="1" strokeDasharray="2 14" strokeDashoffset={-shift} />
      ))}
      <path d={`M${-shift} 760 C 300 700 500 780 800 640 S 1300 560 ${W + 400 - shift} 420`} fill="none" stroke={TAN} strokeWidth="3" opacity=".6" />
    </g>
  )
}

function ChapterLabel({ scenes, scene }) {
  const index = scenes.indexOf(scene)
  if (index === 0) return null
  const counted = scenes.length - 2
  const label = index <= counted ? `${index} / ${counted}  ·  ${scene.chapter.toUpperCase()}` : scene.chapter.toUpperCase()
  return <text x="70" y="70" fill={GOLD} fontFamily={SANS} fontSize="22" fontWeight="800" letterSpacing="4">{label}</text>
}

function Caption({ text }) {
  return (
    <g>
      <rect x="120" y="770" width={W - 240} height="86" rx="16" fill="rgba(0,0,0,.55)" />
      <foreignObject x="140" y="770" width={W - 280} height="86">
        <div xmlns="http://www.w3.org/1999/xhtml" className="mg-caption-text">{text}</div>
      </foreignObject>
    </g>
  )
}

const timeLabel = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

export default function MotionPlayer({ scenes, label, note }) {
  const duration = scenes.at(-1).end
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(true)
  const last = useRef(null)

  useEffect(() => {
    if (!playing) return undefined
    let frame
    const tick = (now) => {
      if (last.current !== null) {
        const delta = (now - last.current) / 1000
        setT((value) => {
          const next = value + delta
          if (next >= duration) {
            setPlaying(false)
            return duration
          }
          return next
        })
      }
      last.current = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      last.current = null
    }
  }, [playing, duration])

  const ended = t >= duration
  const toggle = () => {
    if (ended) {
      setT(0)
      setPlaying(true)
    } else {
      setPlaying((value) => !value)
    }
  }
  const seek = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    setT(clamp((event.clientX - box.left) / box.width) * duration)
  }
  const onKey = (event) => {
    if (event.key === ' ' || event.key === 'k') { event.preventDefault(); toggle() }
    if (event.key === 'ArrowRight') setT((value) => Math.min(duration, value + 5))
    if (event.key === 'ArrowLeft') setT((value) => Math.max(0, value - 5))
  }

  const scene = scenes.find((item) => t >= item.start && t < item.end) || scenes.at(-1)
  const local = clamp((t - scene.start) / (scene.end - scene.start))
  const fadeIn = clamp((t - scene.start) / 0.6)
  const fadeOut = scene === scenes.at(-1) ? 1 : clamp((scene.end - t) / 0.5)
  const captionIndex = Math.min(scene.captions.length - 1, Math.floor(local * scene.captions.length))

  return (
    <div className="motion-player" tabIndex="0" onKeyDown={onKey} role="region" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} className="motion-canvas" role="img" aria-label={scene.captions[captionIndex]}>
        <defs>
          <radialGradient id="mg-bg" cx="25%" cy="10%" r="110%">
            <stop offset="0%" stopColor="#0d4d99" />
            <stop offset="65%" stopColor="#061633" />
          </radialGradient>
          <linearGradient id="mg-gold" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={GOLD} /><stop offset="100%" stopColor={TAN} /></linearGradient>
          <linearGradient id="mg-green" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6fe39a" /><stop offset="100%" stopColor="#2a9d59" /></linearGradient>
          <linearGradient id="mg-blue" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6aa8ff" /><stop offset="100%" stopColor="#1f5fbf" /></linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#mg-bg)" />
        <Backdrop t={t} />
        <g opacity={Math.min(fadeIn, fadeOut)} transform={`translate(0 ${(1 - ease(fadeIn)) * 24})`}>
          {scene.render(local, t - scene.start)}
        </g>
        <ChapterLabel scenes={scenes} scene={scene} />
        {note && <text x={W - 70} y="70" textAnchor="end" fill="rgba(255,255,255,.55)" fontFamily={SANS} fontSize="20">{note}</text>}
        <Caption text={scene.captions[captionIndex]} key={`${scene.id}-${captionIndex}`} />
      </svg>
      <div className="motion-controls">
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : ended ? 'Replay' : 'Play'}>
          {playing ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
            : ended ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" /></svg>
              : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
        </button>
        <div className="motion-scrub" onClick={seek} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={Math.round(t)} tabIndex="-1">
          <i style={{ width: `${(t / duration) * 100}%` }} />
          {scenes.slice(1).map((item) => <b key={item.id} style={{ left: `${(item.start / duration) * 100}%` }} title={item.chapter} />)}
        </div>
        <span className="motion-time">{timeLabel(t)} / {timeLabel(duration)}</span>
      </div>
      <details className="motion-transcript">
        <summary>Transcript</summary>
        <ol>{scenes.map((item) => <li key={item.id}><strong>{item.chapter}</strong> {item.captions.join(' ')}</li>)}</ol>
      </details>
    </div>
  )
}
