import { useCallback, useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import LogsSection from './components/LogsSection'
import StatsSection from './components/StatsSection'
import UploadSection from './components/UploadSection'
import { fetchStats } from './services/api'
import type { StatsResponse } from './types/api'
import { todayIsoDate } from './utils/formatters'

function App() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState('')
  const [logsRefreshKey, setLogsRefreshKey] = useState(0)
  const [defaultDate] = useState(todayIsoDate)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError('')

    try {
      const nextStats = await fetchStats()
      setStats(nextStats)
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : 'Unable to load stats.')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const refreshDashboard = useCallback(() => {
    loadStats()
    setLogsRefreshKey((key) => key + 1)
  }, [loadStats])

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-cyan-700">
              Internal operations
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              SLA Monitoring Dashboard
            </h1>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <Activity className="h-4 w-4 text-cyan-700" aria-hidden="true" />
            Live API metrics
          </div>
        </header>

        <UploadSection onUploaded={refreshDashboard} />

        <StatsSection
          stats={stats}
          loading={statsLoading}
          error={statsError}
          onRefresh={loadStats}
        />

        <LogsSection refreshKey={logsRefreshKey} initialDate={defaultDate} />
      </div>
    </main>
  )
}

export default App
