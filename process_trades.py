"""Generate output/dashboard_data.json from data/priceaction.csv."""
from datetime import datetime, timezone
import json
from pathlib import Path
from data_processor import load_trades

ROOT = Path(__file__).resolve().parent


def main() -> None:
    data = load_trades(ROOT / "data" / "priceaction.csv")
    data.update({"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                 "source_file": "data/priceaction.csv", "strategy": "Price Action Strategy"})
    out = ROOT / "output" / "dashboard_data.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    temporary = out.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(data, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(out)
    summary = data["validation"]
    print(f"Wrote {out.relative_to(ROOT)}: {summary['rows_read']} rows, {summary['rows_accepted']} accepted, "
          f"{summary['rows_rejected']} rejected, {summary['completed_trades']} completed trades, "
          f"{len(data['incomplete_trades'])} incomplete trades.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        raise SystemExit(f"Data processing failed: {error}")
