import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderRequest {
  type: 'pre' | 'post';
  force?: boolean;
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

    const { type, force = false }: ReminderRequest = req.method === 'POST' 
      ? await req.json() 
      : { type: 'pre' }

    // Check timing (only on Tuesday or if forced)
    const now = new Date()
    const currentDay = now.getDay()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    if (!force && currentDay !== 2) {
      return new Response(
        JSON.stringify({ 
          message: 'Not Tuesday', 
          currentTime: now.toISOString() 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const isPreReminder = type === 'pre'
    const expectedHour = isPreReminder ? 19 : 22
    const expectedMinute = isPreReminder ? 30 : 30

    if (!force && (currentHour !== expectedHour || Math.abs(currentMinute - expectedMinute) > 5)) {
      return new Response(
        JSON.stringify({ 
          message: `Not ${type} reminder time`, 
          currentTime: now.toISOString(),
          expectedTime: `${expectedHour}:${expectedMinute}`
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get current week key
    const getWeekKeyTuesday = (date: Date): string => {
      const tuesday = new Date(date)
      tuesday.setDate(date.getDate() - ((date.getDay() + 5) % 7))
      const year = tuesday.getFullYear()
      const weekNumber = Math.ceil(
        ((tuesday.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7
      )
      return `${year}-W${weekNumber.toString().padStart(2, '0')}-TUE`
    }

    const currentWeekKey = getWeekKeyTuesday(now)

    // Get participants who haven't entered data this week
    const { data: participants } = await supabaseClient
      .from('participants')
      .select('*')
      .eq('active', true)

    const { data: thisWeekEntries } = await supabaseClient
      .from('entries')
      .select('participant_id')
      .gte('recorded_at', new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 2).toISOString()) // This Tuesday

    const participantsWithEntries = new Set(
      thisWeekEntries?.map(entry => entry.participant_id) || []
    )

    const participantsNeedingReminder = participants?.filter(
      p => !participantsWithEntries.has(p.id)
    ) || []

    // Get notification subscriptions for participants' owners
    const ownerIds = [...new Set(participantsNeedingReminder.map(p => p.owner_id))]
    const { data: subscriptions } = await supabaseClient
      .from('notifications_subscriptions')
      .select('*')
      .in('owner_id', ownerIds)

    const results = []

    // Send reminders
    for (const subscription of subscriptions || []) {
      const userParticipants = participantsNeedingReminder.filter(
        p => p.owner_id === subscription.owner_id
      )

      if (userParticipants.length === 0) continue

      const reminderText = isPreReminder
        ? `Rappel HizbFollow: N'oubliez pas de saisir votre progression hebdomadaire avant ce soir 23h. ${userParticipants.length} participant(s) en attente.`
        : `HizbFollow: Dernière chance pour saisir votre progression hebdomadaire ! Vous avez encore 30 minutes. ${userParticipants.length} participant(s) en attente.`

      // Email reminder (if email available and SMTP configured)
      if (subscription.email) {
        try {
          // This would use Resend or another email service
          // For now, just log that we would send an email
          console.log(`Would send email reminder to: ${subscription.email}`)
          console.log(`Message: ${reminderText}`)
          
          results.push({
            type: 'email',
            recipient: subscription.email,
            sent: true, // Would be actual send result
            participants_count: userParticipants.length
          })
        } catch (error) {
          console.error('Email reminder failed:', error)
          results.push({
            type: 'email',
            recipient: subscription.email,
            sent: false,
            error: error.message
          })
        }
      }

      // Web push notification
      if (subscription.web_push_endpoint) {
        try {
          // This would send actual web push notification
          console.log(`Would send web push to: ${subscription.web_push_endpoint}`)
          console.log(`Message: ${reminderText}`)
          
          results.push({
            type: 'web_push',
            recipient: subscription.web_push_endpoint,
            sent: true,
            participants_count: userParticipants.length
          })
        } catch (error) {
          console.error('Web push reminder failed:', error)
          results.push({
            type: 'web_push',
            recipient: subscription.web_push_endpoint,
            sent: false,
            error: error.message
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminder_type: type,
        timestamp: now.toISOString(),
        participants_needing_reminder: participantsNeedingReminder.length,
        subscriptions_found: subscriptions?.length || 0,
        reminders_sent: results.filter(r => r.sent).length,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in reminder function:', error)
    
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