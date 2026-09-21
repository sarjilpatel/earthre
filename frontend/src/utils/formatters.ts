export function formatInteger(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A'
  }

  return Number(value).toLocaleString()
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A'
  }

  return `${Number(value).toFixed(2)}%`
}

export function formatLatency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A'
  }

  return `${Number(value).toFixed(1)} ms`
}

export function formatTime(isoDate: string) {
  if (!isoDate) {
    return 'N/A'
  }

  const date = new Date(isoDate)

  if (Number.isNaN(date.getTime())) {
    return isoDate
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}
