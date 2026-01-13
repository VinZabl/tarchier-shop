/*
  # Auto-Delete Old Payment Receipts
  
  This migration sets up automatic deletion of payment receipt images that are older than 1 day.
  
  1. Storage Policy
    - Add delete policy for payment receipts (if not exists)
  
  2. Cleanup Function
    - Create function to delete receipts older than 1 day
    - Uses storage.objects table to find and delete old files
  
  3. Scheduled Job
    - Uses pg_cron extension to run cleanup daily
    - Runs every day at 2 AM UTC
*/

-- Enable pg_cron extension if available
-- Note: This may require enabling the extension in Supabase dashboard first
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add delete policy for payment receipts if it doesn't exist
-- This allows the cleanup function to delete old receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can delete old payment receipts'
  ) THEN
    -- Allow service role to delete old receipts (older than 1 day)
    CREATE POLICY "Service role can delete old payment receipts"
    ON storage.objects
    FOR DELETE
    TO service_role
    USING (bucket_id = 'payment-receipts' AND created_at < now() - interval '1 day');
  END IF;
END $$;

-- Create function to delete old payment receipts
CREATE OR REPLACE FUNCTION cleanup_old_payment_receipts()
RETURNS TABLE(deleted_count bigint, deleted_files text[]) AS $$
DECLARE
  deleted_files_array text[];
  file_record record;
  deleted_count_var bigint := 0;
BEGIN
  -- Get list of files older than 1 day
  FOR file_record IN
    SELECT name, id
    FROM storage.objects
    WHERE bucket_id = 'payment-receipts'
      AND created_at < now() - interval '1 day'
  LOOP
    -- Delete the file
    DELETE FROM storage.objects
    WHERE id = file_record.id
      AND bucket_id = 'payment-receipts';
    
    -- Track deleted file
    deleted_files_array := array_append(deleted_files_array, file_record.name);
    deleted_count_var := deleted_count_var + 1;
  END LOOP;
  
  RETURN QUERY SELECT deleted_count_var, deleted_files_array;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION cleanup_old_payment_receipts() TO service_role;

-- Schedule the cleanup job to run daily at 2 AM UTC
-- Note: This will only work if pg_cron extension is enabled in your Supabase project
DO $$
BEGIN
  -- Remove existing job if it exists
  PERFORM cron.unschedule('cleanup-old-payment-receipts');
  
  -- Schedule new job to run daily at 2 AM UTC
  PERFORM cron.schedule(
    'cleanup-old-payment-receipts',           -- job name
    '0 2 * * *',                              -- cron schedule: daily at 2 AM UTC
    'SELECT cleanup_old_payment_receipts()'    -- SQL to execute (using single quotes)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If pg_cron is not available, log a warning
    RAISE NOTICE 'pg_cron extension may not be enabled. Please set up the cleanup job manually using Supabase Edge Functions or external cron service.';
END $$;

-- Alternative: Create a simpler version that can be called manually or via Edge Function
-- This function can be called from Supabase Edge Functions or external services
CREATE OR REPLACE FUNCTION delete_receipts_older_than_one_day()
RETURNS jsonb AS $$
DECLARE
  deleted_count integer;
  result jsonb;
BEGIN
  -- Delete files older than 1 day
  WITH deleted AS (
    DELETE FROM storage.objects
    WHERE bucket_id = 'payment-receipts'
      AND created_at < now() - interval '1 day'
    RETURNING name, id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  result := jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'timestamp', now()
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_receipts_older_than_one_day() TO service_role;
GRANT EXECUTE ON FUNCTION delete_receipts_older_than_one_day() TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_receipts_older_than_one_day() IS 
  'Deletes payment receipt images older than 1 day. Can be called manually or scheduled via Edge Functions.';
