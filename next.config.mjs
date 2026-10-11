/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["probiotic-dad-suggest.ngrok-free.dev"],

  async headers() {
    return [
      {
        // Terapkan ke semua route
        source: "/(.*)",
        headers: [
          {
            // Izinkan akses kamera (diperlukan iOS Safari)
            key: "Permissions-Policy",
            value: "camera=*, microphone=()",
          },
          // Pastikan koneksi selalu secure (iOS butuh HTTPS untuk kamera)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Khusus halaman scan — pastikan tidak di-cache agar stream segar
        source: "/user/scan",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ]
  },
}

export default nextConfig
