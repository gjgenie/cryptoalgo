# GJ Investment Academy — Trading Performance Dashboard

A dependency-free static dashboard. Python's standard library reads the TradingView export, reconstructs completed trades, and writes JSON. The browser loads that JSON and calculates the selected period's metrics. The source CSV is ignored by Git because trading history may be private.

## Project files

- `data/priceaction.csv` — your private TradingView export input.
- `data_processor.py` — validates and pairs entry/exit rows.
- `performance.py` — reusable performance calculations.
- `process_trades.py` — generates `output/dashboard_data.json`.
- `index.html`, `static/style.css`, `static/app.js` — static dashboard.
- `static/logo.png` — local brand logo, already present. If replacing it, use the official GJ Investment Academy logo.
- `tests/` — standard-library unit tests.

## Data conventions found in the current export

The inspected file has 1,724 rows and 17 columns. Its `Type` values are `Entry long`, `Exit long`, `Entry short`, and `Exit short`; it contains 862 trade numbers, each with one entry and one exit row. The file lists exit before entry for each trade. Both rows repeat P&L and related fields, so reconstruction groups by trade number, matches the direction, gets entry and exit price/time from their own row, and records realized P&L, return, commission, and duration from the exit row once. Trades are ordered by exit time. A trade missing either leg is reported as incomplete and excluded from metrics. Unexpected or malformed rows are reported; processing stops if over 10% of rows are rejected.

P&L, winners, losers, breakeven trades, win rate, profit factor, and peak-to-trough drawdown are calculated from completed trades in the selected range. A range's cumulative curve starts at zero. Win rate uses all completed trades, including breakeven trades, in its denominator. Profit factor is `N/A` when there are no gross losses. Maximum drawdown percentage is `N/A` because the CSV does not establish account starting capital. TradingView adverse excursion is not used as drawdown.

## Run locally

1. Place the latest TradingView export at `data/priceaction.csv` (replace the existing file; the parser does not depend on the export's original name).
2. From the project root, run `python3 process_trades.py`.
3. Start a static server: `python3 -m http.server 8000`.
4. Open `http://localhost:8000`.
5. After replacing the CSV, run `python3 process_trades.py` again to refresh the dashboard JSON.

Do not open the HTML with `file://`; browsers restrict JSON fetches that way. The current dashboard was generated from the CSV present in this workspace.

## Tests

Run `python3 -m unittest discover -s tests -v`.

## Links and deployment

Edit the single `SITE_CONFIG` object near the top of `static/app.js` to set WhatsApp and SHARK Exchange URLs. Their empty values hide the links. Telegram and YouTube are configured to `https://t.me/gjinvestmentacademy1` and `https://www.youtube.com/@alisirtrade?sub_confirmation=1`.

The root `index.html` and relative asset/data paths work as a GitHub Pages static site. To deploy, enable Pages for the repository's chosen branch/folder in GitHub. No deployment or upload is performed by this project. A public Pages deployment makes `output/dashboard_data.json` publicly accessible, including trade-level timestamps, prices, quantities, and P&L. Keep the CSV private and do not publish the generated JSON if those details should remain private. The JSON must be regenerated locally whenever the source CSV changes.
