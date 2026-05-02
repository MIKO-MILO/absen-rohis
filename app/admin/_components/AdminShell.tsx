/* eslint-disable react-hooks/static-components */
"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  Users,
  QrCode,
  ClipboardList,
  LogOut,
  Bell,
  Menu,
  X,
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Data Absen", icon: ClipboardList, href: "/admin/absen" },
  { label: "Siswa", icon: Users, href: "/admin/siswa" },
  { label: "Panitia", icon: Users, href: "/admin/panitia" },
  { label: "Generate QR", icon: QrCode, href: "/admin/generate-qr" },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
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
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active =
            pathname === href ||
            (href !== "/admin" && pathname.startsWith(href))
          return (
            <button
              key={label}
              onClick={() => {
                router.push(href)
                if (mobile) setSidebarOpen(false)
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                active
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`}
              />
              {label}
              {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Profile */}
      <div className="border-t border-border/50 px-3 py-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://i.pravatar.cc/100?img=5" />
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              AD
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              Ustadz Hasan
            </p>
            <p className="text-[10px] text-muted-foreground">Administrator</p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden shrink-0 md:flex">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full">
            <SidebarContent mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
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
                {NAV_ITEMS.find(
                  (n) =>
                    pathname === n.href ||
                    (n.href !== "/admin" && pathname.startsWith(n.href))
                )?.label ?? "Admin"}
              </h1>
              <p className="hidden text-[10px] text-muted-foreground sm:block">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <button className="relative rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src="https://i.pravatar.cc/100?img=5" />
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      AD
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-xs font-semibold text-foreground sm:block">
                    Ustadz Hasan
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-2xl">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Akun Admin
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/login")}
                  className="cursor-pointer rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
