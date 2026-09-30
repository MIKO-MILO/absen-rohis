"use client"

import { LogOut, X } from "lucide-react"

interface LogoutConfirmModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function LogoutConfirmModal({
  open,
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900">

        <div className="p-6">
          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <LogOut className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h2 className="mb-2 text-center text-xl font-black text-foreground">
            Keluar?
          </h2>

          {/* Description */}
          <p className="mb-6 text-center text-sm leading-relaxed text-muted-foreground">
            Apakah kamu yakin ingin keluar dari akun ini?
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-transparent text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-95"
            >
              <X className="h-4 w-4" />
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
