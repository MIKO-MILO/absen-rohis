import type { NextRequest } from "next/server"

/**
 * Mendapatkan IP Address client secara aman dari request Next.js.
 * Berguna saat dideploy di Vercel atau dibelakang reverse proxy.
 */
export function getClientIp(req: Request | NextRequest): string {
  // 1. Cek x-forwarded-for
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const parts = forwardedFor.split(",")
    const firstIp = parts[0]?.trim()
    if (firstIp) return firstIp
  }

  // 2. Cek x-real-ip (Vercel / Nginx)
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp.trim()

  // Fallback default jika tidak terdeteksi
  return "127.0.0.1"
}
