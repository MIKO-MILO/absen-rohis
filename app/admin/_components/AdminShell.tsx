"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  QrCode,
  ClipboardList,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",   icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Data Absen",  icon: ClipboardList,   href: "/admin/absen" },
  { label: "Siswa",       icon: Users,           href: "/admin/siswa" },
  { label: "Panitia",       icon: Users,           href: "/admin/panitia" },
  { label: "Generate QR", icon: QrCode,          href: "/admin/generate-qr" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className="flex flex-col h-full bg-white border-r border-slate-100 w-60">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M12 2s-2 3-2 5h4c0-2-2-5-2-5z" fill="white" fillOpacity="0.9"/>
              <path d="M8 7h8v1c0 0-1 .5-1 2v9H9V10c0-1.5-1-2-1-2V7z" fill="white" fillOpacity="0.85"/>
              <rect x="4" y="11" width="4" height="8" rx="0.5" fill="white" fillOpacity="0.7"/>
              <rect x="16" y="11" width="4" height="8" rx="0.5" fill="white" fillOpacity="0.7"/>
              <rect x="3" y="19" width="18" height="1.5" rx="0.75" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-black text-slate-800 leading-none">Absen Rohis</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Admin Panel</p>
          </div>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <button
              key={label}
              onClick={() => { router.push(href); if (mobile) setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                active ? "bg-teal-50 text-teal-700 font-semibold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-teal-600" : ""}`} />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500" />}
            </button>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="px-3 py-4 border-t border-slate-50">
        <div className="flex items-center gap-3 px-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src="https://i.pravatar.cc/100?img=5" />
            <AvatarFallback className="bg-teal-700 text-white text-xs">AD</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">Ustadz Hasan</p>
            <p className="text-[10px] text-slate-400">Administrator</p>
          </div>
          <button onClick={() => router.push("/login")} className="text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0"><SidebarContent /></div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full"><SidebarContent mobile /></div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-100 px-4 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-slate-500 p-1">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-800">
                {NAV_ITEMS.find(n => pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href)))?.label ?? "Admin"}
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-400" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src="https://i.pravatar.cc/100?img=5" />
                    <AvatarFallback className="bg-teal-700 text-white text-xs">AD</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold text-slate-700 hidden sm:block">Ustadz Hasan</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-2xl">
                <DropdownMenuLabel className="text-xs text-slate-500">Akun Admin</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/login")} className="text-red-500 focus:text-red-500 focus:bg-red-50 rounded-xl cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}