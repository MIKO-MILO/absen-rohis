"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type User = {
  nama: string
  kelas: string
  nis: string
}

export default function UserPage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .limit(1)
        .single()

      if (error) {
        console.error(error)
      } else {
        console.log("USER:", data)
        setUser(data)
      }
    }

    fetchUser()
  }, [])

  if (!user) return <p>Loading...</p>

  return (
    <div className="min-h-screen bg-background p-10 text-foreground">
      <h1 className="text-2xl font-bold">Data User</h1>
      <p>Nama: {user.nama}</p>
      <p>Kelas: {user.kelas}</p>
      <p>NIS: {user.nis}</p>
    </div>
  )
}
