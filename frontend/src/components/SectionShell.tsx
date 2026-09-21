import type { ReactNode } from 'react'

type SectionShellProps = {
  title: string
  action?: ReactNode
  children: ReactNode
}

function SectionShell({ title, action, children }: SectionShellProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export default SectionShell
