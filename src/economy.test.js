import { describe as group, expect, it } from 'vitest'
import { describe, pulseSummary } from './economy'

const series = (values, start = '2025-01-01', stepDays = 30) => values.map((value, index) => {
  const date = new Date(Date.UTC(2025, 0, 1) + index * stepDays * 86400000).toISOString().slice(0, 10)
  return { date: index === 0 ? start : date, value }
})

function indicator(id, values, extra = {}) {
  const history = series(values)
  return { id, label: id, group: 'Leading', frequency: 'Monthly', history, latest: values.at(-1), latestDate: history.at(-1).date, previous: values.at(-2), previousDate: history.at(-2)?.date, yearAgo: null, ...extra }
}

group('economic signals', () => {
  it('flags the VIX above 30 as high fear', () => {
    const vix = describe(indicator('VIXCLS', [18, 22, 35.9], { group: 'Sentiment' }))
    expect(vix.signal.tone).toBe('caution')
    expect(vix.signal.note).toContain('35.9')
    expect(vix.good).toBe('bad') // VIX rising is bad news
  })

  it('treats an inverted yield curve as caution and a recent un-inversion as worth watching', () => {
    expect(describe(indicator('T10Y2Y', [0.2, -0.1])).signal.label).toBe('Inverted')
    expect(describe(indicator('T10Y2Y', [-0.3, -0.1, 0.6])).signal.label).toBe('Recently un-inverted')
    expect(describe(indicator('T10Y2Y', [0.8, 0.9, 1.0])).signal.tone).toBe('ok')
  })

  it('triggers the Sahm Rule at 0.5', () => {
    expect(describe(indicator('SAHMREALTIME', [0.2, 0.5])).signal.label).toBe('Triggered')
  })

  it('counts only leading and sentiment signals in the pulse, not context', () => {
    const items = [
      describe(indicator('VIXCLS', [40], { group: 'Sentiment' })),
      describe(indicator('UNRATE', [4, 5], { group: 'Context', yearAgo: 4 })),
      describe(indicator('ICSA', [210000, 205000], { yearAgo: 200000 })),
    ]
    const pulse = pulseSummary(items)
    expect(pulse.total).toBe(2)
    expect(pulse.caution.map((item) => item.id)).toEqual(['VIXCLS'])
  })

  it('shows a neutral card for any FRED series the site has no rules for', () => {
    const custom = describe(indicator('RSAFS', [700000, 748220]))
    expect(custom.signal.tone).toBe('neutral')
    expect(custom.info.format(custom.latest)).toBe('748,220')
  })
})
