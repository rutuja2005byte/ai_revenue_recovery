export interface RuleConfig {
  high_value_threshold?: number
  max_retry_attempts?: number
}

export function decideAction(
  payment: {
    failure_reason: string
    amount: number
    attempt_count: number
  },
  category: string,
  config?: RuleConfig
): { action: string; status: string; ruleApplied: string } {
  const maxAttempts = config?.max_retry_attempts ?? 3
  const highValueThreshold = config?.high_value_threshold ?? 50000

  // Stopping rule 1: fraud never retried
  if (payment.failure_reason === 'fraud_flagged') {
    return { action: 'stop', status: 'stopped', ruleApplied: 'fraud_flagged → never retry' }
  }

  // Stopping rule 2: max attempts reached
  if (payment.attempt_count >= maxAttempts) {
    return { action: 'escalate', status: 'escalated', ruleApplied: `max_attempts_reached (${maxAttempts})` }
  }

  // Stopping rule 3: high value + already tried once → escalate to human
  if (payment.amount > highValueThreshold && payment.attempt_count >= 1) {
    return {
      action: 'escalate',
      status: 'escalated',
      ruleApplied: `high_value_unresolved (>₹${highValueThreshold.toLocaleString()})`,
    }
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