"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Clock,
  CheckCircle2,
  Users,
  Timer,
  ShieldCheck,
} from "lucide-react";

// ─── Install: npm install qrcode ─────────────────────────────────────────────
// import QRCode from "qrcode";

// ─── Types ───────────────────────────────────────────────────────────────────
type QRStatus = "active" | "expired" | "generating";

interface AbsenRecord {
  id: number;
  nama: string;
  kelas: string;
  waktu: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────
const QR_LIFETIME_SECONDS = 60; // QR expired setelah 60 detik

// ─── Dummy live absen ────────────────────────────────────────────────────────
const DUMMY_ABSEN: AbsenRecord[] = [
  { id: 1, nama: "Aretha Safira P.",  kelas: "X RPL C",  waktu: "12:03" },
  { id: 2, nama: "Muhammad Fajar",    kelas: "X RPL A",  waktu: "12:05" },
  { id: 3, nama: "Siti Nurhaliza",    kelas: "XI IPA 2", waktu: "12:07" },
];

// ─── Helper: generate token unik ─────────────────────────────────────────────
function generateToken() {
  return `ROHIS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// ─── Helper: format sisa waktu ───────────────────────────────────────────────
function formatCountdown(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Komponen QR Canvas (menggunakan qrcode library) ────────────────────────
// Di production: ganti placeholder ini dengan QRCode.toCanvas(canvas, token)
function QRCanvas({ token, size = 220 }: { token: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !token) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Placeholder visual (ganti dengan QRCode.toCanvas di production) ──
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // Grid pattern sebagai placeholder QR
    const cell = size / 25;
    const pattern = [
      [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
      [0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0],
      [1,0,1,1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,1,0,1],
      [0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,1,0,0,1,0],
      [1,0,1,1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,1,0,1],
      [0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,1,0,0,1,0],
      [1,0,1,1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,1,0,1],
      [0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0],
      [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    ];

    const offset = 2;
    pattern.forEach((row, r) => {
      row.forEach((cell_val, c) => {
        ctx.fillStyle = cell_val ? "#0f172a" : "#ffffff";
        ctx.fillRect(
          offset * cell + c * cell,
          offset * cell + r * cell,
          cell - 0.5,
          cell - 0.5
        );
      });
    });

    // ── Production: ganti blok di atas dengan ──
    // import QRCode from "qrcode";
    // QRCode.toCanvas(canvas, token, { width: size, margin: 2 });
  }, [token, size]);

  return <canvas ref={canvasRef} className="rounded-xl" style={{ width: size, height: size }} />;
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function GenerateQRPage() {
  const router = useRouter();
  const [token, setToken] = useState<string>(() => generateToken());
  const [countdown, setCountdown] = useState(QR_LIFETIME_SECONDS);
  const [status, setStatus] = useState<QRStatus>("active");
  const [absenList, setAbsenList] = useState<AbsenRecord[]>(DUMMY_ABSEN);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Countdown timer ──────────────────────────────────────────────────────
  const startTimer = useCallback((initial = QR_LIFETIME_SECONDS) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCountdown(initial);
    setStatus("active");

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startTimer]);

  // ── Generate QR baru ─────────────────────────────────────────────────────
  const handleGenerate = () => {
    setStatus("generating");
    setTimeout(() => {
      setToken(generateToken());
      startTimer();
    }, 600);
  };

  // ── Download QR ──────────────────────────────────────────────────────────
  const handleDownload = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-dzuhur-${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.png`;
    a.click();
  };

