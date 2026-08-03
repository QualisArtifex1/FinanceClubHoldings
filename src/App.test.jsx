import { describe, expect, it } from 'vitest'
import { yahooFinanceUrl } from './App'

describe('Yahoo Finance research link', () => {
  it('builds the quote URL for a selected holding', () => {
    expect(yahooFinanceUrl('AMAT')).toBe('https://finance.yahoo.com/quote/AMAT/')
  })

  it('normalizes symbols that Yahoo represents with a hyphen', () => {
    expect(yahooFinanceUrl('brk.b')).toBe('https://finance.yahoo.com/quote/BRK-B/')
  })

  it('does not create a URL without a symbol', () => {
    expect(yahooFinanceUrl('')).toBe('')
  })
})
