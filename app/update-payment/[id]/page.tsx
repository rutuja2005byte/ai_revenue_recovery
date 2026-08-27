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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-sm text-center space-y-4">
        {done ? (
          <p className="text-green-700">Payment method updated. Thank you!</p>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Update payment method</h1>
            <button onClick={handleUpdate} className="bg-indigo-600 text-white rounded-xl px-6 py-3">
              Confirm update (demo)
            </button>
          </>
        )}
      </div>
    </div>
  )
}