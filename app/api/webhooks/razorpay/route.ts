import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
}

function mapRazorpayFailureReason(
  errorCode?: string,
  errorDescription?: string,
  errorReason?: string
): string {
  const combined = `${errorCode || ''} ${errorDescription || ''} ${errorReason || ''}`.toLowerCase()

  if (combined.includes('fraud') || combined.includes('risk') || combined.includes('blacklisted')) {
    return 'fraud_flagged'
  }
  if (
    combined.includes('insufficient') ||
    combined.includes('low_balance') ||
    combined.includes('balance')
  ) {
    return 'insufficient_funds'
  }
  if (
    combined.includes('expired') ||
    combined.includes('card_expired') ||
    combined.includes('expiry')
  ) {
    return 'card_expired'
  }
  if (
    combined.includes('network') ||
    combined.includes('timeout') ||
    combined.includes('gateway') ||
    combined.includes('timed_out') ||
    combined.includes('connection')
  ) {
    return 'network_error'
  }
  if (
    combined.includes('decline') ||
    combined.includes('rejected') ||
    combined.includes('unauthorized') ||
    combined.includes('blocked') ||
    combined.includes('bank')
  ) {
    return 'bank_declined'
  }

  return 'bank_declined'
}

export async function POST(req: Request) {
  const signature = req.headers.get('x-razorpay-signature')
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret configuration' },
      { status: 401 }
    )
  }

  const rawBody = await req.text()

  const isValid = verifySignature(rawBody, signature, webhookSecret)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  // We only handle payment.failed events
  if (event.event !== 'payment.failed') {
    return NextResponse.json({ received: true, ignored: true })
  }

  const paymentEntity = event.payload?.payment?.entity
  if (!paymentEntity) {
    return NextResponse.json({ error: 'Missing payment entity in payload' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // Determine user_id to associate with this webhook payment (prefer notes.user_id from generated test orders)
  let userId =
    paymentEntity.notes?.user_id ||
    (process.env.RAZORPAY_TEST_USER_ID !== 'your_test_user_id' ? process.env.RAZORPAY_TEST_USER_ID : null)

  if (!userId) {
    // Fallback to the first existing user in failed_payments if test user id not configured yet
    const { data: sample } = await supabase
      .from('failed_payments')
      .select('user_id')
      .limit(1)
      .single()
    if (sample?.user_id) {
      userId = sample.user_id
    }
  }

  if (!userId) {
    console.error('No target user_id configured for Razorpay webhook insertion')
    return NextResponse.json(
      { error: 'No user_id configured to associate payment with' },
      { status: 500 }
    )
  }

  // Extract payment details
  const customerName =
    paymentEntity.notes?.name ||
    paymentEntity.notes?.customer_name ||
    paymentEntity.card?.name ||
    (paymentEntity.email ? paymentEntity.email.split('@')[0] : 'Razorpay Customer')

  const customerEmail = paymentEntity.email || 'customer@example.com'
  const amountInRupees = Math.round(Number(paymentEntity.amount || 0) / 100)
  const failureReason = mapRazorpayFailureReason(
    paymentEntity.error_code,
    paymentEntity.error_description,
    paymentEntity.error_reason
  )

  const { data, error } = await supabase.from('failed_payments').insert({
    user_id: userId,
    customer_name: customerName,
    customer_email: customerEmail,
    amount: amountInRupees,
    failure_reason: failureReason,
    attempt_count: 0,
    status: 'pending',
    razorpay_payment_id: paymentEntity.id,
  })

  if (error) {
    console.error('Error inserting failed payment from Razorpay webhook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create an in-app alert for the newly detected failed payment
  const alertMessage = `New failed payment detected: ${customerName} - ₹${amountInRupees.toLocaleString()}`
  const { error: alertError } = await supabase.from('alerts').insert({
    user_id: userId,
    message: alertMessage,
    type: 'info',
    read: false,
  })

  if (alertError) {
    console.error('Error creating alert for Razorpay failed payment:', alertError.message)
  }

  return NextResponse.json({ success: true, payment_id: paymentEntity.id })
}
