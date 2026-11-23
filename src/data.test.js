import { describe, expect, it } from 'vitest'
import { numberFrom, parseCsv, parseHoldings, summarize } from './data'

describe('sheet data utilities', () => {
  it('parses quoted CSV cells', () => {
    expect(parseCsv('name,value\n"Example, Inc.","$1,234.50"')).toEqual([
      ['name', 'value'],
      ['Example, Inc.', '$1,234.50'],
    ])
  })

  it('parses currency, percentages, and accounting negatives', () => {
    expect(numberFrom('$1,234.50')).toBe(1234.5)
    expect(numberFrom('-32.76%')).toBe(-32.76)
    expect(numberFrom('($42.00)')).toBe(-42)
  })

  it('calculates portfolio summaries from parsed holdings', () => {
    const holdings = parseHoldings('symbol,quantity,costBasis,sector,name,currentPrice,marketValue\nABC,2,$10,Industrials,ABC Corp,$8,$16\nCASH,4,$4,Cash,Cash,$1,$4')
    const summary = summarize(holdings, {
      endowmentValue: '$5',
      netContributions: '$20',
      scholarshipDistributions: '$500',
    })
    expect(summary.portfolioValue).toBe(20)
    expect(summary.totalClubValue).toBe(25)
    expect(summary.cash).toBe(4)
    expect(summary.scholarshipDistributions).toBe(500)
  })
})

describe('Videos and Pitches tabs', () => {
  it('reads YouTube links in any common format', async () => {
    const { youtubeId } = await import('./data')
    expect(youtubeId('https://www.youtube.com/watch?v=p7HKvqRI_Bo')).toBe('p7HKvqRI_Bo')
    expect(youtubeId('https://youtu.be/0zP4yQGAiL4?t=3')).toBe('0zP4yQGAiL4')
    expect(youtubeId('https://www.youtube.com/watch?list=x&v=J33ObDTsiOU')).toBe('J33ObDTsiOU')
    expect(youtubeId('J33ObDTsiOU')).toBe('J33ObDTsiOU')
    expect(youtubeId('not a link')).toBe('')
  })

  it('keeps only pitches with a symbol and thesis, newest first', async () => {
    const { parsePitches } = await import('./data')
    const rows = parsePitches('symbol,pitchDate,analyst,decision,thesis\nmsft,2025-01-10,AB,bought,Cloud growth\nKO,2026-02-01,CD,passed,Steady dividends\nXYZ,2026-03-01,,,')
    expect(rows.map((row) => row.symbol)).toEqual(['KO', 'MSFT'])
  })
})

describe('daily change', () => {
  it('uses Sheet values and never samples once the column exists', async () => {
    const { withDailyChange } = await import('./sample')
    const result = withDailyChange([
      { symbol: 'AAA', marketValue: 110, dayChangePercent: 10 },
      { symbol: 'BBB', marketValue: 50, dayChangePercent: null },
    ])
    expect(result.usedSample).toBe(false)
    expect(result.holdings[0].dayChange).toBeCloseTo(10)
    expect(result.holdings[1].dayChangePercent).toBe(0)
  })
})
