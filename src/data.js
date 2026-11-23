export const SHEET_ID = '1Zo7-zIo5SppN4yok494w4ufIuOMIRtFkgxdoXsdpHRo'

export const SHEETS = {
  holdings: '2018330312',
  benchmark: '202600101',
  performance: '202600102',
  settings: '202600103',
  videos: '202600105',
  pitches: '202600106',
  returns: '202600107',
  risk: '202600108',
}

// Tabs the site can run without (no warning if they are missing).
const OPTIONAL_TABS = new Set(['videos', 'pitches', 'returns', 'risk'])

export const SECTOR_COLORS = {
  'Information Technology': '#004F9E',
  'Consumer Staples': '#C9A978',
  'Consumer Discretionary': '#FFC20D',
  'Health Care': '#ED282C',
  Financials: 'rgba(0, 79, 158, .78)',
  Energy: 'rgba(201, 169, 120, .78)',
  'Communication Services': 'rgba(255, 194, 13, .72)',
  Utilities: 'rgba(237, 40, 44, .72)',
  'Real Estate': 'rgba(0, 79, 158, .56)',
  Industrials: 'rgba(201, 169, 120, .56)',
  Materials: 'rgba(255, 194, 13, .52)',
  Fund: 'rgba(237, 40, 44, .52)',
  Cash: 'rgba(0, 79, 158, .32)',
  Unknown: 'rgba(0, 0, 0, .36)',
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
        dayChangePercent: numberFrom(record.changepct || record.daychangepercent, null),
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

// Accepts a full YouTube link (watch, youtu.be, shorts, embed) or a bare video ID.
export function youtubeId(value) {
  const text = String(value || '').trim()
  if (/^[\w-]{11}$/.test(text)) return text
  const match = text.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : ''
}

export function parseVideos(text) {
  return recordsFromCsv(text)
    .map((record) => ({
      lessonId: String(record.lessonid || '').trim(),
      order: numberFrom(record.order, null),
      title: String(record.title || '').trim(),
      type: String(record.type || '').trim().toLowerCase(),
      youtube: youtubeId(record.youtube),
      length: String(record.length || '').trim(),
      credit: String(record.credit || '').trim(),
    }))
    .filter((row) => row.lessonId)
}

export function parsePitches(text) {
  return recordsFromCsv(text)
    .map((record) => ({
      symbol: String(record.symbol || '').trim().toUpperCase(),
      date: String(record.pitchdate || '').trim(),
      analyst: String(record.analyst || '').trim(),
      decision: String(record.decision || '').trim().toLowerCase(),
      thesis: String(record.thesis || '').trim(),
      whyNow: String(record.whynow || '').trim(),
      risks: String(record.risks || '').trim(),
      sellTrigger: String(record.selltrigger || '').trim(),
      nextReview: String(record.nextreview || '').trim(),
      link: /^https?:\/\//.test(String(record.link || '').trim()) ? String(record.link).trim() : '',
    }))
    .filter((row) => row.symbol && row.thesis)
    .sort((a, b) => b.date.localeCompare(a.date))
}

// Dates typed in the Sheet arrive as 2026-11-22 or 11/22/2026.
export function parseSheetDate(value) {
  const text = String(value || '').trim()
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) return { y: +match[1], m: +match[2], d: +match[3] }
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (match) return { y: +match[3], m: +match[1], d: +match[2] }
  return null
}

