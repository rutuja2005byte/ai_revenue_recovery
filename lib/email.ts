import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendRecoveryEmail(paymentId: string, name: string, email: string, amount: number) {
  const updateLink = `${process.env.NEXT_PUBLIC_APP_URL}/update-payment/${paymentId}`

  const { data, error } = await resend.emails.send({
    from: 'onboarding@resend.dev', // use your verified domain later
    to: 'rutujadarade2005@gmail.com',
    subject: 'Action needed: update your payment method',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <p>Hi ${name},</p>
        <p>Your payment of ₹${amount} could not be processed because your card has expired.</p>
        <p><a href="${updateLink}" style="background:#6366f1;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;">Update payment method</a></p>
      </div>
    `
  })

  return { success: !error, error }
}

export interface OwnerPaymentDetail {
  customer_name: string
  amount: number
  failure_reason: string
  action_taken: string
  outcome: string
}

export interface OwnerBatchSummary {
  total: number
  recovered: number
  escalated: number
  stopped: number
  payments: OwnerPaymentDetail[]
}

export async function sendOwnerNotification(
  ownerEmail: string,
  summary: OwnerBatchSummary
) {
  try {
    const paymentRows = (summary.payments || []).map((p) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px 12px; font-weight: 500;">${p.customer_name}</td>
        <td style="padding: 8px 12px;">₹${p.amount}</td>
        <td style="padding: 8px 12px; color: #6b7280;">${p.failure_reason}</td>
        <td style="padding: 8px 12px; font-weight: 500;">${p.action_taken}</td>
        <td style="padding: 8px 12px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; background: ${p.outcome === 'success' ? '#dcfce7; color: #15803d' : p.outcome === 'failed' ? '#fee2e2; color: #b91c1c' : '#f3f4f6; color: #374151'};">
            ${p.outcome}
          </span>
        </td>
      </tr>
    `).join('')

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ownerEmail,
      subject: `Recovery Batch Summary: ${summary.recovered} recovered out of ${summary.total} payments`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; color: #111827; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Automated Recovery Batch Summary</h2>
          <p style="color: #4b5563; font-size: 14px; margin-bottom: 20px;">
            Here is the outcome of your latest payment recovery batch run:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f9fafb; border-radius: 6px; overflow: hidden;">
            <tr>
              <td style="padding: 12px; text-align: center; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 18px; font-weight: bold; color: #111827;">${summary.total}</div>
                <div style="font-size: 12px; color: #6b7280;">Total</div>
              </td>
              <td style="padding: 12px; text-align: center; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 18px; font-weight: bold; color: #16a34a;">${summary.recovered}</div>
                <div style="font-size: 12px; color: #6b7280;">Recovered</div>
              </td>
              <td style="padding: 12px; text-align: center; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 18px; font-weight: bold; color: #ea580c;">${summary.escalated}</div>
                <div style="font-size: 12px; color: #6b7280;">Escalated</div>
              </td>
              <td style="padding: 12px; text-align: center;">
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${summary.stopped}</div>
                <div style="font-size: 12px; color: #6b7280;">Stopped</div>
              </td>
            </tr>
          </table>

          <h3 style="font-size: 15px; margin-bottom: 12px; color: #111827;">Processed Payments</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
            <thead>
              <tr style="background: #f3f4f6; color: #374151;">
                <th style="padding: 8px 12px;">Customer</th>
                <th style="padding: 8px 12px;">Amount</th>
                <th style="padding: 8px 12px;">Failure Reason</th>
                <th style="padding: 8px 12px;">Action</th>
                <th style="padding: 8px 12px;">Outcome</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRows}
            </tbody>
          </table>
        </div>
      `,
    })

    return { success: !error, error }
  } catch (err) {
    console.error('Failed to send owner notification email:', err)
    return { success: false, error: err }
  }
}