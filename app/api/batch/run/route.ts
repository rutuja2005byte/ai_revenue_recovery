import { createClient } from '@/lib/supabase/server'
import { diagnosePayment } from '@/lib/claude'
import { decideAction, simulateRetry } from '@/lib/rules'
import { sendRecoveryEmail } from '@/lib/email'
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

  if (!payments) return NextResponse.json({ error: 'no payments' }, { status: 400 })

  let recovered = 0, escalated = 0, stopped = 0

  for (const payment of payments) {
    // STEP 1: DIAGNOSE
    const diagnosis = await diagnosePayment(payment)
    await supabase.from('recovery_log').insert({
      payment_id: payment.id, user_id: user.id, step: 'diagnose',
      ai_reasoning: diagnosis.reasoning, action_taken: null, outcome: diagnosis.category,
    })

    // STEP 2: DECIDE (deterministic rules)
    const decision = decideAction(payment, diagnosis.category)
    await supabase.from('recovery_log').insert({
      payment_id: payment.id, user_id: user.id, step: 'decide',
      ai_reasoning: decision.ruleApplied, action_taken: decision.action, outcome: decision.status,
    })

    // STEP 3: ACT
    let outcome = 'pending'
    let newStatus = decision.status
    let newAttemptCount = payment.attempt_count + 1

    if (decision.action === 'retry') {
      const success = simulateRetry()
      outcome = success ? 'success' : 'failed'
      newStatus = success ? 'recovered' : 'pending'
      if (success) recovered++
    } else if (decision.action === 'send_email') {
      const result = await sendRecoveryEmail(payment.id, payment.customer_name, payment.customer_email, payment.amount)
      outcome = result.success ? 'success' : 'failed'
    } else if (decision.action === 'escalate') {
      outcome = 'pending'
      escalated++
    } else if (decision.action === 'stop') {
      outcome = 'success'
      stopped++
    } else if (decision.action === 'schedule_retry') {
      outcome = 'pending'
    }

    await supabase.from('recovery_log').insert({
      payment_id: payment.id, user_id: user.id, step: 'act',
      action_taken: decision.action, outcome,
    })

    await supabase.from('failed_payments').update({
      status: newStatus,
      attempt_count: newAttemptCount,
    }).eq('id', payment.id)
  }

  return NextResponse.json({ total: payments.length, recovered, escalated, stopped })
}