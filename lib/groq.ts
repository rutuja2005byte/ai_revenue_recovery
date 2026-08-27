export async function diagnosePayment(payment: {
  failure_reason: string
  amount: number
  attempt_count: number
}) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{
          role: 'user',
          content: `A payment failed. Reason: ${payment.failure_reason}. Amount: ₹${payment.amount}. 
Previous attempts: ${payment.attempt_count}.

Classify this into exactly one category: "retry_now", "retry_later", "needs_new_method", or "hard_decline".
Respond with ONLY valid JSON, no other text: {"category": "...", "confidence": 0.0-1.0, "reasoning": "one short sentence"}`
        }],
        response_format: { type: 'json_object' },
        max_tokens: 300,
      }),
    })

    if (!res.ok) {
      console.error('Groq API error:', await res.text())
      return { category: 'needs_new_method', confidence: 0.5, reasoning: 'fallback: api error' }
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { category: 'needs_new_method', confidence: 0.5, reasoning: 'fallback: parse error' }
  }
}
