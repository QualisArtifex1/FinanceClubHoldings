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
