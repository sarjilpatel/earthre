import type {
  LogFilterMode,
  LogsResponse,
  StatsResponse,
  UploadResponse,
} from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

type FetchLogsParams = {
  mode: LogFilterMode
  date: string
  startDate: string
  endDate: string
  limit: number
  offset: number
}

function ensureApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  return API_BASE_URL
}

async function readErrorMessage(response: Response) {
  const fallback = `Request failed with status ${response.status}.`

  try {
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = (await response.json()) as Record<string, unknown>
      const message = body.message || body.error
      return typeof message === 'string' ? message : JSON.stringify(body) || fallback
    }

    const text = await response.text()
    return text || fallback
  } catch {
    return fallback
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response.json() as Promise<T>
}

export async function uploadCsv(csvText: string) {
  const response = await fetch(`${ensureApiBaseUrl()}/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/csv',
    },
    body: csvText,
  })

  return parseJsonResponse<UploadResponse>(response)
}

export async function fetchStats() {
  const response = await fetch(`${ensureApiBaseUrl()}/stats`)
  return parseJsonResponse<StatsResponse>(response)
}

export async function fetchLogs({
  mode,
  date,
  startDate,
  endDate,
  limit,
  offset,
}: FetchLogsParams) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  if (mode === 'single') {
    params.set('date', date)
  } else {
    params.set('start_date', startDate)
    params.set('end_date', endDate)
  }

  const response = await fetch(`${ensureApiBaseUrl()}/logs?${params.toString()}`)
  return parseJsonResponse<LogsResponse>(response)
}
