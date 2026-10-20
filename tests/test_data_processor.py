import csv
import tempfile
import unittest
from pathlib import Path
from data_processor import load_trades

HEADERS = ["Trade number", "Type", "Date and time", "Price USD", "Size (qty)", "Net PnL USD", "Return %", "Commission USD", "Duration (bars)"]


class ParserTests(unittest.TestCase):
    def write_csv(self, rows):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        path = Path(temp.name) / "trades.csv"
        with path.open("w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=HEADERS)
            writer.writeheader()
            writer.writerows(rows)
        return path

    def row(self, number, kind, date, price, pnl="10"):
        return {"Trade number": str(number), "Type": kind, "Date and time": date, "Price USD": str(price),
                "Size (qty)": "1", "Net PnL USD": str(pnl), "Return %": "1", "Commission USD": "0", "Duration (bars)": "3"}

    def test_pairs_trade_once_and_uses_exit_pnl(self):
        path = self.write_csv([self.row(1,"Exit long","2024-01-02 10:00",110), self.row(1,"Entry long","2024-01-02 09:00",100)])
        data = load_trades(path)
        self.assertEqual(len(data["completed_trades"]), 1)
        self.assertEqual(data["completed_trades"][0]["net_pnl"], 10)
        self.assertEqual(data["completed_trades"][0]["entry_price"], 100)

    def test_incomplete_and_invalid_rows_reported(self):
        rows = [self.row(1,"Entry short","2024-01-02 09:00",100)]
        rows += [self.row(n,"Entry long",f"2024-01-02 09:{n:02d}",100) for n in range(10,19)]
        rows.append(self.row(2,"Exit long","bad",110))
        path = self.write_csv(rows)
        data = load_trades(path)
        self.assertEqual(len(data["incomplete_trades"]), 10)
        self.assertEqual(data["validation"]["rows_rejected"], 1)

    def test_missing_columns(self):
        path = self.write_csv([])
        with path.open("w") as f: f.write("Type,Date and time\n")
        with self.assertRaisesRegex(ValueError, "Missing required"):
            load_trades(path)

    def test_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            load_trades(Path("does-not-exist.csv"))
