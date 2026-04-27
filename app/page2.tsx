'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function UserPage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1)
        .single()

      if (error) {
        console.error(error)
      } else {
        console.log('USER:', data)
        setUser(data)
      }
    }

    fetchUser()
  }, [])

  if (!user) return <p>Loading...</p>

  return (
    <div>
      <h1>Data User</h1>
      <p>Nama: {user.nama}</p>
      <p>Kelas: {user.kelas}</p>
      <p>NIS: {user.nis}</p>
    </div>
  )
}