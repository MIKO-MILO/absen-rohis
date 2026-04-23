"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import ClockWIB from "@/components/mycomponent/clock";
import {
  CheckCircle2,
  QrCode,
  Clock,
  ChevronRight,
  AlignLeft,
  User,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = "sudah" | "belum" | "haid";

interface RiwayatItem {
  id: number;
  tanggal: string;
  hari: string;
  waktu: string;
  status: Status;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<Status, string> = {
  sudah: "Hadir",
  belum: "Tidak Hadir",
  haid: "Haid",
};

const STATUS_STYLE: Record<Status, string> = {
  sudah:    "bg-teal-50 text-teal-700 border-teal-200",
  belum:    "bg-red-50 text-red-500 border-red-200",
  haid:"bg-amber-50 text-amber-600 border-amber-200",
};

const STATUS_DOT: Record<Status, string> = {
  sudah:    "bg-teal-400",
  belum:    "bg-red-400",
  haid:"bg-amber-400",
};

// ─── Dummy riwayat ────────────────────────────────────────────────────────────
const RIWAYAT: RiwayatItem[] = [
  { id: 1, hari: "Selasa",   tanggal: "22 Apr 2025", waktu: "12:08", status: "sudah" },
  { id: 2, hari: "Senin",    tanggal: "21 Apr 2025", waktu: "12:22", status: "haid" },
  { id: 3, hari: "Jumat",    tanggal: "18 Apr 2025", waktu: "—",     status: "belum" },
  { id: 4, hari: "Kamis",    tanggal: "17 Apr 2025", waktu: "12:05", status: "sudah" },
  { id: 5, hari: "Rabu",     tanggal: "16 Apr 2025", waktu: "—",     status: "haid" },
  { id: 6, hari: "Selasa",   tanggal: "15 Apr 2025", waktu: "12:10", status: "sudah" },
];

function getSummary(data: RiwayatItem[]) {
  return {
    hadir:    data.filter((d) => d.status === "sudah").length,
    haid:data.filter((d) => d.status === "haid").length,
    belum:    data.filter((d) => d.status === "belum").length,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AbsenSholatPage() {
  const router = useRouter();

  // Ganti ke false untuk simulasi belum absen
  const [sudahAbsen] = useState<boolean>(false);

  const summary = getSummary(RIWAYAT);

  function handleLogout(event: React.MouseEvent<HTMLDivElement>): void {
    // throw new Error("Function not implemented.");
    router.push("/");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: "linear-gradient(160deg, #f0fdf9 0%, #f8fafc 60%, #eff6ff 100%)" }}
    >
      {/* ── Header Banner ── */}
      <div
        className="w-full max-w-md relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
          borderRadius: "0 0 2rem 2rem",
          paddingBottom: "2rem",
          paddingTop: "2.5rem",
          paddingLeft: "1.25rem",
          paddingRight: "1.25rem",
        }}
      >
        {/* Decorative circles */}
        <div
          aria-hidden
          style={{
            position: "absolute", top: "-40px", right: "-40px",
            width: "160px", height: "160px", borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", bottom: "-20px", left: "-30px",
            width: "100px", height: "100px", borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        {/* User Info */}
       <div className="flex items-center gap-3 relative z-10">
  <Avatar className="w-12 h-12 ring-2 ring-white/40 ring-offset-1 ring-offset-teal-700">
    <AvatarFallback className="bg-teal-800 text-white font-bold">AH</AvatarFallback>
  </Avatar>
  <div className="flex-1 min-w-0">
    <h1 className="text-white font-semibold text-base leading-tight truncate">Aretha Safira P.</h1>
    <p className="text-white text-xs">X RPL C</p>
    <ClockWIB />
  </div>

  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="bg-white/15 rounded-xl p-2 hover:bg-white/25 transition-colors outline-none">
        <AlignLeft className="w-5 h-5 text-white" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      sideOffset={8}
      className="w-52 rounded-2xl border border-slate-100 shadow-xl p-1.5 bg-white"
    >
      {/* Header info user */}
      <DropdownMenuLabel className="px-3 py-2">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-teal-700 text-white text-xs font-bold">AH</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">Aretha Safira P.</p>
            <p className="text-[10px] text-slate-400 truncate">X RPL C</p>
          </div>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuSeparator className="bg-slate-100 my-1" />

      {/* <DropdownMenuItem
        onClick={() => router.push("/profil")}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-slate-600 hover:bg-slate-50 focus:bg-slate-50"
      >
        <User className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium">Profil Saya</span>
      </DropdownMenuItem> */}

      <DropdownMenuSeparator className="bg-slate-100 my-1" />

      <DropdownMenuItem
        onClick={handleLogout}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-red-500 hover:bg-red-50 focus:bg-red-50 focus:text-red-500"
      >
        <LogOut className="w-4 h-4" />
        <span className="text-sm font-medium">Keluar</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>

        {/* Dzuhur Status Card */}
        <div
          className="relative z-10 mt-5 rounded-2xl p-4 flex items-center justify-between"
          style={{
            background: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.25)",
          }}
        >
          <div>
            <p className="text-teal-100 text-[10px] font-semibold tracking-widest uppercase mb-0.5">
              Absensi Sholat 
            </p>
            <p className="text-white text-2xl font-black leading-none">Dzuhur</p>
            <div className="flex items-center gap-1 mt-1.5">
              <Clock className="w-3 h-3 text-teal-200" />
              <p className="text-teal-100 text-xs">12:00 - 13:00 WIB</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            {sudahAbsen ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-300 drop-shadow" />
                <span className="text-emerald-200 text-[10px] font-semibold">Sudah Absen</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-dashed border-white/40 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white/60" />
                </div>
                <span className="text-teal-200 text-[10px]">Belum Absen</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="w-full max-w-md px-4 pt-5 pb-10 flex flex-col gap-5">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Hadir",       count: summary.hadir,     color: "text-teal-500",  bg: "bg-teal-50 border-teal-400" },
            { label: "Haid",   count: summary.haid, color: "text-amber-500", bg: "bg-amber-50 border-amber-400" },
            { label: "Tidak Hadir", count: summary.belum,     color: "text-red-500",   bg: "bg-red-50 border-red-400" },
          ].map(({ label, count, color, bg }) => (
            <div
              key={label}
              className={`flex flex-col items-center py-3 rounded-2xl border ${bg}`}
            >
              <span className={`text-2xl font-black leading-none ${color}`}>{count}</span>
              <span className="text-[10px] text-slate-500 text-center leading-tight mt-1">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Tombol Scan QR ── */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => router.push("/user/scan")}
            disabled={sudahAbsen}
            className={`
              w-full h-16 rounded-2xl text-base font-bold flex items-center justify-center gap-3
              transition-all duration-200
              ${sudahAbsen
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white shadow-lg shadow-teal-200/60 active:scale-[0.98]"
              }
            `}
          >
            <QrCode className={`w-6 h-6 ${sudahAbsen ? "text-slate-400" : "text-white"}`} />
            {sudahAbsen ? "Sudah Absen Hari Ini" : "Scan QR untuk Absen"}
          </Button>

          {sudahAbsen ? (
            <p className="text-center text-xs text-slate-400" style={{ color: "green" }}>
              Anda Sudah Absen
            </p>
          ) : (
            <p className="text-center text-xs text-slate-400" style={{ color: "red" }}>
              Arahkan kamera ke QR Code yang tersedia di masjid
            </p>
          )}
        </div>

        <Separator className="bg-slate-200" />

        {/* ── Riwayat ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">Riwayat Absensi Dzuhur</h2>
          </div>

          <div className="flex flex-col gap-2">
            {RIWAYAT.map((r) => (
              <Card
                key={r.id}
                className="bg-white border border-slate-100 rounded-2xl shadow-sm"
              >
                <CardContent className="flex items-center px-4 py-3 gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[r.status]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">
                      {r.hari}, {r.tanggal}
                    </p>
                    <p className="text-xs text-slate-400">
                      {r.waktu !== "—" ? `Absen pukul ${r.waktu} WIB` : "Tidak ada catatan"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2.5 py-0.5 border font-semibold rounded-lg flex-shrink-0 ${STATUS_STYLE[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}