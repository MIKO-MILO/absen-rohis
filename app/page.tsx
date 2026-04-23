"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [nis, setNis] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

const handleLogin = async () => {
  setError("");

  if (!nis || !password) {
    setError("NIS dan password wajib diisi.");
    return;
  }

  setLoading(true);
  await new Promise((r) => setTimeout(r, 1500));
  setLoading(false);

  // Routing berdasarkan NIS
  if (password === "password") {
    if (nis === "12345") {
      router.push("/user/home");
    } else if (nis === "67890") {
      router.push("/rohis/home");
    } else {
      setError("NIS tidak dikenali.");
    }
  } else {
    setError("Password salah.");
  }
};

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-[#f5f7f6] overflow-hidden">

      {/* ── Top illustration area ── */}
      <div
        className="w-full max-w-md relative flex flex-col items-center justify-end"
        style={{
          background: "linear-gradient(160deg, #0d9488 0%, #0e7490 100%)",
          borderRadius: "0 0 3rem 3rem",
          minHeight: "38vh",
          paddingBottom: "2.5rem",
          overflow: "hidden",
        }}
      >
        {/* Decorative blobs */}
        <div
          aria-hidden
          style={{
            position: "absolute", top: "-50px", right: "-50px",
            width: "200px", height: "200px", borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", top: "20px", left: "-60px",
            width: "160px", height: "160px", borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", bottom: "-30px", left: "30%",
            width: "120px", height: "120px", borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        {/* Islamic geometric ornament (CSS-drawn) */}
        <div
          aria-hidden
          className="absolute top-6 left-1/2 -translate-x-1/2"
          style={{ opacity: 0.12 }}
        >
          {[0, 45, 90, 135].map((deg) => (
            <div
              key={deg}
              style={{
                position: "absolute",
                top: "50%", left: "50%",
                width: "80px", height: "80px",
                border: "2px solid white",
                transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                borderRadius: "4px",
              }}
            />
          ))}
          <div style={{ width: "80px", height: "80px" }} />
        </div>

        {/* Brand */}
        <div className="relative z-10 flex flex-col items-center gap-2 text-center px-6">
          {/* Masjid icon (SVG inline) */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1 shadow-lg"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
          >
            <svg viewBox="0 0 48 48" fill="none" className="w-9 h-9" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4C24 4 20 10 20 14H28C28 10 24 4 24 4Z" fill="white" fillOpacity="0.9"/>
              <path d="M16 14H32V16C32 16 30 17 30 20V38H18V20C18 17 16 16 16 16V14Z" fill="white" fillOpacity="0.85"/>
              <rect x="8" y="22" width="8" height="16" rx="1" fill="white" fillOpacity="0.7"/>
              <rect x="32" y="22" width="8" height="16" rx="1" fill="white" fillOpacity="0.7"/>
              <rect x="6" y="38" width="36" height="3" rx="1.5" fill="white" fillOpacity="0.9"/>
              <rect x="21" y="26" width="6" height="12" rx="3" fill="rgba(13,148,136,0.6)"/>
            </svg>
          </div>
          <h1 className="text-white text-2xl font-black tracking-tight leading-none">
            Absen Rohis
          </h1>
          <p className="text-teal-100 text-sm">
            Sistem Absensi Sholat Dzuhur
          </p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="w-full max-w-md px-5 py-8 flex flex-col gap-6 flex-1">

        <div>
          <h2 className="text-xl font-black text-slate-800">Masuk Akun</h2>
          <p className="text-slate-400 text-sm mt-0.5">Gunakan NIS dan password kamu</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* NIS */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nis" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              NIS
            </Label>
            <Input
              id="nis"
              type="text"
              inputMode="numeric"
              placeholder="Masukkan NIS kamu"
              value={nis}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNis(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleLogin()}
              className="h-12 rounded-2xl border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus-visible:ring-teal-400 focus-visible:border-teal-400 shadow-sm text-sm px-4"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="Masukkan password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleLogin()}
                className="h-12 rounded-2xl border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus-visible:ring-teal-400 focus-visible:border-teal-400 shadow-sm text-sm px-4 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              <p className="text-red-500 text-xs font-medium">{error}</p>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-13 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold text-base shadow-lg shadow-teal-200/60 active:scale-[0.98] transition-all mt-1 flex items-center gap-2 h-12"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Masuk
              </>
            )}
          </Button>
        </div>

        {/* Hint for demo */}
        <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3">
          <p className="text-teal-600 text-xs font-semibold mb-1">Akun Demo</p>
          <p className="text-teal-500 text-xs">NIS: <span className="font-bold">12345</span> &nbsp;·&nbsp; Password: <span className="font-bold">password</span></p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="w-full max-w-md px-5 pb-8 text-center">
        <p className="text-slate-300 text-xs">
          © 2025 Rohis · Sistem Absensi Sholat
        </p>
      </div>
    </div>
  );
}