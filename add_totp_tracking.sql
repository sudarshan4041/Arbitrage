-- Add totp_setup_completed field to track if user has completed 2FA setup
-- Run this in Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS totp_setup_completed BOOLEAN DEFAULT false;

-- Update existing users who have totp_secret as having completed setup
-- (This assumes if they have a secret, they've used it)
UPDATE users 
SET totp_setup_completed = true 
WHERE totp_secret IS NOT NULL;