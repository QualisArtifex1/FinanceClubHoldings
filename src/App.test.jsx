import { describe, expect, it } from 'vitest'
import { positionsDateLabel, yahooFinanceUrl } from './App'

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

describe('Positions last-entered date', () => {
  it('keeps the calendar date written in the Sheet, regardless of time zone', () => {
    expect(positionsDateLabel('2026-11-12T14:05:25-05:00')).toBe('Nov 12, 2026')
    expect(positionsDateLabel('2026-01-01T23:59:00-05:00')).toBe('Jan 1, 2026')
  })

  it('accepts US-style dates typed into the Sheet', () => {
    expect(positionsDateLabel('11/12/2026')).toBe('Nov 12, 2026')
  })

  it('shows nothing when the date is missing or unreadable', () => {
    expect(positionsDateLabel('')).toBe('')
    expect(positionsDateLabel(undefined)).toBe('')
    expect(positionsDateLabel('soon')).toBe('')
  })
})
