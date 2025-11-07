import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SnapshotRequest {
  force?: boolean; // Allow manual triggering
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { force = false }: SnapshotRequest = req.method === 'POST' 
      ? await req.json() 
      : {}

    // Check if it's Tuesday and within checkpoint window (or forced)
    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 2 = Tuesday
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    if (!force && (currentDay !== 2 || currentHour < 20 || currentHour >= 23)) {
      return new Response(
        JSON.stringify({ 
          message: 'Not in checkpoint window', 
          currentTime: now.toISOString() 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate week key for current week
    const getWeekKeyTuesday = (date: Date): string => {
      const tuesday = new Date(date)
      tuesday.setDate(date.getDate() - ((date.getDay() + 5) % 7)) // Get Tuesday
      const year = tuesday.getFullYear()
      const weekNumber = Math.ceil(
        ((tuesday.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7
      )
      return `${year}-W${weekNumber.toString().padStart(2, '0')}-TUE`
    }

    const currentWeekKey = getWeekKeyTuesday(now)

    // Get all active participants
    const { data: participants, error: participantsError } = await supabaseClient
      .from('participants')
      .select('*')
      .eq('active', true)

    if (participantsError) {
      throw participantsError
    }

    const results = []

    for (const participant of participants || []) {
      try {
        // Check if snapshot already exists for this week
        const { data: existingSnapshot } = await supabaseClient
          .from('weekly_snapshots')
          .select('id')
          .eq('participant_id', participant.id)
          .eq('week_key_tuesday', currentWeekKey)
          .single()

        if (existingSnapshot && !force) {
          continue // Skip if already exists and not forced
        }

        // Get latest entry for this participant
        const { data: latestEntry } = await supabaseClient
          .from('entries')
          .select('*')
          .eq('participant_id', participant.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single()

        let value_int = 1
        let unit_type: 'hizb' | 'page' = 'hizb'
        let cycle_number = participant.cycle_number

        if (latestEntry) {
          value_int = latestEntry.value_int
          unit_type = latestEntry.unit_type
          cycle_number = latestEntry.cycle_number
        }

        // Calculate cumulative values
        const totalHizb = unit_type === 'hizb' ? value_int : Math.round(value_int * 60 / 604)
        const totalPages = unit_type === 'page' ? value_int : Math.round(value_int * 604 / 60)
        
        const cumulative_hizb = cycle_number * 60 + totalHizb
        const cumulative_pages = cycle_number * 604 + totalPages

        // Upsert snapshot
        const { data: snapshot, error: snapshotError } = await supabaseClient
          .from('weekly_snapshots')
          .upsert({
            owner_id: participant.owner_id,
            participant_id: participant.id,
            snapshot_at: now.toISOString(),
            week_key_tuesday: currentWeekKey,
            unit_type,
            value_int,
            cycle_number,
            cumulative_hizb,
            cumulative_pages
          }, {
            onConflict: 'owner_id,participant_id,week_key_tuesday'
          })
          .select()
          .single()

        if (snapshotError) {
          throw snapshotError
        }

        results.push({
          participant_id: participant.id,
          participant_name: participant.name,
          snapshot_created: true,
          value: value_int,
          unit: unit_type,
          cumulative_hizb,
          cumulative_pages
        })

      } catch (error) {
        console.error(`Error processing participant ${participant.id}:`, error)
        results.push({
          participant_id: participant.id,
          participant_name: participant.name,
          snapshot_created: false,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        week_key: currentWeekKey,
        snapshot_time: now.toISOString(),
        participants_processed: participants?.length || 0,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in snapshot function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})