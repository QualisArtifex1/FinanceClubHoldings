// How to read each economic indicator. Signals are simple, published rules of
// thumb (not forecasts) so students can see exactly why a card says what it says.
//
// tone: 'ok' (healthy), 'watch' (worth watching), 'caution' (warning sign), 'neutral' (context only)

const pct = (value, digits = 2) => `${value.toFixed(digits)}%`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortDate(value, frequency = '') {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return value
  const month = MONTHS[Number(match[2]) - 1]
  return /month/i.test(frequency) ? `${month} ${match[1]}` : `${month} ${Number(match[3])}`
}

const yoy = (ind) => (Number.isFinite(ind.yearAgo) && ind.yearAgo ? ((ind.latest - ind.yearAgo) / Math.abs(ind.yearAgo)) * 100 : null)
const minOver = (ind, days) => {
  const recent = ind.history.slice(-Math.max(2, Math.round(days * (/daily/i.test(ind.frequency) ? 0.7 : /week/i.test(ind.frequency) ? 1 / 7 : 1 / 30))))
  return Math.min(...recent.map((point) => point.value))
}

export const INDICATORS = {
  UMCSENT: {
    short: 'Consumer sentiment',
    format: (v) => v.toFixed(1),
    better: 'higher',
    what: 'A monthly survey of how Americans feel about their finances and the economy. The long-run average is about 85.',
    signal: (ind) => {
      const v = ind.latest
      if (v < 60) return { tone: 'caution', label: 'Very gloomy', note: `At ${v.toFixed(1)}, consumers are more pessimistic than during most past recessions. Gloomy shoppers can mean slower spending ahead.` }
      if (v < 80) return { tone: 'watch', label: 'Cautious', note: 'Below the long-run average of about 85: people are wary, but not panicked.' }
      return { tone: 'ok', label: 'Upbeat', note: 'Consumers feel good about the economy, which tends to support spending.' }
    },
  },
  VIXCLS: {
    short: 'VIX',
    format: (v) => v.toFixed(1),
    better: 'lower',
    what: 'The stock market’s “fear gauge”: how big a price swing investors expect in the S&P 500 over the next month.',
    signal: (ind) => {
      const v = ind.latest
      if (v > 30) return { tone: 'caution', label: 'High fear', note: `Above 30 (now ${v.toFixed(1)}), investors expect big price swings. The VIX usually spikes during sell-offs.` }
      if (v >= 20) return { tone: 'watch', label: 'Elevated', note: 'Between 20 and 30: more nervous than usual.' }
      return { tone: 'ok', label: 'Calm', note: 'Below 20, markets are relatively calm.' }
    },
  },
  T10Y2Y: {
    short: 'Yield curve',
    format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
    better: 'higher',
    what: 'The 10-year Treasury rate minus the 2-year rate. Normally positive: lenders want more to lend for longer.',
    signal: (ind) => {
      const v = ind.latest
      if (v < 0) return { tone: 'caution', label: 'Inverted', note: 'An inverted yield curve has come before most U.S. recessions since the 1970s, usually by a year or more.' }
      if (minOver(ind, 365) < 0) return { tone: 'watch', label: 'Recently un-inverted', note: 'The curve was inverted within the past year. Historically, it often turns positive again shortly before a recession starts, so this is worth watching.' }
      if (v < 0.5) return { tone: 'watch', label: 'Flat', note: 'Barely positive: short- and long-term rates are close together.' }
      return { tone: 'ok', label: 'Normal', note: 'A normally sloped curve: long-term rates are comfortably above short-term rates.' }
    },
  },
  ICSA: {
    short: 'Jobless claims',
    format: (v) => `${Math.round(v / 1000)}K`,
    better: 'lower',
    what: 'How many people filed for unemployment benefits for the first time last week. One of the fastest signals of layoffs.',
    signal: (ind) => {
      const v = ind.latest
      const change = yoy(ind)
      if (v > 300000) return { tone: 'caution', label: 'High', note: 'Above 300,000 a week, layoffs are clearly rising.' }
      if (change !== null && change > 20) return { tone: 'watch', label: 'Rising', note: `Up ${change.toFixed(0)}% from a year ago. Rising claims can be an early sign of a weakening job market.` }
      return { tone: 'ok', label: 'Low', note: 'Fewer than about 250,000–300,000 new claims a week signals a healthy job market.' }
    },
  },
  PERMIT: {
    short: 'Building permits',
    format: (v) => `${(v / 1000).toFixed(2)}M`,
    better: 'higher',
    what: 'Permits to build new homes (annual rate). Builders pull permits months before construction, so this leads housing activity.',
    signal: (ind) => {
      const change = yoy(ind)
      if (change === null) return { tone: 'neutral', label: 'Tracking', note: '' }
      if (change < -10) return { tone: 'caution', label: 'Falling', note: `Down ${Math.abs(change).toFixed(0)}% from a year ago. Fewer permits now usually means less construction and hiring later.` }
      if (change < 0) return { tone: 'watch', label: 'Softening', note: `Down ${Math.abs(change).toFixed(0)}% from a year ago.` }
      return { tone: 'ok', label: 'Growing', note: `Up ${change.toFixed(0)}% from a year ago: builders expect demand.` }
    },
  },
  USALOLITOAASTSAM: {
    short: 'OECD leading index',
    format: (v) => v.toFixed(1),
    better: 'higher',
    what: 'Combines several leading measures into one index. 100 = the economy’s long-term trend.',
    signal: (ind) => {
      const above = ind.latest >= 100
      const rising = Number.isFinite(ind.previous) && ind.latest >= ind.previous
      if (above && rising) return { tone: 'ok', label: 'Above trend, rising', note: 'Points to growth at or above the economy’s normal pace in the months ahead.' }
      if (above) return { tone: 'watch', label: 'Above trend, slipping', note: 'Still above trend, but starting to turn down.' }
      if (rising) return { tone: 'watch', label: 'Below trend, improving', note: 'Below trend but turning up: often seen as a recovery begins.' }
      return { tone: 'caution', label: 'Below trend, falling', note: 'Below trend and still falling: points to slower growth ahead.' }
    },
  },
  BAMLH0A0HYM2: {
    short: 'Credit spread',
    format: (v) => pct(v),
    better: 'lower',
    what: 'The extra interest riskier (“high-yield”) companies pay to borrow compared with the U.S. government.',
    signal: (ind) => {
      const v = ind.latest
      if (v > 5) return { tone: 'caution', label: 'Stress', note: 'Lenders are demanding much more to lend to riskier companies, a common sign before or during downturns.' }
      if (v >= 4) return { tone: 'watch', label: 'Widening', note: 'Lenders are getting more cautious.' }
      return { tone: 'ok', label: 'Calm', note: 'Low spreads mean lenders are confident that companies can pay their debts.' }
    },
  },
  SAHMREALTIME: {
    short: 'Sahm Rule',
    format: (v) => v.toFixed(2),
    better: 'lower',
    what: 'Compares the recent unemployment rate with its low over the past year. A jump of 0.5 points or more has marked the start of past recessions.',
    signal: (ind) => {
      const v = ind.latest
      if (v >= 0.5) return { tone: 'caution', label: 'Triggered', note: 'At 0.5 or higher, the Sahm Rule has signaled the start of every U.S. recession since 1970.' }
      if (v >= 0.3) return { tone: 'watch', label: 'Rising', note: 'Getting closer to the 0.5 recession threshold.' }
      return { tone: 'ok', label: 'Not triggered', note: 'Well below the 0.5 threshold that has marked past recessions.' }
    },
  },
  UNRATE: {
    short: 'Unemployment',
    format: (v) => pct(v, 1),
    better: 'lower',
    what: 'The share of people looking for work who can’t find a job. It usually reacts after the economy turns, so it’s context rather than a leading signal.',
    signal: (ind) => {
      const change = Number.isFinite(ind.yearAgo) ? ind.latest - ind.yearAgo : null
      if (change !== null && change >= 0.5) return { tone: 'watch', label: 'Rising', note: `Up ${change.toFixed(1)} points from a year ago.` }
      return { tone: 'neutral', label: 'Steady', note: change !== null ? `${change >= 0 ? 'Up' : 'Down'} ${Math.abs(change).toFixed(1)} points from a year ago.` : '' }
    },
  },
  CPIAUCSL: {
    short: 'Inflation',
    format: (v) => pct(v, 1),
    better: null,
    what: 'How much consumer prices rose over the past year. The Federal Reserve aims for about 2%.',
    signal: (ind) => {
      const v = ind.latest
      if (v > 4) return { tone: 'caution', label: 'High', note: 'Well above the Fed’s 2% goal, which usually means higher interest rates for longer.' }
      if (v > 2.5) return { tone: 'watch', label: 'Above target', note: 'Above the Fed’s 2% goal.' }
      if (v >= 1.5) return { tone: 'ok', label: 'Near target', note: 'Close to the Fed’s 2% goal.' }
      return { tone: 'watch', label: 'Low', note: 'Below the Fed’s 2% goal, which can signal weak demand.' }
    },
  },
  DFF: {
    short: 'Fed funds rate',
    format: (v) => pct(v),
    better: null,
    what: 'The interest rate the Federal Reserve sets. It raises rates to cool inflation and cuts them to support growth.',
    signal: (ind) => {
      const change = Number.isFinite(ind.yearAgo) ? ind.latest - ind.yearAgo : null
      if (change === null || Math.abs(change) < 0.1) return { tone: 'neutral', label: 'On hold', note: 'About the same as a year ago.' }
      return { tone: 'neutral', label: change < 0 ? 'Cutting' : 'Raising', note: `${change < 0 ? 'Down' : 'Up'} ${Math.abs(change).toFixed(2)} points from a year ago.` }
    },
  },
  MORTGAGE30US: {
    short: 'Mortgage rate',
    format: (v) => pct(v),
    better: 'lower',
    what: 'The average rate on a 30-year fixed home loan.',
    signal: (ind) => {
      if (ind.latest > 7) return { tone: 'watch', label: 'High', note: 'Above 7%, homes are much less affordable, which tends to slow the housing market.' }
      return { tone: 'neutral', label: 'Moderate', note: 'Lower rates make buying a home more affordable.' }
    },
  },
}

const GENERIC = {
  format: (v) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2)),
  better: null,
  what: '',
  signal: () => ({ tone: 'neutral', label: 'Tracking', note: '' }),
}

export function describe(indicator) {
  const info = INDICATORS[indicator.id] || { ...GENERIC, short: indicator.label }
  const ready = Number.isFinite(indicator.latest)
  const signal = ready ? info.signal(indicator) : { tone: 'neutral', label: 'Waiting for data', note: '' }
  const change = ready && Number.isFinite(indicator.previous) ? indicator.latest - indicator.previous : null
  const direction = change === null || Math.abs(change) < 1e-9 ? 'flat' : change > 0 ? 'up' : 'down'
  const good = !info.better || direction === 'flat' ? 'neutral' : (direction === 'up') === (info.better === 'higher') ? 'good' : 'bad'
  return { ...indicator, info, ready, signal, change, direction, good }
}

export function pulseSummary(described) {
  const scored = described.filter((item) => item.ready && item.group !== 'Context')
  return {
    caution: scored.filter((item) => item.signal.tone === 'caution'),
    watch: scored.filter((item) => item.signal.tone === 'watch'),
    ok: scored.filter((item) => item.signal.tone === 'ok'),
    total: scored.length,
  }
}
