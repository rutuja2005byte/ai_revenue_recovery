-- Add razorpay_payment_id column to failed_payments table
ALTER TABLE public.failed_payments 
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Optional index for faster lookups by razorpay_payment_id
CREATE INDEX IF NOT EXISTS idx_failed_payments_razorpay_id 
ON public.failed_payments (razorpay_payment_id);
