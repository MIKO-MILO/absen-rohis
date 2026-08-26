"use client"

import { cn } from "@/lib/utils"

type Status = "HEALTHY" | "DEGRADED" | "CRITICAL"

const STYLE: Record<Status, { dot: string; chip: string; text: string }> = {
  HEALTHY: {
    dot: "bg-emerald-500 shadow-emerald-400/60",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/60",
    text: "HEALTHY",
  },
  DEGRADED: {
    dot: "bg-amber-500 shadow-amber-400/60",
    chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/60",
    text: "DEGRADED",
  },
  CRITICAL: {
    dot: "bg-rose-500 shadow-rose-400/60",
    chip: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700/60",
    text: "CRITICAL",
  },
}

export function StatusBadge({ status, size = "md" }: { status: Status; size?: "sm" | "md" | "lg" }) {
  const s = STYLE[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold border rounded-full",
        s.chip,
        size === "sm" && "px-2.5 py-1 text-xs",
        size === "md" && "px-3 py-1.5 text-sm",
        size === "lg" && "px-4 py-2 text-base",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "rounded-full animate-pulse shadow-[0_0_8px_2px]",
          s.dot,
          size === "sm" ? "h-2 w-2" : size === "md" ? "h-2.5 w-2.5" : "h-3 w-3",
        )}
      />
      {s.text}
    </span>
  )
}
