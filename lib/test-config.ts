/**
 * ⚙️ KONFIGURASI TESTING TERPUSAT
 * Ganti true/false di sini untuk mengatur fitur di seluruh aplikasi
 */
export const TEST_CONFIG = {
  // 1. Mode Simulasi (Tampilkan/Sembunyikan tombol simulasi di halaman scan)
  ENABLE_SIMULATION: true,

  // 2. Aturan Satu Kali Scan (Jika false, QR & User bisa scan berkali-kali)
  ENABLE_ONE_TIME_SCAN: false,

  // 3. Batasan Waktu (Jika true, hanya bisa absen Jumat 12:00 - 14:00)
  ENABLE_TIME_RESTRICTION: false,
}

/**
 * 🕒 Fungsi untuk memeriksa apakah waktu saat ini dalam jendela absensi yang diizinkan
 * (Jumat 12:00 - 14:00 WIB)
 */
export function isWithinTimeRestriction(now?: Date): boolean {
  if (!TEST_CONFIG.ENABLE_TIME_RESTRICTION) return true

  const checkTime = now || new Date()
  const day = checkTime.getDay()
  const hour = checkTime.getHours()

  return day === 5 && hour >= 12 && hour < 14
}
