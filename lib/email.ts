import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendRecoveryEmail(paymentId: string, name: string, email: string, amount: number) {
  const updateLink = `${process.env.NEXT_PUBLIC_APP_URL}/update-payment/${paymentId}`

  const { data, error } = await resend.emails.send({
    from: 'onboarding@resend.dev', // use your verified domain later
    to: email,
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