'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

type Payment = {
  id: string
  customer_name: string
  customer_email: string
  amount: number
  failure_reason: string
  attempt_count: number
  status: string
  next_retry_at?: string | null
  razorpay_payment_id?: string | null
  created_at: string
}

type LogEntry = {
  id: string
  step: string
  ai_reasoning: string | null
  action_taken: string | null
  outcome: string | null
  created_at: string
}

export default function Dashboard() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Payment | null>(null)
  const supabase = createClient()

  const loadData = async () => {
    const { data } = await supabase
      .from('failed_payments')
      .select('*')
      .order('created_at', { ascending: false })
    setPayments(data || [])
  }

  useEffect(() => {
    loadData()
  }, [])

  const seed = async () => {
    setSeeding(true)
    await fetch('/api/payments/seed', { method: 'POST' })
    await loadData()
    setSeeding(false)
  }

  const runBatch = async () => {
    setLoading(true)
    await fetch('/api/batch/run', { method: 'POST' })
    await loadData()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alerts-updated'))
    }
    setLoading(false)
  }

  const openDetail = async (payment: Payment) => {
    setSelected(payment)
    const { data } = await supabase
      .from('recovery_log')
      .select('*')
      .eq('payment_id', payment.id)
      .order('created_at', { ascending: true })
    setLogs(data || [])
  }

  const recovered = payments.filter((p) => p.status === 'recovered')
  const escalated = payments.filter((p) => p.status === 'escalated')
  const stopped = payments.filter((p) => p.status === 'stopped')
  const totalAtRisk = payments.reduce((s, p) => s + Number(p.amount), 0)
  const totalRecovered = recovered.reduce((s, p) => s + Number(p.amount), 0)
  const recoveryRate = payments.length ? Math.round((recovered.length / payments.length) * 100) : 0

  const filtered = payments.filter((p) => filter === 'all' || p.status === filter)

  return (
    <div className="max-w-6xl mx-auto px-8 py-12 space-y-12">
      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={seed}
          disabled={seeding}
          className="border border-gray-200 rounded-xl px-6 py-3 text-base font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {seeding ? 'Loading...' : 'Load Sample Payments'}
        </button>
        <button
          onClick={runBatch}
          disabled={loading || payments.filter((p) => p.status === 'pending').length === 0}
          className="bg-indigo-600 text-white rounded-xl px-6 py-3 text-base font-medium disabled:opacity-40 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          {loading ? 'Running recovery...' : 'Run Recovery Batch'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard label="Total at risk" value={`₹${totalAtRisk.toLocaleString()}`} />
        <StatCard label="Recovered" value={`₹${totalRecovered.toLocaleString()}`} />
        <StatCard label="Recovery rate" value={`${recoveryRate}%`} />
        <StatCard label="Escalated" value={escalated.length} />
        <StatCard label="Stopped" value={stopped.length} />
      </div>

      {/* Filters */}
      <div className="flex gap-8 border-b border-gray-100 pb-3.5">
        {['all', 'pending', 'recovered', 'escalated', 'stopped'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-base capitalize pb-2.5 border-b-2 -mb-4 transition-colors ${
              filter === f ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <table className="w-full text-base">
        <thead>
          <tr className="text-gray-500 text-sm uppercase tracking-wide">
            <th className="text-left py-3 font-medium">Customer</th>
            <th className="text-left py-3 font-medium">Amount</th>
            <th className="text-left py-3 font-medium">Reason</th>
            <th className="text-left py-3 font-medium">Attempts</th>
            <th className="text-left py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr
              key={p.id}
              onClick={() => openDetail(p)}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="py-5">
                <div className="font-medium text-gray-900">{p.customer_name}</div>
                <div className="text-gray-400 text-sm">{p.customer_email}</div>
              </td>
              <td className="py-5 font-medium text-gray-900">₹{Number(p.amount).toLocaleString()}</td>
              <td className="py-5 text-gray-500 capitalize">{p.failure_reason.replace(/_/g, ' ')}</td>
              <td className="py-5 text-gray-500">{p.attempt_count}</td>
              <td className="py-5">
                <StatusPill status={p.status} />
                {p.status === 'pending' && p.next_retry_at && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Retry scheduled: {new Date(p.next_retry_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-20 text-base">No records yet — load sample payments to begin.</p>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-6 z-50" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-8 space-y-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold text-xl text-gray-900">{selected.customer_name}</h2>
                <p className="text-gray-500 text-base mt-0.5">₹{Number(selected.amount).toLocaleString()} · {selected.failure_reason.replace(/_/g, ' ')}</p>
              </div>
              <StatusPill status={selected.status} />
            </div>

            <div className="space-y-4 pt-2">
              <p className="text-sm uppercase tracking-wide text-gray-400 font-medium">Audit trail</p>
              {logs.map((log) => (
                <div key={log.id} className="border-l-2 border-gray-100 pl-4 py-1.5">
                  <p className="text-sm text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                  <p className="text-base font-medium capitalize text-gray-900 mt-0.5">{log.step}{log.action_taken ? ` → ${log.action_taken.replace(/_/g, ' ')}` : ''}</p>
                  {log.ai_reasoning && <p className="text-base text-gray-600 mt-1">{log.ai_reasoning}</p>}
                  {log.outcome && <p className="text-sm text-gray-400 mt-1">outcome: {log.outcome}</p>}
                </div>
              ))}
              {logs.length === 0 && <p className="text-base text-gray-400">No actions taken yet.</p>}
            </div>

            <button onClick={() => setSelected(null)} className="text-base font-medium text-gray-500 hover:text-gray-900 pt-2">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white shadow-sm rounded-2xl p-7 border border-gray-100/80">
      <p className="text-4xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm uppercase tracking-wide text-gray-500 mt-2 font-medium">{label}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    recovered: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircleIcon, label: 'Recovered' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: ClockIcon, label: 'Pending' },
    escalated: { bg: 'bg-orange-50', text: 'text-orange-700', icon: ExclamationTriangleIcon, label: 'Escalated' },
    stopped: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircleIcon, label: 'Stopped' },
  }
  const c = config[status] || config.pending
  const Icon = c.icon

  return (
    <span className={`inline-flex items-center gap-1.5 ${c.bg} ${c.text} text-sm font-medium px-3.5 py-1.5 rounded-full`}>
      <Icon className="w-4 h-4" />
      {c.label}
    </span>
  )
}