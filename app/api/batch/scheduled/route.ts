import { createClient } from '@supabase/supabase-js'
import { processPayment } from '@/lib/pipeline'
import { NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function handleScheduledBatch() {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  // Find all pending payments whose scheduled retry time has arrived
  const { data: payments, error } = await supabase
    .from('failed_payments')
    .select('*')
    .eq('status', 'pending')
    .not('next_retry_at', 'is', null)
    .lte('next_retry_at', now)

  if (error) {
    console.error('Error fetching scheduled retry payments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!payments || payments.length === 0) {
    return NextResponse.json({ message: 'No scheduled retries due', processed: 0 })
  }

  let recovered = 0, escalated = 0, stopped = 0
  const alertsToInsert: Array<{
    user_id: string
    message: string
    type: 'info' | 'warning' | 'critical'
    read: boolean
  }> = []

  for (const payment of payments) {
    const result = await processPayment(supabase, payment)
    if (result.isRecovered) recovered++
    if (result.isEscalated) escalated++
    if (result.isStopped) stopped++
    if (result.alert) alertsToInsert.push(result.alert)
  }

  if (alertsToInsert.length > 0) {
    const { error: alertError } = await supabase.from('alerts').insert(alertsToInsert)
    if (alertError) {
      console.error('Failed to insert alerts for scheduled batch:', alertError.message)
    }
  }

  return NextResponse.json({
    success: true,
    processed: payments.length,
    recovered,
    escalated,
    stopped,
  })
}

export async function GET() {
  return handleScheduledBatch()
}

export async function POST() {
  return handleScheduledBatch()
}
