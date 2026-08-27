export async function diagnosePayment(payment: {
  failure_reason: string
  amount: number
  attempt_count: number
}) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'user',
          content: `A payment failed. Reason: ${payment.failure_reason}. Amount: ₹${payment.amount}. Previous attempts: ${payment.attempt_count}.

Classify this into exactly one category: "retry_now", "retry_later", "needs_new_method", or "hard_decline".

Respond with ONLY a valid JSON object, no other text, no markdown, no explanation:
{"category": "retry_now", "confidence": 0.9, "reasoning": "short reason here"}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    }),
  })

  const data = await response.json()

  if (data.error) {
    console.error('Groq API error:', JSON.stringify(data))
    return { category: 'needs_new_method', confidence: 0.5, reasoning: 'fallback: API error' }
  }

  const text = data.choices?.[0]?.message?.content || '{}'
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    console.error('Failed to parse Groq response:', text)
    return { category: 'needs_new_method', confidence: 0.5, reasoning: 'fallback: parse error' }
  }
}