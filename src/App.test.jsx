import { describe, expect, it, vi } from 'vitest'
import { yahooFinanceUrl } from './App'
import { freshnessInfo } from './data'

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

describe('Google Sheet freshness', () => {
  it('distinguishes the source timestamp from the retrieval time', () => {
    // Create a date that will have consistent behavior: use a known time
    const fetchedAt = new Date('2026-09-02T10:30:00Z')
    const now = new Date('2026-09-02T10:30:00Z')
    
    const result = freshnessInfo(
      { lastUpdated: '2026-08-03T12:00:00Z' },
      fetchedAt,
      now,
    )

    expect(result.ageDays).toBe(29)
    expect(result.stale).toBe(true)
    expect(result.status).toBe('Timestamp 29 days old')
    expect(result.source).toContain('Aug')
    expect(result.retrieved).toContain('10:30')
  })

  it('does not warn when the source timestamp is recent', () => {
    const fetchedAt = new Date('2026-09-02T10:30:00Z')
    const now = new Date('2026-09-02T10:30:00Z')
    
    const result = freshnessInfo(
      { lastUpdated: '2026-09-01T12:00:00Z' },
      fetchedAt,
      now,
    )

    expect(result.stale).toBe(false)
    expect(result.status).toBe('Sheet connected')
  })
})
