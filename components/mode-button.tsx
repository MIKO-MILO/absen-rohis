"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

export function ModeButton() {
  const { setTheme, theme } = useTheme()

  return (
    <div className="p-1">
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
  )
}
