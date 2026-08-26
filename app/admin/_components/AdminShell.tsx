/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  LogOut,
  Bell,
  Menu,
  X,
  LayoutGrid,
  ShieldCheck,
  History,
  MonitorCheck,
  Activity,
  ChevronRight,
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import type { SessionData } from "@/lib/auth-client"
import {
  clearAllLocalStorageSessions,
  fetchSession,
  clearSessionCache,
} from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type NavLinkItem = {
  kind?: "link"
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  superadminOnly?: boolean
  badge?: string
}

type NavChildLink = {
  label: string
  href: string
  superadminOnly?: boolean
  disabled?: boolean
  badge?: string
}

type NavGroupItem = {
  kind: "group"
  label: string
  icon: React.ComponentType<{ className?: string }>
  superadminOnly?: boolean
  badge?: string
  children: NavChildLink[]
}

type NavItem = NavLinkItem | NavGroupItem

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Data Absen", icon: ClipboardList, href: "/admin/absen" },
  {
    kind: "group",
    label: "Monitoring",
    icon: MonitorCheck,
    children: [
      {
        label: "Monitoring Absensi",
        href: "/admin/monitoring",
      },
    ],
  },
  {
    kind: "group",
    label: "System Monitoring",
    icon: Activity,
    superadminOnly: true,
    badge: "NEW",
    children: [
      { label: "Overview", href: "/admin/system-monitoring" },
      { label: "Request Monitor", href: "/admin/system-monitoring/requests" },
      {
        label: "Error Monitor",
        href: "/admin/system-monitoring/errors",
      },
      {
        label: "Alerts",
        href: "/admin/system-monitoring/alerts",
      },
      {
        label: "System Logs",
        href: "/admin/system-monitoring/logs",
      },
      {
        label: "Activity Monitor",
        href: "/admin/activity-monitor",
      },
    ],
  },
  { label: "Siswa", icon: Users, href: "/admin/siswa" },
  { label: "Panitia", icon: Users, href: "/admin/panitia" },
  { label: "Admin", icon: Users, href: "/admin/admin", superadminOnly: true },
  {
    label: "Kelas",
    icon: LayoutGrid,
    href: "/admin/classes",
    superadminOnly: true,
  },
  {
    label: "Config",
    icon: ShieldCheck,
    href: "/admin/config",
    superadminOnly: true,
  },
  {
    label: "Audit Log",
    icon: History,
    href: "/admin/audit-log",
    superadminOnly: true,
  },
]

interface SidebarContentProps {
  mobile?: boolean
  pathname: string
  router: AppRouterInstance
  setSidebarOpen: (open: boolean) => void
  handleLogout: () => void
  adminName?: string
  adminRole?: string
}

