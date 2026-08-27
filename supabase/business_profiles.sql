-- Create business_profiles table
CREATE TABLE IF NOT EXISTS public.business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_name TEXT,
    business_email TEXT,
    business_phone TEXT,
    razorpay_key_id TEXT,
    high_value_threshold NUMERIC NOT NULL DEFAULT 50000,
    max_retry_attempts INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Row Level Security
CREATE POLICY "Users can view their own business profile"
    ON public.business_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business profile"
    ON public.business_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile"
    ON public.business_profiles
    FOR UPDATE
    USING (auth.uid() = user_id);
