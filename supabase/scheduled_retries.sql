-- Add next_retry_at column to failed_payments table if it doesn't already exist
ALTER TABLE public.failed_payments 
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ DEFAULT NULL;

-- Optional index for faster cron lookups of pending scheduled retries
CREATE INDEX IF NOT EXISTS idx_failed_payments_scheduled_retry 
ON public.failed_payments (status, next_retry_at) 
WHERE status = 'pending' AND next_retry_at IS NOT NULL;
