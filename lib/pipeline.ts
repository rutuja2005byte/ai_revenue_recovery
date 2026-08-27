import { diagnosePayment } from '@/lib/groq'
import { decideAction, simulateRetry } from '@/lib/rules'
import { sendRecoveryEmail, OwnerPaymentDetail } from '@/lib/email'
import { razorpay } from '@/lib/razorpay'

export interface PaymentRecord {
  id: string
  user_id?: string
  customer_name: string
  customer_email: string
  amount: number
  failure_reason: string
  attempt_count: number
  status: string
  next_retry_at?: string | null
  razorpay_payment_id?: string | null
  created_at?: string
}

export interface ProcessPaymentResult {
  payment: PaymentRecord
  diagnosis: { category: string; confidence: number; reasoning: string }
  decision: { action: string; status: string; ruleApplied: string }
  outcome: string
  newStatus: string
  newAttemptCount: number
  nextRetryAt: string | null
  isRecovered: boolean
  isEscalated: boolean
  isStopped: boolean
  ownerDetail: OwnerPaymentDetail
  alert?: {
    user_id: string
    message: string
    type: 'info' | 'warning' | 'critical'
    read: boolean
  } | null
}

export async function processPayment(
  supabase: any,
  payment: PaymentRecord,
  userId?: string
): Promise<ProcessPaymentResult> {
  const targetUserId = payment.user_id || userId

  // STEP 1: DIAGNOSE (AI Diagnosis via Groq)
  const diagnosis = await diagnosePayment({
    failure_reason: payment.failure_reason,
    amount: payment.amount,
    attempt_count: payment.attempt_count || 0,
  })

  await supabase.from('recovery_log').insert({
    payment_id: payment.id,
    user_id: targetUserId,
    step: 'diagnose',
    ai_reasoning: diagnosis.reasoning,
    action_taken: null,
    outcome: diagnosis.category,
  })

  // STEP 2: DECIDE (Deterministic Rules Engine with Business Profile settings)
  let ruleConfig = { high_value_threshold: 50000, max_retry_attempts: 3 }
  if (targetUserId) {
    try {
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('high_value_threshold, max_retry_attempts')
        .eq('user_id', targetUserId)
        .maybeSingle()
      if (profile) {
        if (profile.high_value_threshold != null) {
          ruleConfig.high_value_threshold = Number(profile.high_value_threshold)
        }
        if (profile.max_retry_attempts != null) {
          ruleConfig.max_retry_attempts = Number(profile.max_retry_attempts)
        }
      }
    } catch {
      // fallback to defaults (50000, 3)
    }
  }

  const decision = decideAction(payment, diagnosis.category, ruleConfig)
  await supabase.from('recovery_log').insert({
    payment_id: payment.id,
    user_id: targetUserId,
    step: 'decide',
    ai_reasoning: decision.ruleApplied,
    action_taken: decision.action,
    outcome: decision.status,
  })

  // STEP 3: ACT
  let outcome = 'pending'
  let newStatus = decision.status
  let newAttemptCount = (payment.attempt_count || 0) + 1
  let nextRetryAt: string | null = null
  let isRecovered = false
  let isEscalated = false
  let isStopped = false
  let alert: ProcessPaymentResult['alert'] = null
  let actReasoning: string | null = null

  if (decision.action === 'retry') {
    if (payment.razorpay_payment_id) {
      try {
        const rzpPayment = (await razorpay.payments.fetch(payment.razorpay_payment_id)) as any
        if (rzpPayment.status === 'captured' || rzpPayment.status === 'authorized') {
          outcome = 'success'
          newStatus = 'recovered'
          isRecovered = true
          actReasoning = `Razorpay API check (${payment.razorpay_payment_id}): status is ${rzpPayment.status} → recovered`
        } else {
          const success = simulateRetry()
          outcome = success ? 'success' : 'failed'
          newStatus = success ? 'recovered' : 'pending'
          if (success) isRecovered = true
          actReasoning = `Razorpay API check (${payment.razorpay_payment_id}): status is ${rzpPayment.status}, retry ${success ? 'succeeded' : 'failed'}`
        }
      } catch (err: any) {
        const success = simulateRetry()
        outcome = success ? 'success' : 'failed'
        newStatus = success ? 'recovered' : 'pending'
        if (success) isRecovered = true
        actReasoning = `Razorpay API fallback: ${err?.message || 'fetch error'}, simulated retry: ${outcome}`
      }
    } else {
      const success = simulateRetry()
      outcome = success ? 'success' : 'failed'
      newStatus = success ? 'recovered' : 'pending'
      if (success) isRecovered = true
      actReasoning = 'Simulated retry (60% demo rate for mock data)'
    }

    if (isRecovered && targetUserId) {
      alert = {
        user_id: targetUserId,
        message: `Payment of ₹${Number(payment.amount).toLocaleString()} for ${payment.customer_name} recovered automatically.`,
        type: 'info',
        read: false,
      }
    }
  } else if (decision.action === 'send_email') {
    const result = await sendRecoveryEmail(
      payment.id,
      payment.customer_name,
      payment.customer_email,
      payment.amount
    )
    outcome = result.success ? 'success' : 'failed'
    actReasoning = result.success
      ? 'Customer recovery email sent via Resend'
      : 'Failed to send recovery email'
  } else if (decision.action === 'escalate') {
    outcome = 'pending'
    isEscalated = true
    actReasoning = `Escalated: ${decision.ruleApplied}`
    if (targetUserId) {
      alert = {
        user_id: targetUserId,
        message: `Payment of ₹${Number(payment.amount).toLocaleString()} for ${payment.customer_name} was escalated.`,
        type: 'warning',
        read: false,
      }
    }
  } else if (decision.action === 'stop') {
    outcome = 'success'
    isStopped = true
    actReasoning = `Stopped: ${decision.ruleApplied}`
    if (payment.failure_reason === 'fraud_flagged' && targetUserId) {
      alert = {
        user_id: targetUserId,
        message: `Payment of ₹${Number(payment.amount).toLocaleString()} for ${payment.customer_name} stopped due to fraud detection.`,
        type: 'critical',
        read: false,
      }
    }
  } else if (decision.action === 'schedule_retry') {
    outcome = 'pending'
    nextRetryAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    actReasoning = `Retry scheduled for ${new Date(nextRetryAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`
  }

  // Audit trail log for step 'act'
  await supabase.from('recovery_log').insert({
    payment_id: payment.id,
    user_id: targetUserId,
    step: 'act',
    ai_reasoning: actReasoning,
    action_taken: decision.action,
    outcome,
  })

  // Update failed_payments row with new status and retry timestamp
  await supabase
    .from('failed_payments')
    .update({
      status: newStatus,
      attempt_count: newAttemptCount,
      next_retry_at: nextRetryAt,
    })
    .eq('id', payment.id)

  // Automatically insert outcome alert if applicable
  if (alert) {
    const { error: alertError } = await supabase.from('alerts').insert(alert)
    if (alertError) {
      console.error('Error creating pipeline outcome alert:', alertError.message)
    }
  }

  return {
    payment,
    diagnosis,
    decision,
    outcome,
    newStatus,
    newAttemptCount,
    nextRetryAt,
    isRecovered,
    isEscalated,
    isStopped,
    ownerDetail: {
      customer_name: payment.customer_name,
      amount: payment.amount,
      failure_reason: payment.failure_reason,
      action_taken: decision.action,
      outcome,
    },
    alert,
  }
}
