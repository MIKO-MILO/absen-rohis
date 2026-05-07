"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 transition-colors outline-none hover:bg-white/25">
          <Sun className="h-5 w-5 scale-100 rotate-0 text-muted-foreground transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-5 w-5 scale-0 rotate-90 text-muted-foreground transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-2xl border border-border bg-card p-1.5 shadow-xl"
      >
        <div className="p-1">
          <p className="mb-2 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Tema Halaman
          </p>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 transition-all ${
                theme === "light"
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Sun className="h-4 w-4" />
              <span className="text-[10px] font-medium">Terang</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center gap-1 rounded-xl py-2.5 transition-all ${
                theme === "dark"
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Moon className="h-4 w-4" />
              <span className="text-[10px] font-medium">Gelap</span>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`flex flex-col items-center gap-1 rounded-xl py-2.5 transition-all ${
                theme === "system"
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Monitor className="h-4 w-4" />
              <span className="text-[10px] font-medium">Sistem</span>
            </button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
