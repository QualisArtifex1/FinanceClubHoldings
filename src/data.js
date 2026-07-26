export const SHEET_ID = '1Zo7-zIo5SppN4yok494w4ufIuOMIRtFkgxdoXsdpHRo'

export const SHEETS = {
  holdings: '2018330312',
  benchmark: '202600101',
  performance: '202600102',
  settings: '202600103',
}

export const SECTOR_COLORS = {
  'Information Technology': '#1769aa',
  'Consumer Staples': '#3f7d20',
  'Consumer Discretionary': '#a46d17',
  'Health Care': '#7651a8',
  Financials: '#28727c',
  Energy: '#b25e2a',
  'Communication Services': '#496579',
  Utilities: '#d7202f',
  'Real Estate': '#6e6259',
  Industrials: '#687482',
  Materials: '#8d742b',
  Fund: '#9b7b3d',
  Cash: '#202b3b',
  Unknown: '#64748b',
}

export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const next = text[index + 1]
    if (character === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1
      row.push(cell)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function recordsFromCsv(text) {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const headers = rows[0].map(normalize)
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
}

export function numberFrom(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback
  const negative = /^\s*-/.test(String(value)) || /^\s*\(.*\)\s*$/.test(String(value))
  const parsed = Number(String(value).replace(/[$,%\s,()]/g, ''))
  if (!Number.isFinite(parsed)) return fallback
  return negative ? -Math.abs(parsed) : parsed
}

export function parseHoldings(text) {
  return recordsFromCsv(text)
    .map((record) => {
      const symbol = String(record.symbol || record.ticker || '').trim().toUpperCase()
      if (!symbol) return null
      const quantity = numberFrom(record.quantity || record.shares)
      const price = numberFrom(record.currentprice || record.price)
      const marketValue = numberFrom(record.marketvalue) || quantity * price
      const costBasis = numberFrom(record.costbasis)
      const gainLoss = numberFrom(record.gainloss, marketValue - costBasis)
      const inferredType = symbol === 'CASH' ? 'cash' : String(record.type || '').toLowerCase()

      return {
        symbol,
        name: record.name || symbol,
        quantity,
        price,
        marketValue,
        costBasis,
        gainLoss,
        gainLossPercent: numberFrom(record.gainlosspercent, costBasis ? (gainLoss / costBasis) * 100 : 0),
        sector: record.sector || (symbol === 'CASH' ? 'Cash' : 'Unknown'),
        industry: record.industry || 'Not provided',
        type: inferredType,
        beta: numberFrom(record.beta, null),
        high52: numberFrom(record.high52, null),
        low52: numberFrom(record.low52, null),
        pe: numberFrom(record.pe, null),
        eps: numberFrom(record.eps, null),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.marketValue - a.marketValue)
}

export function parseBenchmark(text) {
  return recordsFromCsv(text)
    .map((record) => ({
      sector: record.sector,
      weight: numberFrom(record.weight),
      benchmark: record.benchmark || 'SCHD',
      notes: record.notes || '',
    }))
    .filter((row) => row.sector && row.weight >= 0)
}

export function parsePerformance(text) {
  return recordsFromCsv(text)
    .map((record) => ({
      year: numberFrom(record.year),
      portfolioValue: numberFrom(record.portfoliovalue || record.balance),
      endowmentValue: numberFrom(record.endowmentvalue),
      totalClubValue: numberFrom(record.totalclubvalue),
      notes: record.notes || '',
    }))
    .filter((row) => row.year && row.portfolioValue)
    .sort((a, b) => a.year - b.year)
}

export function parseSettings(text) {
  return Object.fromEntries(
    recordsFromCsv(text)
      .filter((record) => record.setting)
      .map((record) => [record.setting, record.value]),
  )
}

async function fetchSheet(gid, signal) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}&cacheBust=${Date.now()}`
  const response = await fetch(url, { cache: 'no-store', signal })
  if (!response.ok) throw new Error(`Google Sheet returned ${response.status}`)
  const text = await response.text()
  if (!text.trim() || /^\s*<!doctype html/i.test(text)) throw new Error('Google Sheet did not return CSV data')
  return text
}

export async function loadDashboardData(signal) {
  const entries = await Promise.allSettled(
    Object.entries(SHEETS).map(async ([name, gid]) => [name, await fetchSheet(gid, signal)]),
  )
  const csv = {}
  const errors = []
  entries.forEach((result, index) => {
    const name = Object.keys(SHEETS)[index]
    if (result.status === 'fulfilled') csv[result.value[0]] = result.value[1]
    else errors.push(`${name}: ${result.reason?.message || 'unavailable'}`)
  })

  if (signal?.aborted) throw new DOMException('Sheet loading was cancelled', 'AbortError')
  if (!csv.holdings) throw new Error(`Holdings sheet is unavailable. ${errors.join(' · ')}`)
  return {
    holdings: parseHoldings(csv.holdings),
    benchmark: csv.benchmark ? parseBenchmark(csv.benchmark) : [],
    performance: csv.performance ? parsePerformance(csv.performance) : [],
    settings: csv.settings ? parseSettings(csv.settings) : {},
    errors,
    fetchedAt: new Date(),
  }
}

export function summarize(holdings, settings = {}) {
  const portfolioValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0)
  const costBasis = holdings.reduce((sum, holding) => sum + holding.costBasis, 0)
  const endowmentValue = numberFrom(settings.endowmentValue)
  const corpus = numberFrom(settings.netContributions || settings.corpus)
  const scholarshipDistributions = numberFrom(settings.scholarshipDistributions)
  const cash = holdings.filter((holding) => holding.sector === 'Cash').reduce((sum, holding) => sum + holding.marketValue, 0)
  const funds = holdings.filter((holding) => holding.sector === 'Fund').reduce((sum, holding) => sum + holding.marketValue, 0)
  const sectors = Object.values(
    holdings.reduce((result, holding) => {
      const sector = holding.sector || 'Unknown'
      result[sector] ??= { sector, value: 0, color: SECTOR_COLORS[sector] || SECTOR_COLORS.Unknown }
      result[sector].value += holding.marketValue
      return result
    }, {}),
  )
    .map((sector) => ({ ...sector, weight: portfolioValue ? (sector.value / portfolioValue) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)

  return {
    portfolioValue,
    costBasis,
    endowmentValue,
    totalClubValue: portfolioValue + endowmentValue,
    corpus,
    scholarshipDistributions,
    cash,
    funds,
    unrealizedGain: portfolioValue - costBasis,
    corpusDifference: portfolioValue + endowmentValue - corpus,
    corpusDifferencePercent: corpus ? ((portfolioValue + endowmentValue - corpus) / corpus) * 100 : 0,
    sectors,
    topFiveWeight: portfolioValue
      ? (holdings.slice(0, 5).reduce((sum, holding) => sum + holding.marketValue, 0) / portfolioValue) * 100
      : 0,
  }
}
