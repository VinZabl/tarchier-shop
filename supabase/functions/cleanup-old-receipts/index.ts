// Supabase Edge Function to automatically delete payment receipts older than 1 day
// This function should be scheduled to run daily using Supabase Cron Jobs or external scheduler

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Calculate cutoff time (1 day ago)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    // Get all files in payment-receipts bucket (handle pagination)
    let allFiles: any[] = []
    let hasMore = true
    let offset = 0
    const limit = 1000

    while (hasMore) {
      const { data: files, error: listError } = await supabase.storage
        .from('payment-receipts')
        .list('', {
          limit: limit,
          offset: offset,
          sortBy: { column: 'created_at', order: 'asc' }
        })

      if (listError) {
        throw listError
      }

      if (!files || files.length === 0) {
        hasMore = false
        break
      }

      // Filter files older than 1 day
      const oldFiles = files.filter(file => {
        if (!file.created_at) return false
        const fileDate = new Date(file.created_at)
        return fileDate < oneDayAgo
      })

      allFiles = allFiles.concat(oldFiles)

      // If we got less than the limit, we've reached the end
      // Also stop if we encounter files newer than 1 day (since sorted by created_at)
      if (files.length < limit) {
        hasMore = false
      } else {
        // Check if the last file is still old (if not, we can stop)
        const lastFile = files[files.length - 1]
        if (lastFile.created_at) {
          const lastFileDate = new Date(lastFile.created_at)
          if (lastFileDate >= oneDayAgo) {
            hasMore = false
          }
        }
        offset += limit
      }
    }

    if (allFiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No old receipts to delete',
          deleted_count: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Delete old files in batches (Supabase has limits on batch size)
    const batchSize = 100
    let totalDeleted = 0
    const deletedFileNames: string[] = []

    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize)
      const filePaths = batch.map(file => file.name)
      
      const { error: deleteError } = await supabase.storage
        .from('payment-receipts')
        .remove(filePaths)

      if (deleteError) {
        throw deleteError
      }

      totalDeleted += batch.length
      deletedFileNames.push(...filePaths)
    }

    if (deleteError) {
      throw deleteError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${totalDeleted} old receipt(s)`,
        deleted_count: totalDeleted,
        deleted_files: deletedFileNames,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error cleaning up old receipts:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to cleanup old receipts',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
