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
    <div className="max-w-6xl mx-auto px-8 py-10 space-y-10">
      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={seed}
          disabled={seeding}
          className="border border-gray-200 rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          {seeding ? 'Loading...' : 'Load Sample Payments'}
        </button>
        <button
          onClick={runBatch}
          disabled={loading || payments.filter((p) => p.status === 'pending').length === 0}
          className="bg-indigo-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          {loading ? 'Running recovery...' : 'Run Recovery Batch'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total at risk" value={`₹${totalAtRisk.toLocaleString()}`} />
        <StatCard label="Recovered" value={`₹${totalRecovered.toLocaleString()}`} />
        <StatCard label="Recovery rate" value={`${recoveryRate}%`} />
        <StatCard label="Escalated" value={escalated.length} />
        <StatCard label="Stopped" value={stopped.length} />
      </div>

      {/* Filters */}
      <div className="flex gap-6 border-b border-gray-100 pb-3">
        {['all', 'pending', 'recovered', 'escalated', 'stopped'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm capitalize pb-2 border-b-2 -mb-3 ${
              filter === f ? 'border-indigo-600 text-indigo-600 font-medium' : 'border-transparent text-gray-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs uppercase tracking-wide">
            <th className="text-left py-2 font-medium">Customer</th>
            <th className="text-left py-2 font-medium">Amount</th>
            <th className="text-left py-2 font-medium">Reason</th>
            <th className="text-left py-2 font-medium">Attempts</th>
            <th className="text-left py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr
              key={p.id}
              onClick={() => openDetail(p)}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            >
              <td className="py-4">
                <div className="font-medium">{p.customer_name}</div>
                <div className="text-gray-400 text-xs">{p.customer_email}</div>
              </td>
              <td className="py-4">₹{Number(p.amount).toLocaleString()}</td>
              <td className="py-4 text-gray-500">{p.failure_reason.replace(/_/g, ' ')}</td>
              <td className="py-4 text-gray-500">{p.attempt_count}</td>
              <td className="py-4">
                <StatusPill status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-16 text-sm">No records yet — load sample payments to begin.</p>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-6 z-50" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold text-lg">{selected.customer_name}</h2>
                <p className="text-gray-400 text-sm">₹{Number(selected.amount).toLocaleString()} · {selected.failure_reason.replace(/_/g, ' ')}</p>
              </div>
              <StatusPill status={selected.status} />
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">Audit trail</p>
              {logs.map((log) => (
                <div key={log.id} className="border-l-2 border-gray-100 pl-4 py-1">
                  <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                  <p className="text-sm font-medium capitalize">{log.step}{log.action_taken ? ` → ${log.action_taken.replace(/_/g, ' ')}` : ''}</p>
                  {log.ai_reasoning && <p className="text-sm text-gray-500 mt-0.5">{log.ai_reasoning}</p>}
                  {log.outcome && <p className="text-xs text-gray-400 mt-0.5">outcome: {log.outcome}</p>}
                </div>
              ))}
              {logs.length === 0 && <p className="text-sm text-gray-400">No actions taken yet.</p>}
            </div>

            <button onClick={() => setSelected(null)} className="text-sm text-gray-500 pt-2">
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
    <div className="bg-white shadow-sm rounded-2xl p-6">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wide text-gray-500 mt-1">{label}</p>
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
    <span className={`inline-flex items-center gap-1.5 ${c.bg} ${c.text} text-xs font-medium px-3 py-1.5 rounded-full`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  )
}