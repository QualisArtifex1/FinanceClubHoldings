import React, { useState } from 'react'

// Company logos by ticker. Falls back to a letter badge if no image exists.
export function logoUrl(symbol) {
  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(String(symbol).toUpperCase())}.png`
}

export function Logo({ symbol, size = 28, className = '' }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }
  if (symbol === 'CASH') {
    return <span className={`logo logo-fallback logo-cash ${className}`} style={{ ...style, fontSize: size * 0.48 }} aria-hidden="true">$</span>
  }
  if (failed) {
    return <span className={`logo logo-fallback ${className}`} style={{ ...style, fontSize: size * 0.36 }} aria-hidden="true">{symbol.slice(0, 2)}</span>
  }
  return (
    <span className={`logo ${className}`} style={style} aria-hidden="true">
      <img src={logoUrl(symbol)} alt="" loading="lazy" onError={() => setFailed(true)} />
    </span>
  )
}
