"use client"

import { Filter, X, Calendar, ArrowUpDown, ChevronDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface FilterOption {
  value: string
  label: string
}

interface FilterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  classes?: string[]
  classLabel?: string
  selectedClass?: string
  onClassChange?: (value: string) => void
  statuses?: FilterOption[]
  statusLabel?: string
  selectedStatus?: string
  onStatusChange?: (value: string) => void
  statusFieldClassName?: string
  startDate?: string
  endDate?: string
  startDateLabel?: string
  endDateLabel?: string
  onStartDateChange?: (value: string) => void
  onEndDateChange?: (value: string) => void
  roles?: FilterOption[]
  roleLabel?: string
  selectedRole?: string
  onRoleChange?: (value: string) => void
  actions?: FilterOption[]
  actionLabel?: string
  selectedAction?: string
  onActionChange?: (value: string) => void
  statusCodes?: FilterOption[]
  statusCodeLabel?: string
  selectedStatusCode?: string
  onStatusCodeChange?: (value: string) => void
  sortOptions?: FilterOption[]
  selectedSort?: string
  onSortChange?: (value: string) => void
  onReset: () => void
  onApply?: () => void
}

export function FilterModal({
  open,
  onOpenChange,
  title = "Filter Data",
  description = "Atur filter sesuai kebutuhan Anda",
  classes,
  classLabel = "Kelas",
  selectedClass,
  onClassChange,
  statuses,
  statusLabel = "Status",
  selectedStatus,
  onStatusChange,
  statusFieldClassName,
  startDate,
  endDate,
  startDateLabel = "Tanggal Mulai",
  endDateLabel = "Tanggal Akhir",
  onStartDateChange,
  onEndDateChange,
  roles,
  roleLabel = "Role",
  selectedRole,
  onRoleChange,
  actions,
  actionLabel = "Action",
  selectedAction,
  onActionChange,
  statusCodes,
  statusCodeLabel = "Status Code",
  selectedStatusCode,
  onStatusCodeChange,
  sortOptions,
  selectedSort,
  onSortChange,
  onReset,
  onApply,
}: FilterModalProps) {
  const showDateRange =
    onStartDateChange !== undefined && onEndDateChange !== undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl p-6 md:w-full">
        <DialogHeader className="mb-4 text-left">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400">
            <Filter className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* 1. Filter Utama (Kelas / Role / Action) */}
          <div className="space-y-4">
            {onClassChange !== undefined && (
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black tracking-wider text-muted-foreground uppercase">
                  {classLabel}
                </label>
                <div className="relative mt-1">
                  <select
                    value={selectedClass}
                    onChange={(e) => onClassChange(e.target.value)}
                    className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                  >
                    <option value="">
                      {classLabel === "Kelas"
                        ? "Semua Kelas"
                        : `Semua ${classLabel}`}
                    </option>
                    {classes?.map((kelas) => (
                      <option key={kelas} value={kelas}>
                        {kelas}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            )}

            {onRoleChange !== undefined && (
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black tracking-wider text-muted-foreground uppercase">
                  {roleLabel}
                </label>
                <div className="relative mt-1">
                  <select
                    value={selectedRole}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                  >
                    <option value="">
                      {roleLabel === "Role"
                        ? "Semua Role"
                        : `Semua ${roleLabel}`}
                    </option>
                    {roles?.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            )}

            {onActionChange !== undefined && (
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black tracking-wider text-muted-foreground uppercase">
                  {actionLabel}
                </label>
                <div className="relative mt-1">
                  <select
                    value={selectedAction}
                    onChange={(e) => onActionChange(e.target.value)}
                    className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                  >
                    <option value="">
                      {actionLabel === "Action"
                        ? "Semua Action"
                        : `Semua ${actionLabel}`}
                    </option>
                    {actions?.map((action) => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* 2. Rentang Tanggal */}
          {onStartDateChange !== undefined && (
            <div className="mt-1 space-y-2">
              <label className="ml-1 text-[10px] font-black tracking-wider text-muted-foreground uppercase">
                Tanggal
              </label>
              {showDateRange ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="ml-1 text-[9px] font-bold text-muted-foreground uppercase">
                      {startDateLabel}
                    </p>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => onStartDateChange(e.target.value)}
                        className="h-10 w-full cursor-pointer rounded-xl border border-border bg-muted/30 px-3 pl-8 text-sm text-foreground outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="ml-1 text-[9px] font-bold text-muted-foreground uppercase">
                      {endDateLabel}
                    </p>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => onEndDateChange(e.target.value)}
                        className="h-10 w-full cursor-pointer rounded-xl border border-border bg-muted/30 px-3 pl-8 text-sm text-foreground outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-1 space-y-1.5">
                  <div className="relative mt-1">
                    <Calendar className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => onStartDateChange(e.target.value)}
                      className="h-10 w-full cursor-pointer rounded-xl border border-border bg-muted/30 px-3 pl-8 text-sm text-foreground outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Status */}
          <div className="space-y-4">
            {onStatusChange !== undefined && (
              <div className={statusFieldClassName ?? "mt-1 space-y-2"}>
                <label className="ml-1 text-[10px] font-black tracking-wider text-muted-foreground uppercase">
                  {statusLabel}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                >
                  <option value="">
                    {statusLabel === "Status"
                      ? "Semua Status"
                      : `Semua ${statusLabel}`}
                  </option>
                  {statuses?.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onStatusCodeChange !== undefined && (
              <div className="mt-1 space-y-2">
                <label className="ml-1 text-[10px] font-black tracking-wider text-muted-foreground uppercase">
                  {statusCodeLabel}
                </label>
                <select
                  value={selectedStatusCode}
                  onChange={(e) => onStatusCodeChange(e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                >
                  <option value="">
                    {statusCodeLabel === "Status Code"
                      ? "Semua Status"
                      : `Semua ${statusCodeLabel}`}
                  </option>
                  {statusCodes?.map((code) => (
                    <option key={code.value} value={code.value}>
                      {code.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 4. Urutkan Berdasarkan (Sort) */}
          {onSortChange !== undefined && (
            <div className="mt-1 space-y-2">
              <label className="ml-1 text-[10px] font-black tracking-wider text-muted-foreground uppercase">
                Urutkan Berdasarkan
              </label>
              <div className="relative mt-1">
                <ArrowUpDown className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={selectedSort}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border bg-muted/30 px-3 pl-8 text-sm text-foreground outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                >
                  {sortOptions?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 5. Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <Button
              variant="outline"
              onClick={onReset}
              className="h-12 rounded-2xl border-border font-bold text-foreground hover:bg-muted"
            >
              <X className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button
              onClick={() => {
                onApply?.()
                onOpenChange(false)
              }}
              className="h-12 rounded-2xl bg-teal-600 font-bold text-white shadow-md shadow-teal-500/20 hover:bg-teal-700"
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
