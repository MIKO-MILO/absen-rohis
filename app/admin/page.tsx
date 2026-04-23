"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Loader2, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!username || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);
    // Simulasi request — ganti dengan API call nyata
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);

    if (username === "admin" && password === "admin123") {
      router.push("/admin/dashboard");
    } else {
      setError("Username atau password salah.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">

      {/* Background decoration */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(13,148,136,0.12) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="fixed bottom-0 left-0 right-0 h-64 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 120%, rgba(8,145,178,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">

          {/* Top accent bar */}
          <div
            className="h-1.5 w-full"
            style={{ background: "linear-gradient(90deg, #0d9488, #0891b2)" }}
          />

          <div className="px-7 pt-8 pb-8 flex flex-col gap-7">

            {/* Brand */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-100"
                style={{ background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)" }}
              >
                <svg viewBox="0 0 48 48" fill="none" className="w-9 h-9">
                  <path d="M24 4C24 4 20 10 20 14H28C28 10 24 4 24 4Z" fill="white" fillOpacity="0.9" />
                  <path d="M16 14H32V16C32 16 30 17 30 20V38H18V20C18 17 16 16 16 16V14Z" fill="white" fillOpacity="0.85" />
                  <rect x="8" y="22" width="8" height="16" rx="1" fill="white" fillOpacity="0.7" />
                  <rect x="32" y="22" width="8" height="16" rx="1" fill="white" fillOpacity="0.7" />
                  <rect x="6" y="38" width="36" height="3" rx="1.5" fill="white" fillOpacity="0.9" />
                  <rect x="21" y="26" width="6" height="12" rx="3" fill="rgba(13,148,136,0.5)" />
                </svg>
              </div>
              <div className="text-center">
                <h1 className="text-lg font-black text-slate-800 leading-tight">
                  Absen Rohis
                </h1>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                  <p className="text-xs font-semibold text-teal-600">Admin Panel</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                Masuk sebagai Admin
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4">

              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="username"
                  className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus-visible:ring-teal-400 focus-visible:border-teal-400 text-sm px-4"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus-visible:ring-teal-400 focus-visible:border-teal-400 text-sm px-4 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  <p className="text-red-500 text-xs font-medium">{error}</p>
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold text-sm shadow-md shadow-teal-100 active:scale-[0.98] transition-all flex items-center gap-2 mt-1"
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

            {/* Demo hint */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
              <p className="text-slate-500 text-xs font-semibold mb-1">Akun Demo</p>
              <p className="text-slate-400 text-xs">
                Username: <span className="font-bold text-slate-600">admin</span>
                &nbsp;·&nbsp;
                Password: <span className="font-bold text-slate-600">admin123</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-5">
          © 2025 Rohis · Hanya untuk Administrator
        </p>
      </div>
    </div>
  );
}