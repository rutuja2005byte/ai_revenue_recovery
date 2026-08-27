'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async () => {
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 1500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-8 p-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-base mt-2">Start recovering lost revenue</p>
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
        {success && <p className="text-green-700 text-base font-medium">Account created. Redirecting...</p>}
        <button
          onClick={handleSignup}
          className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-base font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Sign up
        </button>
        <p className="text-base text-gray-500 text-center">
          Already have an account? <Link href="/login" className="text-indigo-600 font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}