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

describe('Returns tab', () => {
  const csv = `period,label,startDate,endDate,annualized,beginningValue,contributions,withdrawals,netContributions,investmentChange,endingValue,cumulativeReturn,clubReturn,sp500,nasdaq,djia
since,"Since Dec 31, 2016",2016-12-31,2026-11-22,yes,"$18,417.30","$162,834.71","$25,180.77","$137,653.94","$207,977.51","$364,048.75",191.75,11.43,13.91,17.23,11.69
1y,One year,11/22/2025,11/22/2026,yes,"$324,641.80",,,-$31.55,"$39,438.50","$364,048.75",,12.15,5.86,7.84,5.78`

  it('reads each period, including negative money and either date style', async () => {
    const { parseReturns } = await import('./data')
    const [since, oneYear] = parseReturns(csv)
    expect(since.period).toBe('since')
    expect(since.beginning + since.net + since.change).toBeCloseTo(since.ending, 1)
    expect(oneYear.net).toBe(-31.55)
    expect(oneYear.years).toBeCloseTo(1, 2)
  })

  it('turns an annualized rate into the matching cumulative return', async () => {
    const { parseReturns, cumulativeFrom } = await import('./data')
    const [since] = parseReturns(csv)
    // The brokerage's 11.43%/yr should match its own 191.75% cumulative figure.
    expect(cumulativeFrom(since.club, since)).toBeCloseTo(191.75, 0)
  })
})

describe('Risk tab', () => {
  it('describes risk only as strongly as the numbers support', async () => {
    const { parseRisk, riskSentence } = await import('./data')
    const risk = parseRisk('measure,label,club,sp500,nasdaq,djia,window\nmaxDrawdown,Worst drop (%),-20.7,-23.9,-34.1,-19.8,5 years')
    const sentence = riskSentence(risk.maxDrawdown)
    expect(sentence).toContain('far less than the NASDAQ')
    expect(sentence).toContain('less than the S&P 500')
    expect(sentence).toContain('about the same as the Dow Jones')
    expect(sentence).toContain('fell at most 20.7%')
  })

  it('does not claim lower risk when the club fell further', async () => {
    const { riskSentence } = await import('./data')
    const sentence = riskSentence({ club: -30, sp500: -20, nasdaq: -25, djia: -18 })
    expect(sentence).not.toContain('less risk')
    expect(sentence).toContain('more than the S&P 500')
  })
})
