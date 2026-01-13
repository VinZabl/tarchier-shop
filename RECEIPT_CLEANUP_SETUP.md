# Automatic Receipt Cleanup Setup Guide

This guide explains how to set up automatic deletion of payment receipt images that are older than 1 day.

## Overview

The system will automatically delete payment receipt images from the `payment-receipts` storage bucket once they are older than 24 hours. This helps manage your 1GB Supabase storage limit.

## Setup Options

You have **two options** to set up automatic cleanup:

### Option 1: Supabase Edge Function (Recommended) ⭐

This is the recommended approach as it's more reliable and easier to manage.

#### Step 1: Deploy the Edge Function

1. Make sure you have the Supabase CLI installed:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy cleanup-old-receipts
   ```

#### Step 2: Set Up Scheduled Execution

**Using Supabase Dashboard (Easiest):**

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Cron Jobs** (or **Edge Functions** → **Cron Jobs**)
3. Click **Create New Cron Job**
4. Configure:
   - **Name**: `cleanup-old-receipts-daily`
   - **Schedule**: `0 2 * * *` (runs daily at 2 AM UTC)
   - **Function**: `cleanup-old-receipts`
   - **Method**: `POST`
5. Click **Save**

**Using External Cron Service (Alternative):**

If Supabase Cron Jobs aren't available, use a free service like [cron-job.org](https://cron-job.org):

1. Sign up for a free account
2. Create a new cron job
3. Set schedule to: Daily at 2 AM (or your preferred time)
4. Set URL to:
   ```
   https://[your-project-ref].supabase.co/functions/v1/cleanup-old-receipts
   ```
5. Add header:
   - **Name**: `Authorization`
   - **Value**: `Bearer [your-anon-key]`
6. Save the cron job

#### Step 3: Test the Function

Test it manually to make sure it works:

```bash
curl -X POST https://[your-project-ref].supabase.co/functions/v1/cleanup-old-receipts \
  -H "Authorization: Bearer [your-anon-key]" \
  -H "Content-Type: application/json"
```

You should see a response like:
```json
{
  "success": true,
  "message": "Successfully deleted 3 old receipt(s)",
  "deleted_count": 3,
  "deleted_files": ["receipt-1234567890-abc.jpg", ...],
  "timestamp": "2025-01-21T10:00:00.000Z"
}
```

---

### Option 2: Database Function with pg_cron

This option uses PostgreSQL's pg_cron extension (may not be available on all Supabase plans).

#### Step 1: Run the Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20250121000000_auto_delete_old_receipts.sql`
4. Copy and paste the SQL into the editor
5. Click **Run**

**Note:** If you get an error about pg_cron not being available, use Option 1 (Edge Function) instead.

#### Step 2: Verify the Scheduled Job

Check if the cron job was created:

```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-payment-receipts';
```

#### Step 3: Test the Function Manually

Test the cleanup function:

```sql
SELECT cleanup_old_payment_receipts();
```

Or use the simpler version:

```sql
SELECT delete_receipts_older_than_one_day();
```

---

## How It Works

1. **Daily Execution**: The cleanup runs automatically every day (at 2 AM UTC by default)
2. **Age Check**: Files older than 24 hours (1 day) are identified
3. **Deletion**: Old files are permanently deleted from the `payment-receipts` bucket
4. **Logging**: The function returns a summary of deleted files

## Manual Cleanup

You can also manually trigger cleanup at any time:

### Using Edge Function:
```bash
curl -X POST https://[your-project-ref].supabase.co/functions/v1/cleanup-old-receipts \
  -H "Authorization: Bearer [your-anon-key]"
```

### Using SQL Function:
```sql
SELECT delete_receipts_older_than_one_day();
```

## Monitoring

To check how many receipts are currently stored:

1. Go to Supabase Dashboard
2. Navigate to **Storage** → **payment-receipts**
3. View the file count and total size

## Important Notes

⚠️ **Warning**: Deleted files cannot be recovered. Make sure you don't need receipts older than 1 day before enabling this.

✅ **Benefits**:
- Automatically manages storage space
- Prevents storage from filling up
- No manual intervention needed

📝 **Customization**: 
- To change the retention period (e.g., 2 days instead of 1), modify the interval in the function
- To change the schedule time, update the cron expression

## Troubleshooting

### Issue: Edge Function not found
- **Solution**: Make sure you deployed the function using `supabase functions deploy cleanup-old-receipts`

### Issue: Function returns error about permissions
- **Solution**: Check that the service role key is set correctly in the Edge Function environment variables

### Issue: pg_cron extension not available
- **Solution**: Use Option 1 (Edge Function) instead, as it doesn't require pg_cron

### Issue: Files not being deleted
- **Solution**: 
  1. Check the function logs in Supabase Dashboard
  2. Verify the files are actually older than 1 day
  3. Test the function manually to see error messages

## Support

If you encounter any issues, check:
1. Supabase Dashboard → Edge Functions → Logs
2. Supabase Dashboard → Database → Logs
3. The function response for error messages
