// MOCKUP ONLY. The Sheet has no "today's change" column yet, so this fills in
// a believable, repeatable daily move per holding (same numbers all day).
// Once the Holdings tab gets a `changepct` column (=GOOGLEFINANCE(A2,"changepct")),
// real values are used automatically and nothing here runs.

function hash(text) {
  let value = 2166136261
  for (const character of text) {
    value ^= character.charCodeAt(0)
    value = Math.imul(value, 16777619)
  }
  return (value >>> 0) / 4294967295
}

export function withDailyChange(holdings, today = new Date()) {
  const dateKey = today.toISOString().slice(0, 10)
  const market = (hash(`market-${dateKey}`) - 0.45) * 1.6
  // If the Sheet has the changepct column, use it as-is (missing = 0) and never sample.
  const sheetHasColumn = holdings.some((holding) => Number.isFinite(holding.dayChangePercent))
  let usedSample = false
  const decorated = holdings.map((holding) => {
    if (holding.symbol === 'CASH') return { ...holding, dayChangePercent: 0, dayChange: 0 }
    let pct = holding.dayChangePercent
    if (!Number.isFinite(pct) && sheetHasColumn) pct = 0
    if (!Number.isFinite(pct)) {
      usedSample = true
      const own = (hash(`${holding.symbol}-${dateKey}`) + hash(`${dateKey}-${holding.symbol}`) - 1) * 3.2
      pct = Math.round((market * (holding.beta ?? 1) + own) * 100) / 100
    }
    const dayChange = holding.marketValue - holding.marketValue / (1 + pct / 100)
    return { ...holding, dayChangePercent: pct, dayChange }
  })
  return { holdings: decorated, usedSample }
}
