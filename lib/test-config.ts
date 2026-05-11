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

  // 4. Auto mark tidak hadir (Jika true, user yang belum absen setelah 14:00 Jumat otomatis tidak hadir)
  ENABLE_FORGOT_SIGN_IN: false,
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

/**
 * 🕒 Fungsi untuk memeriksa apakah waktu sudah melewati batas absensi
 * (Lebih dari 14:00 pada hari Jumat)
 */
export function isPastAbsensiTime(now?: Date): boolean {
  if (!TEST_CONFIG.ENABLE_TIME_RESTRICTION) return false

  const checkTime = now || new Date()
  const day = checkTime.getDay()
  const hour = checkTime.getHours()

  return day === 5 && hour >= 14
}

/**
 * 📋 Fungsi untuk menentukan apakah user dianggap tidak hadir
 * (Jika waktu sudah lewat dan user belum absen)
 */
export function shouldMarkAsTidakHadir(
  sudahAbsen: boolean,
  now?: Date
): boolean {
  if (!TEST_CONFIG.ENABLE_FORGOT_SIGN_IN) return false

  return isPastAbsensiTime(now) && !sudahAbsen
}
