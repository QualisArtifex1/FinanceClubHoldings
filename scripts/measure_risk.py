"""Refresh the Sheet's "Risk" tab.

Applies today's holdings and weights (from the Holdings tab) to the past five
years of weekly prices, and compares them with SPY (S&P 500), QQQ (NASDAQ-100)
and DIA (Dow). Prints rows to paste over Risk!A2:I4.

    python3 scripts/measure_risk.py

Needs only Python 3 and curl. Prices come from Yahoo Finance's public chart data.
"""
import csv
import datetime
import io
import json
import math
import statistics
import subprocess

SHEET = "https://docs.google.com/spreadsheets/d/1Zo7-zIo5SppN4yok494w4ufIuOMIRtFkgxdoXsdpHRo/export?format=csv&gid=2018330312"
INDEXES = {"sp500": "SPY", "nasdaq": "QQQ", "djia": "DIA"}
WEEKS_PER_YEAR = 52


def fetch(url):
    return subprocess.run(["curl", "-sL", "-A", "Mozilla/5.0", url], capture_output=True, text=True, timeout=60, check=True).stdout


def money(value):
    return float(str(value).replace("$", "").replace(",", "") or 0)


def weekly_prices(symbol):
    data = json.loads(fetch(f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=5y&interval=1wk&events=div"))
    result = data["chart"]["result"][0]
    closes = result["indicators"].get("adjclose", [{}])[0].get("adjclose") or result["indicators"]["quote"][0]["close"]
    return {stamp: price for stamp, price in zip(result["timestamp"], closes) if price}


def returns(prices, dates):
    return [(prices[b] / prices[a] - 1) if a in prices and b in prices else 0 for a, b in zip(dates, dates[1:])]


def measures(series, market):
    volatility = statistics.pstdev(series) * math.sqrt(WEEKS_PER_YEAR) * 100
    mean_s, mean_m = statistics.mean(series), statistics.mean(market)
    beta = sum((s - mean_s) * (m - mean_m) for s, m in zip(series, market)) / len(series) / statistics.pvariance(market)
    value = peak = 1.0
    worst = 0.0
    for change in series:
        value *= 1 + change
        peak = max(peak, value)
        worst = min(worst, value / peak - 1)
    return {"maxDrawdown": round(worst * 100, 1), "volatility": round(volatility, 1), "beta": round(beta, 2)}


def main():
    rows = [row for row in csv.DictReader(io.StringIO(fetch(SHEET))) if row["symbol"]]
    values = {row["symbol"]: money(row["marketValue"]) for row in rows}
    total = sum(values.values())
    weights = {symbol: value / total for symbol, value in values.items()}

    index_prices = {key: weekly_prices(symbol) for key, symbol in INDEXES.items()}
    dates = sorted(index_prices["sp500"])
    market = returns(index_prices["sp500"], dates)

    club = [0.0] * (len(dates) - 1)
    for symbol, weight in weights.items():
        if symbol == "CASH":
            continue  # cash: no price movement
        for i, change in enumerate(returns(weekly_prices(symbol), dates)):
            club[i] += weight * change

    results = {"club": measures(club, market)}
    results.update({key: measures(returns(prices, dates), market) for key, prices in index_prices.items()})

    today = datetime.date.today().isoformat()
    labels = {"maxDrawdown": "Worst drop (%)", "volatility": "Volatility (% per year)", "beta": "Beta vs S&P 500"}
    writer = csv.writer(__import__("sys").stdout, delimiter="\t")
    for measure, label in labels.items():
        writer.writerow([measure, label, results["club"][measure], results["sp500"][measure], results["nasdaq"][measure], results["djia"][measure], "5 years", today])


if __name__ == "__main__":
    main()
