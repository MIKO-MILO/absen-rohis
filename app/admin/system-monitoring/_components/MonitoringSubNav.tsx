"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface NavLink {
  href: string
  label: string
  exact?: boolean
  disabled?: boolean
}

const LINKS: NavLink[] = [
  { href: "/admin/system-monitoring", label: "Overview", exact: true },
  { href: "/admin/system-monitoring/requests", label: "Request Monitor" },
  { href: "/admin/system-monitoring/errors", label: "Error Monitor" },
  { href: "/admin/system-monitoring/alerts", label: "Alerts" },
  { href: "/admin/system-monitoring/logs", label: "System Logs" },
]

export function MonitoringSubNav() {
  const pathname = usePathname()
  return (
    <div className="bg-white rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800/40 p-1.5 mb-6 flex flex-wrap gap-1">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname?.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1",
              active && !l.disabled
                ? "bg-linear-to-r from-[#4d9284] to-[#356b60] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60",
              l.disabled && "opacity-50 cursor-not-allowed pointer-events-none",
            )}
          >
            {l.label}
            {l.disabled && (
              <span className="ml-2 text-[10px] align-middle px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300">
                Soon
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
