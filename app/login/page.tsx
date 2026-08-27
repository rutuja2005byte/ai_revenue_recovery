'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-8 p-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-base mt-2">Log in to your recovery dashboard</p>
        </div>
        <div className="space-y-4">
          <input
            className="w-full text-base border border-gray-200 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full text-base border border-gray-200 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-red-600 text-base">{error}</p>}
        <button
          onClick={handleLogin}
          className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-base font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Log in
        </button>
        <p className="text-base text-gray-500 text-center">
          No account? <Link href="/signup" className="text-indigo-600 font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}