  // ── Progress bar width ───────────────────────────────────────────────────
  const progress = (countdown / QR_LIFETIME_SECONDS) * 100;
  const isWarning = countdown <= 15;
  const isExpired = status === "expired";

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: "linear-gradient(160deg, #f0fdf9 0%, #f8fafc 60%, #f0f9ff 100%)" }}
    >
      {/* ── Header ── */}
      <div
        className="w-full max-w-md relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
          borderRadius: "0 0 2rem 2rem",
          paddingBottom: "1.75rem",
          paddingTop: "2.5rem",
          paddingLeft: "1.25rem",
          paddingRight: "1.25rem",
        }}
      >
        <div aria-hidden style={{ position:"absolute", top:"-40px", right:"-40px", width:"160px", height:"160px", borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
        <div aria-hidden style={{ position:"absolute", bottom:"-20px", left:"-30px", width:"100px", height:"100px", borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="bg-white/15 rounded-xl p-2 hover:bg-white/25 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <p className="text-teal-100 text-[10px] font-semibold tracking-widest uppercase">Admin Panel</p>
            <h1 className="text-white font-black text-lg leading-tight">Generate QR Absen</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-200" />
            <span className="text-teal-100 text-xs font-semibold">Admin</span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="w-full max-w-md px-4 pt-5 pb-10 flex flex-col gap-5">

        {/* ── QR Card ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden">
          {/* Top info bar */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-50">
            <div>
              <p className="text-xs text-slate-400 font-medium">Sholat Dzuhur</p>
              <p className="text-sm font-bold text-slate-800">
                {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <Badge
              className={`text-xs px-3 py-1 rounded-full font-bold border-0 ${
                isExpired
                  ? "bg-red-100 text-red-500"
                  : isWarning
                  ? "bg-amber-100 text-amber-600"
                  : "bg-teal-100 text-teal-700"
              }`}
            >
              {isExpired ? "Expired" : "Aktif"}
            </Badge>
          </div>

          {/* QR area */}
          <div className="flex flex-col items-center px-6 pt-5 pb-4 gap-4">
            <div
              className="relative p-4 rounded-2xl border-2 transition-all duration-300"
              style={{
                borderColor: isExpired ? "#fca5a5" : isWarning ? "#fcd34d" : "#5eead4",
                filter: isExpired ? "grayscale(1) opacity(0.4)" : "none",
              }}
            >
              {status === "generating" ? (
                <div
                  className="flex items-center justify-center bg-slate-50 rounded-xl"
                  style={{ width: 220, height: 220 }}
                >
                  <RefreshCw className="w-10 h-10 text-teal-400 animate-spin" />
                </div>
              ) : (
                <QRCanvas token={token} size={220} />
              )}

              {/* Expired overlay */}
              {isExpired && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
                  <Timer className="w-10 h-10 text-red-400 mb-2" />
                  <p className="text-red-500 font-bold text-sm">QR Kadaluarsa</p>
                  <p className="text-red-400 text-xs">Generate QR baru</p>
                </div>
              )}
            </div>

            {/* Token label */}
            <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-2 w-full justify-center">
              <p className="text-xs font-mono text-slate-500 truncate">{token}</p>
            </div>

            {/* Countdown bar */}
            <div className="w-full flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${isExpired ? "text-red-400" : isWarning ? "text-amber-500" : "text-teal-500"}`} />
                  <span className={`text-xs font-semibold ${isExpired ? "text-red-400" : isWarning ? "text-amber-600" : "text-slate-600"}`}>
                    {isExpired ? "Expired" : `Berlaku ${formatCountdown(countdown)}`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">{QR_LIFETIME_SECONDS}s total</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progress}%`,
                    background: isExpired
                      ? "#f87171"
                      : isWarning
                      ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                      : "linear-gradient(90deg, #2dd4bf, #06b6d4)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 px-5 pb-5">
            <Button
              onClick={handleGenerate}
              className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-teal-200/50"
            >
              <RefreshCw className="w-4 h-4" />
              {isExpired ? "Generate Baru" : "Perbarui QR"}
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isExpired}
              variant="outline"
              className="h-11 px-4 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Live absen counter ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-teal-700 leading-none">{absenList.length}</p>
              <p className="text-[10px] text-teal-500 mt-0.5">Sudah Absen</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 leading-none">
                {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Waktu sekarang</p>
            </div>
          </div>
        </div>

        {/* ── Live absen list ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">Absen Masuk</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs text-teal-600 font-medium">Live</span>
            </div>
          </div>

          {absenList.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Users className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-slate-400 text-sm">Belum ada yang absen</p>
              <p className="text-slate-300 text-xs mt-1">Tampil otomatis saat siswa scan QR</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {absenList.map((item) => (
                <Card key={item.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <CardContent className="flex items-center px-4 py-3 gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-teal-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.nama}</p>
                      <p className="text-xs text-slate-400">{item.kelas}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {item.waktu}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}