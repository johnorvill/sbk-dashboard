from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import openpyxl


def clean_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, float):
        return round(value, 6)
    return value


def sheet_to_records(workbook: openpyxl.Workbook, name: str) -> list[dict[str, Any]]:
    ws = workbook[name]
    rows = ws.iter_rows(values_only=True)
    headers = [str(cell).strip() if cell is not None else "" for cell in next(rows)]

    records: list[dict[str, Any]] = []
    for row in rows:
        if not any(cell is not None and str(cell).strip() != "" for cell in row):
            continue
        record = {
            header: clean_value(row[index]) if index < len(row) else None
            for index, header in enumerate(headers)
        }
        records.append(record)

    return records


def build_dataset(source: Path) -> dict[str, Any]:
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    breeds = sheet_to_records(workbook, "Alla raser")
    kennels = sheet_to_records(workbook, "Statistik Kennlar")

    return {
        "meta": {
            "source": str(source),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "breedCount": len(breeds),
            "kennelCount": len(kennels),
        },
        "breeds": breeds,
        "kennels": kennels,
    }


def write_dataset(dataset: dict[str, Any], target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(dataset, ensure_ascii=False, separators=(",", ":"))
    target.write_text(f"window.__SBK_DATA__ = {payload};\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert SBK Excel statistics into a browser-friendly dataset."
    )
    parser.add_argument("source", type=Path, help="Path to the source .xlsx file")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data") / "dataset.js",
        help="Output file to write",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dataset = build_dataset(args.source)
    write_dataset(dataset, args.output)
    print(f"Wrote {args.output} with {dataset['meta']['kennelCount']} kennel rows.")


if __name__ == "__main__":
    main()
