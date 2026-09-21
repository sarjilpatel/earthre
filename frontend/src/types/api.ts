export type OverallStats = {
  total_checks: number
  failed_checks: number
  uptime_percentage: number | null
  avg_latency_ms: number | null
  earliest_check: string
  latest_check: string
}

export type ServiceStats = {
  service_id: string
  service_name: string
  total_checks: number
  failed_checks: number
  uptime_percentage: number | null
  avg_latency_ms: number | null
}

export type StatsResponse = {
  overall: OverallStats
  services: ServiceStats[]
}

export type UploadResponse = {
  rows_in_file: number
  rows_messy: number
  rows_cleaned: number
  rows_inserted: number
  rows_duplicate: number
}

export type LogEntry = {
  service_id: string
  service_name: string
  checked_at: string
  status_code: number
  latency_ms: number | null
  agent: string
  region: string
}

export type LogsResponse = {
  total: number
  returned: number
  limit: number
  offset: number
  logs: LogEntry[]
}

export type LogFilterMode = 'single' | 'range'
