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
            // Izinkan akses kamera dari halaman scan
            key: "Permissions-Policy",
            value: "camera=*, microphone=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig
