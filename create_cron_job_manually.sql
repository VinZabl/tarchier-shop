-- Manually create the cron job for cleaning up old payment receipts
-- Run this in Supabase SQL Editor

-- First, remove any existing job with the same name (if it exists)
-- Wrap in DO block to handle case where job doesn't exist
DO $$
BEGIN
  -- Try to unschedule, but don't error if it doesn't exist
  PERFORM cron.unschedule('cleanup-old-payment-receipts');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist yet, which is fine
    NULL;
END $$;

-- Create the scheduled job to run daily at 2 AM UTC
SELECT cron.schedule(
  'cleanup-old-payment-receipts',           -- job name
  '0 2 * * *',                              -- cron schedule: daily at 2 AM UTC
  'SELECT cleanup_old_payment_receipts()'    -- SQL to execute
);

-- Verify the job was created
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'cleanup-old-payment-receipts';
