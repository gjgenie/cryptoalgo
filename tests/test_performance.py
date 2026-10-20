import unittest
from performance import calculate_metrics


class PerformanceTests(unittest.TestCase):
    def test_metrics_and_drawdown(self):
        metrics = calculate_metrics([{"net_pnl": 10}, {"net_pnl": -4}, {"net_pnl": 0}, {"net_pnl": -9}])
        self.assertEqual(metrics["net_pnl"], -3)
        self.assertEqual(metrics["max_drawdown_usd"], 13)
        self.assertEqual(metrics["winning_trades"], 1)
        self.assertEqual(metrics["losing_trades"], 2)
        self.assertEqual(metrics["breakeven_trades"], 1)
        self.assertEqual(metrics["win_rate_pct"], 25)
        self.assertAlmostEqual(metrics["profit_factor"], 10/13)

    def test_empty_and_no_losses(self):
        self.assertIsNone(calculate_metrics([])["win_rate_pct"])
        self.assertIsNone(calculate_metrics([{"net_pnl": 4}])["profit_factor"])
