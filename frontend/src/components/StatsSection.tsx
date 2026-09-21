import { useMemo, useState } from 'react'
import { ChevronDown, RefreshCcw } from 'lucide-react'
import type { ServiceStats, StatsResponse } from '../types/api'
import {
  formatInteger,
  formatLatency,
  formatPercent,
} from '../utils/formatters'

const statCards = [
  { label: 'Total Checks', key: 'total_checks', formatter: formatInteger },
  { label: 'Uptime %', key: 'uptime_percentage', formatter: formatPercent },
  { label: 'Avg Latency', key: 'avg_latency_ms', formatter: formatLatency },
  { label: 'Failed Checks', key: 'failed_checks', formatter: formatInteger },
] as const

type StatsSectionProps = {
  stats: StatsResponse | null
  loading: boolean
  error: string
  onRefresh: () => void
}

function serviceNeedsAttention(service: ServiceStats) {
  return (
    Number(service.failed_checks || 0) > 0 ||
    (service.uptime_percentage !== null && Number(service.uptime_percentage) < 99)
  )
}

function StatsSection({ stats, loading, error, onRefresh }: StatsSectionProps) {
  const [expanded, setExpanded] = useState(true)

  const sortedServices = useMemo(() => {
    return [...(stats?.services || [])].sort((a, b) => {
      const aUptime = a.uptime_percentage ?? Number.POSITIVE_INFINITY
      const bUptime = b.uptime_percentage ?? Number.POSITIVE_INFINITY
      return aUptime - bUptime
    })
  }, [stats])

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-2 text-left text-lg font-semibold text-slate-950"
          aria-expanded={expanded}
        >
          <ChevronDown
            className={`h-5 w-5 text-slate-500 transition ${expanded ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
          Stats
        </button>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:border-cyan-700 hover:text-cyan-800"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {expanded && (
        <div className="p-5">
          {loading && <p className="text-sm text-slate-600">Loading stats...</p>}

          {!loading && error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {!loading && !error && stats && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => (
                  <div
                    key={card.key}
                    className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-sm text-slate-500">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {card.formatter(stats.overall?.[card.key])}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Services
                </h3>
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Service</th>
                        <th className="px-4 py-3 font-semibold">Uptime</th>
                        <th className="px-4 py-3 font-semibold">Failed Checks</th>
                        <th className="px-4 py-3 font-semibold">Avg Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedServices.map((service) => {
                        const attention = serviceNeedsAttention(service)

                        return (
                          <tr key={service.service_id} className="bg-white">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    attention ? 'bg-red-500' : 'bg-emerald-500'
                                  }`}
                                  aria-hidden="true"
                                />
                                {service.service_name}
                              </span>
                            </td>
                            <td
                              className={`px-4 py-3 font-medium ${
                                attention ? 'text-red-700' : 'text-slate-700'
                              }`}
                            >
                              {formatPercent(service.uptime_percentage)}
                            </td>
                            <td
                              className={`px-4 py-3 ${
                                Number(service.failed_checks || 0) > 0
                                  ? 'font-medium text-red-700'
                                  : 'text-slate-700'
                              }`}
                            >
                              {formatInteger(service.failed_checks)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {formatLatency(service.avg_latency_ms)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default StatsSection
