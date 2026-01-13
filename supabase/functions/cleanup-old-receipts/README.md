# Cleanup Old Receipts Edge Function

This Edge Function automatically deletes payment receipt images that are older than 1 day from the `payment-receipts` storage bucket.

## Setup Instructions

### 1. Deploy the Edge Function

```bash
# Make sure you have Supabase CLI installed
supabase functions deploy cleanup-old-receipts
```

### 2. Set up Scheduled Execution

You have two options:

#### Option A: Using Supabase Cron Jobs (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Cron Jobs**
3. Create a new cron job:
   - **Name**: `cleanup-old-receipts-daily`
   - **Schedule**: `0 2 * * *` (runs daily at 2 AM UTC)
   - **Function**: `cleanup-old-receipts`
   - **Method**: `GET` or `POST`

#### Option B: Using External Cron Service

You can use services like:
- **cron-job.org** - Free cron service
- **EasyCron** - Free tier available
- **GitHub Actions** - If you have a GitHub repo

Set up a webhook that calls:
```
POST https://[your-project-ref].supabase.co/functions/v1/cleanup-old-receipts
Headers:
  Authorization: Bearer [your-anon-key]
```

### 3. Test the Function

You can test it manually by calling:

```bash
curl -X POST https://[your-project-ref].supabase.co/functions/v1/cleanup-old-receipts \
  -H "Authorization: Bearer [your-anon-key]" \
  -H "Content-Type: application/json"
```

## How It Works

1. Lists all files in the `payment-receipts` bucket
2. Filters files older than 1 day (24 hours)
3. Deletes the old files
4. Returns a summary of deleted files

## Response Format

**Success:**
```json
{
  "success": true,
  "message": "Successfully deleted 5 old receipt(s)",
  "deleted_count": 5,
  "deleted_files": ["receipt-1234567890-abc.jpg", ...],
  "timestamp": "2025-01-21T10:00:00.000Z"
}
```

**No files to delete:**
```json
{
  "success": true,
  "message": "No old receipts to delete",
  "deleted_count": 0
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-01-21T10:00:00.000Z"
}
```

## Notes

- The function uses the service role key for admin access to storage
- Files are permanently deleted (cannot be recovered)
- The function processes up to 1000 files per run (adjust if needed)
- Runs daily to keep storage usage low