function yearsBetween(start, end) {
  const a = parseSheetDate(start)
  const b = parseSheetDate(end)
  if (!a || !b) return null
  return (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / (365.25 * 86400000)
}

export const RETURN_PERIODS = ['since', '5y', '1y', 'ytd']
export const INDEXES = [
  { key: 'sp500', label: 'S&P 500' },
  { key: 'nasdaq', label: 'NASDAQ' },
  { key: 'djia', label: 'Dow Jones' },
]

// Turns a period's rate of return into the total (cumulative) change over the period.
export function cumulativeFrom(rate, row) {
  if (!Number.isFinite(rate)) return null
  if (!row.annualized || !Number.isFinite(row.years) || row.years <= 1) return rate
  return ((1 + rate / 100) ** row.years - 1) * 100
}

export function parseReturns(text) {
  return recordsFromCsv(text)
    .map((record) => {
      const row = {
        period: String(record.period || '').trim().toLowerCase(),
        label: String(record.label || '').trim(),
        start: String(record.startdate || '').trim(),
        end: String(record.enddate || '').trim(),
        annualized: /^y/i.test(String(record.annualized || '')),
        beginning: numberFrom(record.beginningvalue, null),
        contributions: numberFrom(record.contributions, null),
        withdrawals: numberFrom(record.withdrawals, null),
        net: numberFrom(record.netcontributions, null),
        change: numberFrom(record.investmentchange, null),
        ending: numberFrom(record.endingvalue, null),
        club: numberFrom(record.clubreturn, null),
        sp500: numberFrom(record.sp500, null),
        nasdaq: numberFrom(record.nasdaq, null),
        djia: numberFrom(record.djia, null),
      }
      row.years = yearsBetween(row.start, row.end)
      row.cumulative = numberFrom(record.cumulativereturn, null) ?? cumulativeFrom(row.club, row)
      return row
    })
    .filter((row) => RETURN_PERIODS.includes(row.period) && Number.isFinite(row.club))
    .sort((a, b) => RETURN_PERIODS.indexOf(a.period) - RETURN_PERIODS.indexOf(b.period))
}

// Risk tab: one row per measure, with the club and each index in columns.
export function parseRisk(text) {
  return Object.fromEntries(
    recordsFromCsv(text)
      .map((record) => [String(record.measure || '').trim(), {
        label: String(record.label || '').trim(),
        club: numberFrom(record.club, null),
        sp500: numberFrom(record.sp500, null),
        nasdaq: numberFrom(record.nasdaq, null),
        djia: numberFrom(record.djia, null),
        window: String(record.window || '').trim(),
        asOf: String(record.asof || '').trim(),
      }])
      .filter(([measure, row]) => measure && Number.isFinite(row.club)),
  )
}

// Plain-English comparison of the club's worst drop with each index's.
// Wording follows the data: "far less" (≤75% of the index's drop), "less",
// "about the same" (within 1.5 points), or "more".
export function riskSentence(drawdown, indexes = INDEXES) {
  if (!drawdown) return ''
  const club = Math.abs(drawdown.club)
  const compared = indexes.filter((index) => Number.isFinite(drawdown[index.key]))
  const phrase = (index) => {
    const other = Math.abs(drawdown[index.key])
    if (club <= other * 0.75) return { lower: true, text: `far less than the ${index.label}` }
    if (club < other - 1) return { lower: true, text: `less than the ${index.label}` }
    if (club <= other + 1.5) return { lower: false, text: `about the same as the ${index.label}` }
    return { lower: false, text: `more than the ${index.label}` }
  }
  const phrases = compared.map(phrase).sort((a, b) => Number(b.lower) - Number(a.lower))
  const joined = phrases.map((item) => item.text).reduce((text, item, index, all) => (index === 0 ? item : `${text}${index === all.length - 1 ? ', and ' : ', '}${item}`), '')
  const numbers = `In the past ${drawdown.window || 'five years'}, today’s holdings fell at most ${club.toFixed(1)}% in their worst stretch, versus ${compared.map((index) => `${Math.abs(drawdown[index.key]).toFixed(1)}% for the ${index.label}`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`
  const lead = phrases.some((item) => item.lower) ? `But we’ve taken on less risk to earn it: ${joined}.` : `On risk, the portfolio is ${joined}.`
  return `${lead} ${numbers}`
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
    else if (!OPTIONAL_TABS.has(name)) errors.push(`${name}: ${result.reason?.message || 'unavailable'}`)
  })

  if (signal?.aborted) throw new DOMException('Sheet loading was cancelled', 'AbortError')
  if (!csv.holdings) throw new Error(`Holdings sheet is unavailable. ${errors.join(' · ')}`)
  return {
    holdings: parseHoldings(csv.holdings),
    benchmark: csv.benchmark ? parseBenchmark(csv.benchmark) : [],
    performance: csv.performance ? parsePerformance(csv.performance) : [],
    settings: csv.settings ? parseSettings(csv.settings) : {},
    videos: csv.videos ? parseVideos(csv.videos) : [],
    pitches: csv.pitches ? parsePitches(csv.pitches) : [],
    returns: csv.returns ? parseReturns(csv.returns) : [],
    risk: csv.risk ? parseRisk(csv.risk) : {},
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
