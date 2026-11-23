"""Refresh dividend data for the Sheet.

Finds each holding's forward annual dividend per share (latest regular
dividend x payments per year, the way most finance sites quote yield), plus
the same yield for SCHD and SPY (S&P 500) for comparison. Mutual funds are
left blank: their yearly payouts are often mostly capital gains.

    python3 scripts/refresh_dividends.py

Output:
  1. One value per Holdings row, in Holdings order: paste into column R
     (annualDividend), starting at R2. Blank = no reliable figure.
  2. schdDividendYield and sp500DividendYield for the Club Settings tab.

Needs only Python 3 and curl. Data comes from Yahoo Finance's public chart data.
"""
import csv
import io
import json
import subprocess
import time

SHEET = "https://docs.google.com/spreadsheets/d/1Zo7-zIo5SppN4yok494w4ufIuOMIRtFkgxdoXsdpHRo/export?format=csv&gid=2018330312"
YEAR = 365 * 24 * 3600


def fetch(url):
    return subprocess.run(["curl", "-sL", "-A", "Mozilla/5.0", url], capture_output=True, text=True, timeout=60, check=True).stdout


def annual_dividend(symbol):
    """Forward annual dividend per share and the latest price."""
    data = json.loads(fetch(f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=2y&interval=1mo&events=div"))
    result = data["chart"]["result"][0]
    events = sorted(result.get("events", {}).get("dividends", {}).values(), key=lambda event: event["date"])
    price = result["meta"]["regularMarketPrice"]
    if not events or events[-1]["date"] < time.time() - YEAR:
        return 0.0, price  # no dividend in the past year
    # Average spacing between payments (uneven payment dates even out).
    gap_days = (events[-1]["date"] - events[0]["date"]) / (len(events) - 1) / 86400 if len(events) > 1 else 365
    per_year = min(12, max(1, round(365 / gap_days)))
    return round(events[-1]["amount"] * per_year, 4), price


def main():
    rows = [row for row in csv.DictReader(io.StringIO(fetch(SHEET))) if row["symbol"]]
    print("Column R (annualDividend), from R2 down:")
    for row in rows:
        symbol = row["symbol"]
        if symbol == "CASH":
            print("0")
        elif row.get("type", "").strip().lower() == "mutual-fund":
            print("")
        else:
            print(annual_dividend(symbol)[0])
    print()
    for setting, symbol in [("schdDividendYield", "SCHD"), ("sp500DividendYield", "SPY")]:
        dividends, price = annual_dividend(symbol)
        print(f"{setting}\t{round(dividends / price * 100, 2)}")


if __name__ == "__main__":
    main()
