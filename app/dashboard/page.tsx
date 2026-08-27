'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Dashboard() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const loadData = async () => {
    const { data } = await supabase.from('failed_payments').select('*').order('created_at', { ascending: false })
    setPayments(data || [])
  }

  useEffect(() => { loadData() }, [])

  const seed = async () => {
    await fetch('/api/payments/seed', { method: 'POST' })
    loadData()
  }

  const runBatch = async () => {
    setLoading(true)
    await fetch('/api/batch/run', { method: 'POST' })
    await loadData()
    setLoading(false)
  }

  const recovered = payments.filter(p => p.status === 'recovered')
  const totalAtRisk = payments.reduce((s, p) => s + Number(p.amount), 0)
  const totalRecovered = recovered.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-8">
      <div className="flex gap-4">
        <button onClick={seed} className="bg-gray-100 rounded-xl px-4 py-2">Load Sample Payments</button>
        <button onClick={runBatch} disabled={loading} className="bg-indigo-600 text-white rounded-xl px-4 py-2">
          {loading ? 'Running...' : 'Run Recovery Batch'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total At Risk" value={`₹${totalAtRisk.toLocaleString()}`} />
        <StatCard label="Recovered" value={`₹${totalRecovered.toLocaleString()}`} />
        <StatCard label="Recovery Rate" value={`${payments.length ? Math.round((recovered.length / payments.length) * 100) : 0}%`} />
        <StatCard label="Total Records" value={payments.length} />
      </div>

      <table className="w-full text-sm">
        <thead className="text-gray-500 text-xs uppercase">
          <tr><th className="text-left py-2">Customer</th><th>Amount</th><th>Reason</th><th>Status</th></tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3">{p.customer_name}</td>
              <td className="text-center">₹{p.amount}</td>
              <td className="text-center">{p.failure_reason}</td>
              <td className="text-center">{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white shadow-sm rounded-2xl p-6">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wide text-gray-500 mt-1">{label}</p>
    </div>
  )
}