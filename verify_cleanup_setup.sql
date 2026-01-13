-- Verify that the cleanup functions and cron job are set up correctly

-- 1. Check if the cleanup functions exist
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname IN ('cleanup_old_payment_receipts', 'delete_receipts_older_than_one_day');

-- 2. Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 3. Check if the cron job was scheduled (if pg_cron is available)
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

-- 4. Test the function manually (this will show you if it works)
-- Uncomment the line below to test:
-- SELECT delete_receipts_older_than_one_day();
