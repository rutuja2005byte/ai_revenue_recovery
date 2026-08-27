'use client'
import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function UpdatePayment() {
  const { id } = useParams()
  const [done, setDone] = useState(false)

  const handleUpdate = async () => {
    await fetch(`/api/update-payment/${id}`, { method: 'POST' })
    setDone(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center space-y-6 p-6">
        {done ? (
          <p className="text-green-700 text-lg font-medium">Payment method updated. Thank you!</p>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">Update payment method</h1>
            <p className="text-base text-gray-500">Please confirm to authorize using your updated card details.</p>
            <button
              onClick={handleUpdate}
              className="w-full bg-indigo-600 text-white rounded-xl px-7 py-3.5 text-base font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Confirm update (demo)
            </button>
          </>
        )}
      </div>
    </div>
  )
}