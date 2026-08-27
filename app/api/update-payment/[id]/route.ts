import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// service role client — bypasses RLS since this is a public unauthenticated route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: payment } = await supabase.from('failed_payments').select('user_id').eq('id', id).single()
  if (!payment) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await supabase.from('failed_payments').update({ status: 'recovered' }).eq('id', id)
  await supabase.from('recovery_log').insert({
    payment_id: id, user_id: payment.user_id, step: 'act',
    action_taken: 'customer_self_update', outcome: 'success',
  })

  return NextResponse.json({ success: true })
}