import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const names = ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Reddy', 'Vikram Singh']
const reasons = ['insufficient_funds', 'card_expired', 'bank_declined', 'network_error', 'fraud_flagged']

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const payments = Array.from({ length: 25 }, (_, i) => ({
    user_id: user.id,
    customer_name: names[i % names.length],
    customer_email: `customer${i}@example.com`, // replace with your real test email to actually see emails
    amount: Math.floor(Math.random() * 45000) + 500,
    failure_reason: reasons[Math.floor(Math.random() * reasons.length)],
    attempt_count: 0,
    status: 'pending',
  }))

  const { error } = await supabase.from('failed_payments').insert(payments)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, count: payments.length })
}