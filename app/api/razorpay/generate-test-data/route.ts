import { createClient } from '@/lib/supabase/server'
import { razorpay } from '@/lib/razorpay'
import { NextResponse } from 'next/server'

const TEST_SCENARIOS = [
  { name: 'Aditya Roy', email: 'aditya.roy@example.com', amount: 4500, scenario: 'insufficient_funds' },
  { name: 'Kavita Iyer', email: 'kavita.iyer@example.com', amount: 12000, scenario: 'card_expired' },
  { name: 'Siddharth Nair', email: 'siddharth.nair@example.com', amount: 35000, scenario: 'bank_declined' },
  { name: 'Meera Deshmukh', email: 'meera.d@example.com', amount: 850, scenario: 'network_error' },
  { name: 'Rohan Joshi', email: 'rohan.j@example.com', amount: 49500, scenario: 'bank_declined' },
  { name: 'Pooja Bhatia', email: 'pooja.b@example.com', amount: 2800, scenario: 'insufficient_funds' },
  { name: 'Vikram Malhotra', email: 'vikram.m@example.com', amount: 18500, scenario: 'card_expired' },
  { name: 'Neha Singhal', email: 'neha.s@example.com', amount: 6200, scenario: 'fraud_flagged' },
  { name: 'Manish Pandey', email: 'manish.p@example.com', amount: 1500, scenario: 'network_error' },
  { name: 'Sunita Menon', email: 'sunita.m@example.com', amount: 41000, scenario: 'bank_declined' },
  { name: 'Arjun Kapoor', email: 'arjun.k@example.com', amount: 9500, scenario: 'insufficient_funds' },
  { name: 'Divya Sen', email: 'divya.sen@example.com', amount: 3200, scenario: 'card_expired' },
  { name: 'Varun Dhawan', email: 'varun.d@example.com', amount: 24000, scenario: 'bank_declined' },
  { name: 'Shreya Ghoshal', email: 'shreya.g@example.com', amount: 14500, scenario: 'success_test' },
  { name: 'Rajesh Khanna', email: 'rajesh.k@example.com', amount: 7800, scenario: 'success_test' },
]

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: 'Razorpay keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured in .env.local' },
      { status: 400 }
    )
  }

  let body: any = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  // If a single custom order request is sent
  if (body?.single && body?.amount) {
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(Number(body.amount) * 100),
        currency: 'INR',
        receipt: `test_rcpt_${Date.now()}`,
        notes: {
          name: body.name || 'Test Customer',
          email: body.email || 'customer@example.com',
          user_id: user.id,
          scenario: body.scenario || 'manual_test',
        },
      })

      return NextResponse.json({
        success: true,
        key_id: process.env.RAZORPAY_KEY_ID,
        order: {
          order_id: order.id,
          amount: Number(body.amount),
          customer_name: body.name || 'Test Customer',
          customer_email: body.email || 'customer@example.com',
          scenario: body.scenario || 'manual_test',
          created_at: order.created_at,
        },
      })
    } catch (err: any) {
      console.error('Error creating single Razorpay order:', err)
      return NextResponse.json({ error: err?.message || 'Failed to create Razorpay order' }, { status: 500 })
    }
  }

  // Default: batch generate 15 test orders
  const createdOrders = []

  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const s = TEST_SCENARIOS[i]
    try {
      const order = await razorpay.orders.create({
        amount: s.amount * 100, // in paise
        currency: 'INR',
        receipt: `test_rcpt_${Date.now()}_${i + 1}`,
        notes: {
          name: s.name,
          email: s.email,
          user_id: user.id,
          scenario: s.scenario,
        },
      })

      createdOrders.push({
        order_id: order.id,
        amount: s.amount,
        customer_name: s.name,
        customer_email: s.email,
        scenario: s.scenario,
        created_at: order.created_at,
      })
    } catch (err: any) {
      console.error(`Error creating Razorpay order for ${s.name}:`, err)
    }
  }

  return NextResponse.json({
    success: true,
    key_id: process.env.RAZORPAY_KEY_ID,
    count: createdOrders.length,
    orders: createdOrders,
  })
}