const SidebarContent = ({
  mobile = false,
  pathname,
  router,
  setSidebarOpen,
  handleLogout,
  adminName,
  adminRole,
}: SidebarContentProps) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const item of NAV_ITEMS) {
      if (item.kind === "group") {
        const hasActiveChild = item.children.some(
          (c) => pathname === c.href || pathname.startsWith(c.href + "/")
        )
        if (hasActiveChild) init[item.label] = true
      }
    }
    return init
  })
  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M12 2s-2 3-2 5h4c0-2-2-5-2-5z"
                fill="white"
                fillOpacity="0.9"
              />
              <path
                d="M8 7h8v1c0 0-1 .5-1 2v9H9V10c0-1.5-1-2-1-2V7z"
                fill="white"
                fillOpacity="0.85"
              />
              <rect
                x="4"
                y="11"
                width="4"
                height="8"
                rx="0.5"
                fill="white"
                fillOpacity="0.7"
              />
              <rect
                x="16"
                y="11"
                width="4"
                height="8"
                rx="0.5"
                fill="white"
                fillOpacity="0.7"
              />
              <rect
                x="3"
                y="19"
                width="18"
                height="1.5"
                rx="0.75"
                fill="white"
                fillOpacity="0.9"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs leading-none font-black text-foreground">
              Absen Rohis
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Admin Panel
            </p>
          </div>
        </div>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          if (item.superadminOnly && adminRole !== "superadmin") return null

          if (item.kind !== "group") {
            const Icon = item.icon
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (mobile) setSidebarOpen(false)
                  router.push(item.href)
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", active && "text-primary")}
                />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-teal-700 uppercase dark:bg-teal-900/50 dark:text-teal-300">
                    {item.badge}
                  </span>
                )}
                {active && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            )
          }

          // ── Group item ──────────────────────────────────────────────
          const Icon = item.icon
          const expanded = !!openGroups[item.label]
          const hasActiveChild = item.children.some((c) =>
            !c.superadminOnly || adminRole === "superadmin"
              ? pathname === c.href || pathname.startsWith(c.href + "/")
              : false
          )
          const visibleChildren = item.children.filter(
            (c) => !c.superadminOnly || adminRole === "superadmin"
          )
          if (visibleChildren.length === 0) return null

          return (
            <div key={item.label} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all",
                  hasActiveChild
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    hasActiveChild && "text-primary"
                  )}
                />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-1 rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-sky-700 uppercase dark:bg-sky-900/50 dark:text-sky-300">
                    {item.badge}
                  </span>
                )}
                <ChevronRight
                  className={cn(
                    "ml-auto h-3.5 w-3.5 shrink-0 transition-transform",
                    expanded && "rotate-90"
                  )}
                />
              </button>
              {expanded && (
                <div className="flex flex-col gap-0.5 py-1 pr-2 pl-7">
                  {visibleChildren.map((child) => {
                    const active =
                      pathname === child.href ||
                      pathname.startsWith(child.href + "/")
                    return (
                      <button
                        key={child.label}
                        type="button"
                        disabled={child.disabled}
                        onClick={() => {
                          if (child.disabled) return
                          if (mobile) setSidebarOpen(false)
                          router.push(child.href)
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-all",
                          child.disabled &&
                            "pointer-events-none cursor-not-allowed opacity-40",
                          active
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            active ? "bg-primary" : "bg-muted-foreground/30"
                          )}
                        />
                        <span className="truncate">{child.label}</span>
                        {child.badge && (
                          <span className="ml-auto rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-slate-600 uppercase dark:bg-slate-700 dark:text-slate-300">
                            {child.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Profile */}
      <div className="border-t border-border/50 px-3 py-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
              {adminName?.slice(0, 2).toUpperCase() || "AD"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {adminName || "Administrator"}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {adminRole || "Admin"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export function AdminShell({
  children,
  requireSuperadmin = false,
}: {
  children: React.ReactNode
  requireSuperadmin?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const redirecting = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [admin, setAdmin] = useState<SessionData | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    setMounted(true)
    let cancelled = false
    const failSafeTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn("[AdminShell] Session check timed out, forcing cleanup")
        clearAllLocalStorageSessions()
        setIsAuthorized(false)
        if (!redirecting.current) {
          redirecting.current = true
          window.location.href = "/admin"
        }
      }
    }, 15000)

    const doSessionCheck = async () => {
      try {
        const data = await fetchSession()
        if (cancelled) return
        if (data?.user) {
          setAdmin(data.user)
          if (requireSuperadmin && data.user.role !== "superadmin") {
            router.replace("/admin/dashboard")
            return
          }
          setIsAuthorized(true)
          clearTimeout(failSafeTimer)
        } else {
          throw new Error("No user")
        }
      } catch {
        if (cancelled) return
        clearSessionCache()
        clearAllLocalStorageSessions()
        clearTimeout(failSafeTimer)
        if (!redirecting.current) {
          redirecting.current = true
          window.location.href = "/admin"
        }
      }
    }
    doSessionCheck()

    return () => {
      cancelled = true
      clearTimeout(failSafeTimer)
    }
  }, [router, requireSuperadmin])

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    localStorage.removeItem("admin_session")
    localStorage.removeItem("panitia_session")
    localStorage.removeItem("siswa_session")
    window.location.href = "/admin"
  }

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden shrink-0 md:flex">
        <SidebarContent
          pathname={pathname}
          router={router}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
          adminName={admin?.nama}
          adminRole={admin?.role}
        />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-card shadow-xl transition-transform duration-300 ease-out md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          mobile
          pathname={pathname}
          router={router}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
          adminName={admin?.nama}
          adminRole={admin?.role}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 text-muted-foreground md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-foreground">
                {(() => {
                  const direct = NAV_ITEMS.find(
                    (n) =>
                      n.kind !== "group" &&
                      (pathname === n.href ||
                        (n.href !== "/admin" && pathname.startsWith(n.href)))
                  )
                  if (direct) return direct.label
                  const group = NAV_ITEMS.find(
                    (n) =>
                      n.kind === "group" &&
                      n.children.some(
                        (c) =>
                          pathname === c.href ||
                          pathname.startsWith(c.href + "/")
                      )
                  )
                  if (group) return group.label
                  if (pathname === "/admin/activity-monitor")
                    return "Activity Monitor"
                  return "Admin"
                })()}
              </h1>
              <p className="hidden text-[10px] text-muted-foreground sm:block">
                {mounted
                  ? new Date().toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <button className="relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
            </button>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-[10px] font-bold text-primary-foreground">
                  {(admin?.nama || "AD").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-semibold text-foreground sm:block">
                {admin?.nama}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-0 md:py-0">
          {children}
        </main>
      </div>

      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <LogOut className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold">
                Konfirmasi Keluar
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Apakah Anda yakin ingin keluar dari panel admin? Sesi Anda akan
                diakhiri.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex w-full gap-3">
              <Button
                variant="outline"
                onClick={() => setShowLogoutModal(false)}
                className="rounded-2x flex-1 border-border py-6 font-semibold"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={confirmLogout}
                className="rounded-2x flex-1 bg-red-600 py-6 font-semibold text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              >
                Keluar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
