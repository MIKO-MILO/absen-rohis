"use client"

import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Props {
  label: string
  value: string
  sublabel?: string
  icon?: ReactNode
  trend?: { label: string; positive?: boolean }
  accent?: "default" | "success" | "error" | "warning" | "info"
  className?: string
}

const accentBg: Record<NonNullable<Props["accent"]>, string> = {
  default: "from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800/60 text-slate-700 dark:text-slate-200",
  success: "from-emerald-50 to-white dark:from-emerald-900/40 dark:to-slate-800/60 text-emerald-700 dark:text-emerald-200",
  error: "from-rose-50 to-white dark:from-rose-900/40 dark:to-slate-800/60 text-rose-700 dark:text-rose-200",
  warning: "from-amber-50 to-white dark:from-amber-900/40 dark:to-slate-800/60 text-amber-700 dark:text-amber-200",
  info: "from-sky-50 to-white dark:from-sky-900/40 dark:to-slate-800/60 text-sky-700 dark:text-sky-200",
}

export function MonitoringStatCard({
  label,
  value,
  sublabel,
  icon,
  trend,
  accent = "default",
  className,
}: Props) {
  return (
    <Card
      className={cn(
        "border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden",
        className,
      )}
    >
      <CardContent className={cn("p-5 bg-linear-to-br", accentBg[accent])}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium opacity-80 tracking-wide uppercase">
              {label}
            </p>
            <p className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums truncate">
              {value}
            </p>
            {sublabel && (
              <p className="mt-1 text-xs opacity-75">{sublabel}</p>
            )}
            {trend && (
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-xs font-semibold",
                  trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                )}
              >
                <span aria-hidden>{trend.positive ? "▲" : "▼"}</span>
                <span>{trend.label}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="shrink-0 p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/50 shadow-sm text-lg">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
