export function decideAction(payment: {
  failure_reason: string
  amount: number
  attempt_count: number
}, category: string): { action: string; status: string; ruleApplied: string } {

  // Stopping rule 1: fraud never retried
  if (payment.failure_reason === 'fraud_flagged') {
    return { action: 'stop', status: 'stopped', ruleApplied: 'fraud_flagged → never retry' }
  }

  // Stopping rule 2: max 3 attempts
  if (payment.attempt_count >= 3) {
    return { action: 'escalate', status: 'escalated', ruleApplied: 'max_attempts_reached (3)' }
  }

  // Stopping rule 3: high value + already tried once → escalate to human
  if (payment.amount > 50000 && payment.attempt_count >= 1) {
    return { action: 'escalate', status: 'escalated', ruleApplied: 'high_value_unresolved (>₹50,000)' }
  }

  // Normal routing based on AI category
  if (category === 'retry_now') return { action: 'retry', status: 'pending', ruleApplied: 'retry_now' }
  if (category === 'retry_later') return { action: 'schedule_retry', status: 'pending', ruleApplied: 'retry_later' }
  if (category === 'needs_new_method') return { action: 'send_email', status: 'pending', ruleApplied: 'needs_new_method' }

  return { action: 'escalate', status: 'escalated', ruleApplied: 'hard_decline_fallback' }
}

export function simulateRetry(): boolean {
  return Math.random() < 0.6 // 60% success rate for demo
}