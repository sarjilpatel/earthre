import { useRef, useState } from 'react'
import { LoaderCircle, Upload } from 'lucide-react'
import SectionShell from './SectionShell'
import { uploadCsv } from '../services/api'
import { formatInteger } from '../utils/formatters'

type UploadSectionProps = {
  onUploaded: () => void
}

function buildSuccessMessage(result: {
  rows_in_file: number
  rows_messy: number
  rows_duplicate: number
  rows_inserted: number
}) {
  const clauses = [`${formatInteger(result.rows_in_file)} rows read`]

  if (result.rows_messy > 0) {
    clauses.push(`${formatInteger(result.rows_messy)} messy rows skipped`)
  }

  if (result.rows_duplicate > 0) {
    clauses.push(`${formatInteger(result.rows_duplicate)} duplicates ignored`)
  }

  clauses.push(`${formatInteger(result.rows_inserted)} new rows saved`)

  return clauses.join(' - ')
}

function UploadSection({ onUploaded }: UploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null)
    setMessage(null)
  }

  const handleUpload = async () => {
    if (!file || loading) {
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const csvText = await file.text()
      const result = await uploadCsv(csvText)

      setMessage({
        type: 'success',
        text: buildSuccessMessage(result),
      })
      setFile(null)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      onUploaded()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Upload failed.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionShell title="Upload CSV">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-32 w-full flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-cyan-600 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2"
        >
          <Upload className="h-6 w-6 text-cyan-700" aria-hidden="true" />
          <span className="mt-3 text-sm font-medium text-slate-900">
            {file ? file.name : 'Choose a CSV file'}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            The file is uploaded as raw CSV text.
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="sr-only"
        />

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-700 px-5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          {loading ? 'Uploading' : 'Upload'}
        </button>
      </div>

      {message && (
        <p
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}
    </SectionShell>
  )
}

export default UploadSection
