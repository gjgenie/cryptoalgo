"""Load TradingView strategy exports and reconstruct completed trades."""
from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path
from typing import Any

REQUIRED_COLUMNS = {"Trade number", "Type", "Date and time", "Price USD", "Size (qty)", "Net PnL USD"}


def _number(value: str | None, field: str, line: int, *, optional: bool = False) -> float | None:
    if value is None or not value.strip():
        if optional:
            return None
        raise ValueError(f"Line {line}: missing numeric value for {field}")
    try:
        result = float(value.replace(",", ""))
    except ValueError as exc:
        raise ValueError(f"Line {line}: invalid numeric value for {field}: {value!r}") from exc
    if result != result or result in (float("inf"), float("-inf")):
        raise ValueError(f"Line {line}: non-finite numeric value for {field}")
    return result


def load_trades(csv_path: Path) -> dict[str, Any]:
    """Validate CSV rows, pair by trade number, and use exit-row realized P&L once."""
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}. Place the TradingView export at data/priceaction.csv.")
    with csv_path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        headers = set(reader.fieldnames or [])
        missing = REQUIRED_COLUMNS - headers
        if missing:
            raise ValueError("Missing required CSV columns: " + ", ".join(sorted(missing)))
        groups: dict[str, dict[str, dict[str, Any]]] = {}
        rejected: list[dict[str, Any]] = []
        rows_read = 0
        for line, raw in enumerate(reader, start=2):
            rows_read += 1
            try:
                number = (raw.get("Trade number") or "").strip()
                kind = (raw.get("Type") or "").strip().lower()
                side = "long" if "long" in kind else "short" if "short" in kind else None
                leg = "entry" if kind.startswith("entry ") else "exit" if kind.startswith("exit ") else None
                if not number or not side or not leg:
                    raise ValueError(f"Line {line}: unexpected trade number or Type")
                timestamp = datetime.strptime((raw.get("Date and time") or "").strip(), "%Y-%m-%d %H:%M")
                item = {"timestamp": timestamp.isoformat(timespec="minutes"),
                        "price": _number(raw.get("Price USD"), "Price USD", line),
                        "quantity": _number(raw.get("Size (qty)"), "Size (qty)", line),
                        "pnl": _number(raw.get("Net PnL USD"), "Net PnL USD", line),
                        "return_pct": _number(raw.get("Return %"), "Return %", line, optional=True),
                        "commission": _number(raw.get("Commission USD"), "Commission USD", line, optional=True),
                        "duration": _number(raw.get("Duration (bars)"), "Duration (bars)", line, optional=True),
                        "side": side, "leg": leg, "line": line}
                pair = groups.setdefault(number, {})
                if leg in pair:
                    raise ValueError(f"Line {line}: duplicate {leg} row for trade {number}")
                pair[leg] = item
            except (ValueError, TypeError) as exc:
                rejected.append({"line": line, "reason": str(exc)})
    completed, incomplete = [], []
    for number, pair in groups.items():
        if "entry" not in pair or "exit" not in pair:
            incomplete.append({"trade_number": number, "present_legs": sorted(pair)})
            continue
        entry, exit_ = pair["entry"], pair["exit"]
        if entry["side"] != exit_["side"]:
            rejected.append({"line": exit_["line"], "reason": f"Trade {number}: entry/exit direction mismatch"})
            continue
        if datetime.fromisoformat(exit_["timestamp"]) < datetime.fromisoformat(entry["timestamp"]):
            rejected.append({"line": exit_["line"], "reason": f"Trade {number}: exit precedes entry"})
            continue
        completed.append({"trade_number": number, "entry_time": entry["timestamp"], "exit_time": exit_["timestamp"],
                          "direction": entry["side"].title(), "entry_price": entry["price"], "exit_price": exit_["price"],
                          "quantity": entry["quantity"], "net_pnl": exit_["pnl"], "return_pct": exit_["return_pct"],
                          "commission": exit_["commission"], "duration_bars": exit_["duration"]})
    completed.sort(key=lambda trade: (trade["exit_time"], int(trade["trade_number"]) if trade["trade_number"].isdigit() else trade["trade_number"]))
    if rows_read and len(rejected) / rows_read > 0.1:
        raise ValueError(f"Too many invalid rows: {len(rejected)} of {rows_read}. First errors: {rejected[:5]}")
    all_times = [t["exit_time"] for t in completed]
    return {"completed_trades": completed, "incomplete_trades": incomplete,
            "validation": {"rows_read": rows_read, "rows_accepted": rows_read-len(rejected), "rows_rejected": len(rejected),
                           "completed_trades": len(completed), "rejected_rows": rejected},
            "coverage": {"start": min(all_times) if all_times else None, "end": max(all_times) if all_times else None},
            "metadata": {"columns": sorted(headers)}}
