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
  for (const payment of payments) {
    const result = await processPayment(supabase, payment, user.id)
    if (result.isRecovered) recovered++
    if (result.isEscalated) escalated++
    if (result.isStopped) stopped++
    processedPayments.push(result.ownerDetail)
  }

  // Insert single batch completion summary alert
  const { error: alertError } = await supabase.from('alerts').insert({
    user_id: user.id,
    message: `Batch complete: ${recovered} recovered, ${escalated} escalated, ${stopped} stopped`,
    type: 'info',
    read: false,
  })
  if (alertError) {
    console.error('Failed to insert batch completion alert:', alertError.message)
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