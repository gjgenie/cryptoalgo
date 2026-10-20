"""Performance statistics for reconstructed trades."""
from __future__ import annotations
from typing import Any


def calculate_metrics(trades: list[dict[str, Any]]) -> dict[str, Any]:
    values = [float(trade["net_pnl"]) for trade in trades]
    winners = sum(value > 0 for value in values)
    losers = sum(value < 0 for value in values)
    gross_profit = sum(value for value in values if value > 0)
    gross_loss = -sum(value for value in values if value < 0)
    running = peak = max_drawdown = 0.0
    for value in values:
        running += value
        peak = max(peak, running)
        max_drawdown = max(max_drawdown, peak-running)
    return {"net_pnl": sum(values), "max_drawdown_usd": max_drawdown, "max_drawdown_pct": None,
            "total_trades": len(values), "winning_trades": winners, "losing_trades": losers,
            "breakeven_trades": len(values)-winners-losers,
            "win_rate_pct": winners/len(values)*100 if values else None,
            "profit_factor": gross_profit/gross_loss if gross_loss else None}
