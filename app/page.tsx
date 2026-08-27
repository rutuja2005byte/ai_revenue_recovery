import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="max-w-6xl mx-auto w-full px-8 py-6 flex justify-between items-center">
        <span className="font-semibold text-xl text-gray-900">Revenue Recovery</span>
        <div className="flex gap-4 items-center">
          <Link href="/login" className="text-base text-gray-600 hover:text-gray-900 px-5 py-2.5">
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-base font-medium bg-indigo-600 text-white rounded-xl px-5 py-2.5 hover:bg-indigo-700 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-3xl mx-auto text-center px-8 space-y-8 py-12">
          <h1 className="text-5xl font-semibold tracking-tight text-gray-900 leading-tight">
            Find revenue that's slipping away, and win it back
          </h1>
          <p className="text-gray-500 text-xl max-w-2xl mx-auto leading-relaxed">
            An agent that detects failed payments, diagnoses the root cause,
            and runs a bounded recovery workflow — with a full audit trail.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 bg-indigo-600 text-white rounded-xl px-7 py-3.5 text-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Go to dashboard <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}