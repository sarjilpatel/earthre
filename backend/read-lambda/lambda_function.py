import json
import os

import pg8000


def lambda_handler(event, context):
    path = event.get("rawPath", "")
    query_params = event.get("queryStringParameters") or {}

    try:
        if path.endswith("/stats"):
            body = get_stats()
        elif path.endswith("/logs"):
            body = get_logs(query_params)
        else:
            return response(404, {"error": f"Unknown path: {path}"})
    except ValueError as error:
        return response(400, {"error": str(error)})

    return response(200, body)


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, default=str),
    }


def get_connection():
    return pg8000.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", "5432")),
        database=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
    )


def get_stats():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) AS total_checks,
            COUNT(*) FILTER (WHERE status_code >= 400 OR status_code = 999) AS failed_checks,
            AVG(latency_ms) AS avg_latency_ms,
            MIN(checked_at) AS earliest_check,
            MAX(checked_at) AS latest_check
        FROM checks
    """)
    total, failed, avg_latency, earliest, latest = cursor.fetchone()

    overall = {
        "total_checks": total,
        "failed_checks": failed,
        "uptime_percentage": round(100 * (total - failed) / total, 3) if total else None,
        "avg_latency_ms": round(float(avg_latency), 2) if avg_latency is not None else None,
        "earliest_check": earliest,
        "latest_check": latest,
    }

    cursor.execute("""
        SELECT
            service_id,
            service_name,
            COUNT(*) AS total_checks,
            COUNT(*) FILTER (WHERE status_code >= 400 OR status_code = 999) AS failed_checks,
            AVG(latency_ms) AS avg_latency_ms
        FROM checks
        GROUP BY service_id, service_name
        ORDER BY service_id
    """)

    services = []
    for service_id, service_name, s_total, s_failed, s_avg_latency in cursor.fetchall():
        services.append({
            "service_id": service_id,
            "service_name": service_name,
            "total_checks": s_total,
            "failed_checks": s_failed,
            "uptime_percentage": round(100 * (s_total - s_failed) / s_total, 3) if s_total else None,
            "avg_latency_ms": round(float(s_avg_latency), 2) if s_avg_latency is not None else None,
        })

    cursor.close()
    connection.close()

    return {"overall": overall, "services": services}


def get_logs(query_params):
    single_date = query_params.get("date")
    start_date = query_params.get("start_date")
    end_date = query_params.get("end_date")
    limit = min(int(query_params.get("limit", "500")), 2000)
    offset = int(query_params.get("offset", "0"))

    if not single_date and not (start_date and end_date):
        raise ValueError(
            "Provide either ?date=YYYY-MM-DD or both ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD"
        )

    connection = get_connection()
    cursor = connection.cursor()

    base_query = """
        SELECT service_id, service_name, checked_at, status_code, latency_ms, agent, region,
               COUNT(*) OVER() AS total_matching
        FROM checks
        WHERE checked_at::date {condition}
        ORDER BY checked_at
        LIMIT %s OFFSET %s
    """

    if single_date:
        sql = base_query.format(condition="= %s")
        cursor.execute(sql, (single_date, limit, offset))
    else:
        sql = base_query.format(condition="BETWEEN %s AND %s")
        cursor.execute(sql, (start_date, end_date, limit, offset))

    rows = cursor.fetchall()
    total_matching = rows[0][7] if rows else 0

    logs = []
    for service_id, service_name, checked_at, status_code, latency_ms, agent, region, _total in rows:
        logs.append({
            "service_id": service_id,
            "service_name": service_name,
            "checked_at": checked_at,
            "status_code": status_code,
            "latency_ms": float(latency_ms) if latency_ms is not None else None,
            "agent": agent,
            "region": region,
        })

    cursor.close()
    connection.close()

    return {
        "total": total_matching,
        "returned": len(logs),
        "limit": limit,
        "offset": offset,
        "logs": logs,
    }
