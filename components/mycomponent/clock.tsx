"use client";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export default function ClockWIB() {
  const [time, setTime] = useState(""); 

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();

      const wib = now.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setTime(wib);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

return (
  <div className="flex items-center gap-1">
    <Clock className="w-3 h-3 text-teal-200" />
    <span className="text-teal-200 text-xs">{time}</span>
  </div>
);
}