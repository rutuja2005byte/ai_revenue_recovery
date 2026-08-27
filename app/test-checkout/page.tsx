'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import {
  CreditCardIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'

interface TestOrder {
  order_id: string
  amount: number
  customer_name: string
  customer_email: string
  scenario: string
  created_at: number
}

const TEST_CARDS = [
  {
    type: 'Standard / Success Test',
    cardNumber: '4111111111111111',
    expiry: '12/28',
    cvv: '123',
    instruction: 'Choose "Success" on test OTP screen',
    badge: 'bg-green-50 text-green-700',
  },
  {
    type: 'Insufficient Funds Failure',
    cardNumber: '4000000000001092',
    expiry: '12/28',
    cvv: '123',
    instruction: 'Triggers insufficient balance error or choose "Failure"',
    badge: 'bg-amber-50 text-amber-700',
  },
  {
    type: 'Expired Card Failure',
    cardNumber: '4111111111111111',
    expiry: '01/22',
    cvv: '123',
    instruction: 'Triggers card expired validation failure',
    badge: 'bg-orange-50 text-orange-700',
  },
  {
    type: 'Bank Decline Failure',
    cardNumber: '4000000000001027',
    expiry: '12/28',
    cvv: '123',
    instruction: 'Triggers bank decline error or select "Failure" on simulator',
    badge: 'bg-red-50 text-red-700',
  },
]

export default function TestCheckoutPage() {
  const [orders, setOrders] = useState<TestOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [razorpayKey, setRazorpayKey] = useState('')
  const [copiedCard, setCopiedCard] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Custom single order inputs
  const [customAmount, setCustomAmount] = useState('3500')
  const [customName, setCustomName] = useState('Aditya Roy')
  const [customEmail, setCustomEmail] = useState('aditya.roy@example.com')
  const [customScenario, setCustomScenario] = useState('insufficient_funds')
  const [customLoading, setCustomLoading] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCard(text)
    setTimeout(() => setCopiedCard(null), 2000)
  }

  const generateBatchOrders = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      const res = await fetch('/api/razorpay/generate-test-data', {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate test orders')
      }
      setOrders(data.orders || [])
      if (data.key_id) setRazorpayKey(data.key_id)
      setStatusMessage({
        type: 'success',
        text: `Successfully generated ${data.count} test orders in Razorpay test mode!`,
      })
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const openRazorpayCheckout = (order: { order_id: string; amount: number; customer_name: string; customer_email: string }) => {
    if (typeof window === 'undefined' || !(window as any).Razorpay) {
      alert('Razorpay Checkout script is still loading. Please try again in a few seconds.')
      return
    }

    const options = {
      key: razorpayKey || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_key',
      amount: order.amount * 100,
      currency: 'INR',
      name: 'AI Revenue Recovery Demo',
      description: `Test Payment for ${order.customer_name}`,
      order_id: order.order_id,
      prefill: {
        name: order.customer_name,
        email: order.customer_email,
        contact: '+919999999999',
      },
      theme: {
        color: '#4f46e5',
      },
      handler: function (response: any) {
        setStatusMessage({
          type: 'success',
          text: `Payment successful! Payment ID: ${response.razorpay_payment_id}`,
        })
      },
      modal: {
        ondismiss: function () {
          console.log('Checkout modal closed')
        },
      },
    }

    const rzp = new (window as any).Razorpay(options)
    rzp.on('payment.failed', function (response: any) {
      console.log('Payment failed:', response.error)
      setStatusMessage({
        type: 'success',
        text: `Simulated payment failure triggered (ID: ${response.error?.metadata?.payment_id || 'test_payment'}). If Razorpay webhook is connected, this is now logged into failed_payments!`,
      })
    })
    rzp.open()
  }

  const handleCustomPay = async (e: React.FormEvent) => {
    e.preventDefault()
    setCustomLoading(true)
    setStatusMessage(null)

    try {
      const res = await fetch('/api/razorpay/generate-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          single: true,
          amount: customAmount,
          name: customName,
          email: customEmail,
          scenario: customScenario,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create order')

      if (data.key_id) setRazorpayKey(data.key_id)
      openRazorpayCheckout(data.order)
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message })
    } finally {
      setCustomLoading(false)
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-200">
            <div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium mb-2"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Razorpay Test Checkout Simulator</h1>
              <p className="text-sm text-gray-500 mt-1">
                Generate real test orders and trigger simulated payment failures to verify the webhook → pipeline flow.
              </p>
            </div>
            <button
              onClick={generateBatchOrders}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Creating Orders...' : 'Generate 15 Test Orders'}
            </button>
          </div>

          {/* Status banner */}
          {statusMessage && (
            <div
              className={`p-4 rounded-xl text-sm flex items-start gap-3 ${
                statusMessage.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckIcon className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <ExclamationCircleIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>{statusMessage.text}</div>
            </div>
          )}

          {/* Test Cards Cheat Sheet */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-indigo-600" />
              Razorpay Test Cards Reference
            </h2>
            <p className="text-xs text-gray-500">
              Use these card numbers in the Razorpay popup to simulate various payment failure scenarios:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TEST_CARDS.map((card) => (
                <div key={card.type} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800">{card.type}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${card.badge}`}>
                      Test Card
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="font-mono text-sm tracking-wider text-gray-900">{card.cardNumber}</span>
                    <button
                      onClick={() => copyToClipboard(card.cardNumber)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                    >
                      {copiedCard === card.cardNumber ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <DocumentDuplicateIcon className="w-3.5 h-3.5" /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-[11px] text-gray-500 flex justify-between">
                    <span>Exp: <strong>{card.expiry}</strong></span>
                    <span>CVV: <strong>{card.cvv}</strong></span>
                    <span className="text-gray-400 italic">{card.instruction}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Custom Order */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Custom Test Checkout</h2>
            <form onSubmit={handleCustomPay} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Email</label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={customLoading}
                  className="w-full bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {customLoading ? 'Opening...' : 'Launch Checkout'}
                </button>
              </div>
            </form>
          </div>

          {/* Generated Orders List */}
          {orders.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-gray-900">
                Generated Test Orders ({orders.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                      <th className="pb-3 font-medium">Order ID</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Scenario Note</th>
                      <th className="pb-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.map((o) => (
                      <tr key={o.order_id} className="hover:bg-gray-50">
                        <td className="py-3.5 font-mono text-xs text-gray-500">{o.order_id}</td>
                        <td className="py-3.5">
                          <div className="font-medium text-gray-900">{o.customer_name}</div>
                          <div className="text-xs text-gray-400">{o.customer_email}</div>
                        </td>
                        <td className="py-3.5 font-medium text-gray-900">₹{o.amount.toLocaleString()}</td>
                        <td className="py-3.5">
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                            {o.scenario.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => openRazorpayCheckout(o)}
                            className="text-xs bg-indigo-50 text-indigo-700 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            Pay / Test Fail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
