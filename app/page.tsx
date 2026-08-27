import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="max-w-6xl mx-auto w-full px-8 py-6 flex justify-between items-center">
        <span className="font-semibold text-lg">Revenue Recovery</span>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-gray-600 px-4 py-2">Log in</Link>
          <Link href="/signup" className="text-sm bg-indigo-600 text-white rounded-xl px-4 py-2">
            Sign up
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-3xl mx-auto text-center px-8 space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight">
            Find revenue that's slipping away, and win it back
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            An agent that detects failed payments, diagnoses the root cause,
            and runs a bounded recovery workflow — with a full audit trail.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-6 py-3 font-medium"
          >
            Go to dashboard <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  )
}