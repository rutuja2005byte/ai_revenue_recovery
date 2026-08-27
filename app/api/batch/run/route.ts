import { createClient } from '@/lib/supabase/server'
import { processPayment } from '@/lib/pipeline'
import { sendOwnerNotification, OwnerPaymentDetail } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: payments } = await supabase
    .from('failed_payments')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (!payments || payments.length === 0) return NextResponse.json({ error: 'no payments' }, { status: 400 })

  let recovered = 0, escalated = 0, stopped = 0
  const processedPayments: OwnerPaymentDetail[] = []
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
    processedPayments.push(result.ownerDetail)
    if (result.alert) alertsToInsert.push(result.alert)
  }

  alertsToInsert.push({
    user_id: user.id,
    message: `Batch complete: ${recovered} recovered, ${escalated} escalated, ${stopped} stopped`,
    type: 'info',
    read: false,
  })

  if (alertsToInsert.length > 0) {
    const { error: alertError } = await supabase.from('alerts').insert(alertsToInsert)
    if (alertError) {
      console.error('Failed to insert alerts:', alertError.message)
    }
  }

  if (user.email && payments.length > 0) {
    await sendOwnerNotification(user.email, {
      total: payments.length,
      recovered,
      escalated,
      stopped,
      payments: processedPayments,
    })
  }

  return NextResponse.json({ total: payments.length, recovered, escalated, stopped })
}