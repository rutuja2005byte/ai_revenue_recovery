'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  KeyIcon,
  CurrencyRupeeIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [razorpayKeyId, setRazorpayKeyId] = useState('')
  const [highValueThreshold, setHighValueThreshold] = useState('50000')
  const [maxRetryAttempts, setMaxRetryAttempts] = useState('3')

  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setBusinessEmail(user.email || '')
        const { data: profile } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (profile) {
          if (profile.business_name) setBusinessName(profile.business_name)
          if (profile.business_email) setBusinessEmail(profile.business_email)
          if (profile.business_phone) setBusinessPhone(profile.business_phone)
          if (profile.razorpay_key_id) setRazorpayKeyId(profile.razorpay_key_id)
          if (profile.high_value_threshold != null)
            setHighValueThreshold(String(profile.high_value_threshold))
          if (profile.max_retry_attempts != null)
            setMaxRetryAttempts(String(profile.max_retry_attempts))
        }
      }
      setLoading(false)
    }

    loadProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('You must be logged in to save settings.')

      const payload = {
        user_id: user.id,
        business_name: businessName.trim() || null,
        business_email: businessEmail.trim() || null,
        business_phone: businessPhone.trim() || null,
        razorpay_key_id: razorpayKeyId.trim() || null,
        high_value_threshold: Number(highValueThreshold) || 50000,
        max_retry_attempts: Number(maxRetryAttempts) || 3,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('business_profiles')
        .upsert(payload, { onConflict: 'user_id' })

      if (error) throw error

      setMessage({ type: 'success', text: 'Business settings saved successfully.' })
    } catch (err: any) {
      console.error('Error saving business profile:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return key
    return `${key.slice(0, 6)}••••••••${key.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-16 text-center text-sm text-gray-400">
        Loading settings...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-12 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Business Settings</h1>
        <p className="text-base text-gray-500 mt-2">
          Configure your business profile, payment gateways, and automated recovery rules.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-base flex items-start gap-3.5 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckIcon className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>{message.text}</div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Business Details Section */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 space-y-7">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2.5">
              <BuildingOfficeIcon className="w-6 h-6 text-indigo-600" />
              General Business Info
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Used in customer-facing recovery communications and emails.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Acme SaaS Technologies"
                className="w-full text-base border border-gray-200 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  placeholder="billing@yourcompany.com"
                  className="w-full text-base border border-gray-200 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Phone (Optional)
              </label>
              <input
                type="text"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full text-base border border-gray-200 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Payment Integration Section */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 space-y-7">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2.5">
              <KeyIcon className="w-6 h-6 text-indigo-600" />
              Payment Gateway Credentials
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Razorpay API credentials used for auto-recovery retries and order verification.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razorpay Key ID
            </label>
            <input
              type="text"
              value={razorpayKeyId}
              onChange={(e) => setRazorpayKeyId(e.target.value)}
              placeholder="rzp_test_..."
              className="w-full font-mono text-base border border-gray-200 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {razorpayKeyId && (
              <p className="text-xs text-gray-400 mt-1.5">
                Active identifier: <span className="font-mono">{maskKey(razorpayKeyId)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Automated Recovery Rules Section */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 space-y-7">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2.5">
              <ArrowPathIcon className="w-6 h-6 text-indigo-600" />
              Recovery Rules Engine Configuration
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Customize threshold parameters applied by the deterministic recovery engine.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                High-Value Threshold (₹)
              </label>
              <input
                type="number"
                value={highValueThreshold}
                onChange={(e) => setHighValueThreshold(e.target.value)}
                min="0"
                step="1000"
                className="w-full text-base border border-gray-200 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Payments exceeding this amount are escalated to a human after 1 unresolved attempt (default: ₹50,000).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Retry Attempts
              </label>
              <input
                type="number"
                value={maxRetryAttempts}
                onChange={(e) => setMaxRetryAttempts(e.target.value)}
                min="1"
                max="10"
                className="w-full text-base border border-gray-200 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Maximum automatic retry attempts before escalating to manual intervention (default: 3).
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white rounded-xl px-7 py-3 text-base font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
