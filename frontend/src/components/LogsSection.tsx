import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TableComponents } from 'react-virtuoso'
import { TableVirtuoso } from 'react-virtuoso'
import SectionShell from './SectionShell'
import { fetchLogs } from '../services/api'
import type { LogEntry, LogFilterMode } from '../types/api'
import { formatLatency, formatTime } from '../utils/formatters'

const PAGE_SIZE = 100

type LogsSectionProps = {
  refreshKey: number
  initialDate: string
}

type LogFilter = {
  mode: LogFilterMode
  date: string
  startDate: string
  endDate: string
}

const tableComponents: TableComponents<LogEntry> = {
  Table: (props) => (
    <table
      {...props}
      className="w-full min-w-[900px] border-collapse text-left text-sm"
    />
  ),
}

function isCompleteFilter(filter: LogFilter) {
  if (filter.mode === 'single') {
    return Boolean(filter.date)
  }

  return Boolean(filter.startDate && filter.endDate)
}

function statusClass(statusCode: number) {
  if (statusCode >= 200 && statusCode <= 399) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }

  return 'border-red-200 bg-red-50 text-red-700'
}

function LogsSection({ refreshKey, initialDate }: LogsSectionProps) {
  const [filter, setFilter] = useState<LogFilter>({
    mode: 'single',
    date: initialDate,
    startDate: initialDate,
    endDate: initialDate,
  })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')
  const requestKeyRef = useRef(0)
  const isLoadingMoreRef = useRef(false)

  const filterReady = isCompleteFilter(filter)

  const requestParams = useMemo(
    () => ({
      mode: filter.mode,
      date: filter.date,
      startDate: filter.startDate,
      endDate: filter.endDate,
      limit: PAGE_SIZE,
    }),
    [filter],
  )

  const loadFirstPage = useCallback(
    async () => {
      if (!filterReady) {
        return
      }

      const requestKey = requestKeyRef.current
      setInitialLoading(true)
      setError('')
      setLoadMoreError('')

      try {
        const result = await fetchLogs({
          ...requestParams,
          offset: 0,
        })

        if (requestKey !== requestKeyRef.current) {
          return
        }

        const nextLogs = result.logs || []
        const nextTotal = result.total || 0

        setLogs(nextLogs)
        setTotal(nextTotal)
        setOffset(nextLogs.length)
        setHasMore(nextLogs.length < nextTotal)
      } catch (apiError) {
        if (requestKey === requestKeyRef.current) {
          setError(apiError instanceof Error ? apiError.message : 'Unable to load logs.')
          setLogs([])
          setTotal(0)
          setOffset(0)
          setHasMore(false)
        }
      } finally {
        if (requestKey === requestKeyRef.current) {
          setInitialLoading(false)
        }
      }
    },
    [filterReady, requestParams],
  )

  useEffect(() => {
    requestKeyRef.current += 1
    setLogs([])
    setTotal(0)
    setOffset(0)
    setHasMore(false)
    setLoadMoreError('')

    if (filterReady) {
      loadFirstPage()
    }
  }, [filterReady, loadFirstPage, refreshKey])

  const loadMore = useCallback(() => {
    const requestKey = requestKeyRef.current
    const nextOffset = offset

    isLoadingMoreRef.current = true
    setIsLoadingMore(true)
    setLoadMoreError('')

    fetchLogs({
      ...requestParams,
      offset: nextOffset,
    })
      .then((result) => {
        if (requestKey !== requestKeyRef.current) {
          return
        }

        const nextLogs = result.logs || []
        const nextLength = logs.length + nextLogs.length

        setLogs((currentLogs) => [...currentLogs, ...nextLogs])
        setOffset(nextLength)
        setHasMore(nextLength < total)
      })
      .catch((apiError) => {
        if (requestKey === requestKeyRef.current) {
          setLoadMoreError(
            apiError instanceof Error ? apiError.message : 'Unable to load more logs.',
          )
        }
      })
      .finally(() => {
        if (requestKey === requestKeyRef.current) {
          isLoadingMoreRef.current = false
          setIsLoadingMore(false)
        }
      })
  }, [logs.length, offset, requestParams, total])

  const fetchNextPage = useCallback(() => {
    if (
      !hasMore ||
      isLoadingMoreRef.current ||
      isLoadingMore ||
      initialLoading ||
      loadMoreError
    ) {
      return
    }

    loadMore()
  }, [hasMore, initialLoading, isLoadingMore, loadMore, loadMoreError])

  const updateFilter = (nextValues: Partial<LogFilter>) => {
    setFilter((current) => ({ ...current, ...nextValues }))
  }

  return (
    <SectionShell title="Logs">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="inline-flex w-fit rounded-md border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => updateFilter({ mode: 'single' })}
            className={`rounded px-3 py-2 text-sm font-medium transition ${
              filter.mode === 'single'
                ? 'bg-white text-cyan-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Single date
          </button>
          <button
            type="button"
            onClick={() => updateFilter({ mode: 'range' })}
            className={`rounded px-3 py-2 text-sm font-medium transition ${
              filter.mode === 'range'
                ? 'bg-white text-cyan-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Date range
          </button>
        </div>

        {filter.mode === 'single' ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Date
            <input
              type="date"
              value={filter.date}
              onChange={(event) => updateFilter({ date: event.target.value })}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900 focus:border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Start date
              <input
                type="date"
                value={filter.startDate}
                onChange={(event) =>
                  updateFilter({ startDate: event.target.value })
                }
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900 focus:border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              End date
              <input
                type="date"
                value={filter.endDate}
                onChange={(event) => updateFilter({ endDate: event.target.value })}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900 focus:border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>
        )}
      </div>

      {initialLoading && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          Loading logs...
        </div>
      )}

      {!initialLoading && error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!initialLoading && !error && logs.length === 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          No checks found for this date
        </div>
      )}

      {!initialLoading && !error && logs.length > 0 && (
        <div className="h-[560px] overflow-auto rounded-md border border-slate-200">
          <TableVirtuoso
            data={logs}
            endReached={fetchNextPage}
            components={tableComponents}
            fixedHeaderContent={() => (
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 font-semibold">
                  Time
                </th>
                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 font-semibold">
                  Service
                </th>
                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 font-semibold">
                  Status Code
                </th>
                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 font-semibold">
                  Latency (ms)
                </th>
                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 font-semibold">
                  Agent
                </th>
                <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 font-semibold">
                  Region
                </th>
              </tr>
            )}
            itemContent={(_, log) => (
              <>
                <td className="border-t border-slate-100 px-4 py-3 text-slate-700">
                  {formatTime(log.checked_at)}
                </td>
                <td className="border-t border-slate-100 px-4 py-3 font-medium text-slate-950">
                  {log.service_name}
                </td>
                <td className="border-t border-slate-100 px-4 py-3">
                  <span
                    className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClass(log.status_code)}`}
                  >
                    {log.status_code}
                  </span>
                </td>
                <td className="border-t border-slate-100 px-4 py-3 text-slate-700">
                  {formatLatency(log.latency_ms).replace(' ms', '')}
                </td>
                <td className="border-t border-slate-100 px-4 py-3 text-slate-700">
                  {log.agent || 'N/A'}
                </td>
                <td className="border-t border-slate-100 px-4 py-3 text-slate-700">
                  {log.region || 'N/A'}
                </td>
              </>
            )}
            fixedFooterContent={() =>
              isLoadingMore ? (
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-500" colSpan={6}>
                    Loading more...
                  </td>
                </tr>
              ) : loadMoreError ? (
                <tr>
                  <td className="px-4 py-3" colSpan={6}>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <span>{loadMoreError}</span>
                      <button
                        type="button"
                        onClick={loadMore}
                        className="rounded-md border border-red-300 bg-white px-3 py-1 font-medium text-red-700 transition hover:bg-red-100"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null
            }
          />
        </div>
      )}

      {!initialLoading && !error && logs.length > 0 && (
        <p className="mt-3 text-sm text-slate-500">
          Showing {logs.length.toLocaleString()} of {total.toLocaleString()} checks.
        </p>
      )}
    </SectionShell>
  )
}

export default LogsSection
