import csv
import io
import json
import base64
import os
from datetime import datetime, timezone

import pg8000


def lambda_handler(event, context):
    body = event.get("body", "")
    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8")

    csv_file = io.StringIO(body)
    reader = csv.DictReader(csv_file)

    clean_rows = []
    skipped_count = 0

    for raw_row in reader:
        cleaned = clean_row(raw_row)
        if cleaned is None:
            skipped_count += 1
        else:
            clean_rows.append(cleaned)

    inserted_count = save_rows(clean_rows)
    duplicate_count = len(clean_rows) - inserted_count

    result = {
        "rows_in_file": len(clean_rows) + skipped_count,
        "rows_messy": skipped_count,
        "rows_cleaned": len(clean_rows),
        "rows_inserted": inserted_count,
        "rows_duplicate": duplicate_count,
    }

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        "body": json.dumps(result),
    }


def clean_row(row):
    service_id = row.get("service_id", "").strip()
    service_name = row.get("service_name", "").strip()
    agent = row.get("agent", "").strip()
    region = row.get("region", "").strip()

    if not service_id or not agent:
        return None

    checked_at = normalize_timestamp(row.get("timestamp", ""))
    if checked_at is None:
        return None

    try:
        status_code = int(row.get("status_code", ""))
    except (ValueError, TypeError):
        return None

    latency_ms = normalize_latency(
        row.get("latency", ""), row.get("latency_unit", ""))

    return {
        "service_id": service_id,
        "service_name": service_name,
        "checked_at": checked_at,
        "status_code": status_code,
        "latency_ms": latency_ms,
        "agent": agent,
        "region": region,
    }


def normalize_timestamp(raw_value):
    raw_value = raw_value.strip()

    if not raw_value:
        return None

    if raw_value.isdigit():
        return datetime.fromtimestamp(int(raw_value), tz=timezone.utc)

    try:
        iso_value = raw_value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(iso_value)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        return None


def normalize_latency(raw_value, unit):
    raw_value = (raw_value or "").strip()
    if raw_value == "":
        return None

    try:
        value = float(raw_value)
    except ValueError:
        return None

    if value < 0:
        return None

    unit = (unit or "").strip()
    if unit == "s":
        value = value * 1000

    return round(value, 2)


def save_rows(rows):
    if not rows:
        return 0

    connection = pg8000.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", "5432")),
        database=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
    )
    cursor = connection.cursor()

    BATCH_SIZE = 500
    inserted_total = 0

    for start in range(0, len(rows), BATCH_SIZE):
        batch = rows[start:start + BATCH_SIZE]

        placeholders = ", ".join(["(%s, %s, %s, %s, %s, %s, %s)"] * len(batch))

        values = []
        for row in batch:
            values.extend([
                row["service_id"],
                row["service_name"],
                row["checked_at"],
                row["status_code"],
                row["latency_ms"],
                row["agent"],
                row["region"],
            ])

        insert_sql = f"""
            INSERT INTO checks
                (service_id, service_name, checked_at, status_code, latency_ms, agent, region)
            VALUES {placeholders}
            ON CONFLICT (service_id, checked_at, agent) DO NOTHING
            RETURNING id
        """
        cursor.execute(insert_sql, values)
        inserted_total += len(cursor.fetchall())

    connection.commit()
    cursor.close()
    connection.close()

    return inserted_total
