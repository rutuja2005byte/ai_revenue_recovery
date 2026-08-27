'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Log in to your recovery dashboard</p>
        </div>
        <input className="w-full border border-gray-200 rounded-xl px-4 py-3"
          placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border border-gray-200 rounded-xl px-4 py-3" type="password"
          placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button onClick={handleLogin}
          className="w-full bg-indigo-600 text-white rounded-xl py-3 font-medium">
          Log in
        </button>
        <p className="text-sm text-gray-500 text-center">
          No account? <a href="/signup" className="text-indigo-600">Sign up</a>
        </p>
      </div>
    </div>
  )
}