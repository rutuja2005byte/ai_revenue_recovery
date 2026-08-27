import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function diagnosePayment(payment: {
  failure_reason: string
  amount: number
  attempt_count: number
}) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `A payment failed. Reason: ${payment.failure_reason}. Amount: ₹${payment.amount}. 
Previous attempts: ${payment.attempt_count}.

Classify this into exactly one category: "retry_now", "retry_later", "needs_new_method", or "hard_decline".
Respond with ONLY valid JSON, no other text: {"category": "...", "confidence": 0.0-1.0, "reasoning": "one short sentence"}`
    }]
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    return { category: 'needs_new_method', confidence: 0.5, reasoning: 'fallback: parse error' }
  }
}