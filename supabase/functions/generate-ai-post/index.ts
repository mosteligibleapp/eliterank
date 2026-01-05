import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================================================
// PROMPT TEMPLATES
// All prompts are centralized here for easy iteration
// =============================================================================

const BRAND_VOICE = `You are writing for EliteRank, a premium competition platform that celebrates excellence.
Your tone is authoritative but energetic—confident, celebratory, and engaging.
Keep posts concise (2-4 sentences max). Use active voice. No hashtags or emojis.`

// Event-triggered post prompts
const EVENT_PROMPTS: Record<string, (ctx: EventContext) => string> = {
  competition_launched: (ctx) => `${BRAND_VOICE}

Write a brief, exciting announcement that a new competition has launched.
Competition: ${ctx.competitionName}
Location: ${ctx.city}
Season: ${ctx.season}

Focus on building anticipation. Mention the city and invite participation.`,

  nominations_open: (ctx) => `${BRAND_VOICE}

Write a brief announcement that nominations are now open.
Competition: ${ctx.competitionName}
Location: ${ctx.city}
Nomination deadline: ${ctx.nominationEnd ? new Date(ctx.nominationEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'soon'}

Encourage people to nominate themselves or someone they know.`,

  nominations_close: (ctx) => `${BRAND_VOICE}

Write a brief announcement that the nomination period has ended.
Competition: ${ctx.competitionName}
Location: ${ctx.city}
Total nominees/contestants: ${ctx.contestantCount || 'many talented individuals'}

Build excitement for the upcoming voting phase.`,

  voting_open: (ctx) => `${BRAND_VOICE}

Write a brief, energetic announcement that voting is now open.
Competition: ${ctx.competitionName}
Location: ${ctx.city}
Number of contestants: ${ctx.contestantCount || 'our amazing contestants'}
Voting ends: ${ctx.votingEnd ? new Date(ctx.votingEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'soon'}

Rally supporters to vote for their favorites.`,

  voting_close: (ctx) => `${BRAND_VOICE}

Write a brief announcement that voting has concluded.
Competition: ${ctx.competitionName}
Location: ${ctx.city}
Total votes cast: ${ctx.totalVotes || 'thousands of votes'}

Thank voters and build anticipation for results.`,

  results_announced: (ctx) => `${BRAND_VOICE}

Write a brief, celebratory announcement that winners have been announced.
Competition: ${ctx.competitionName}
Location: ${ctx.city}
${ctx.winnerNames?.length ? `Winners: ${ctx.winnerNames.join(', ')}` : ''}

Congratulate the winners and thank all participants.`,
}

// Editorial post prompts (admin-created)
const EDITORIAL_PROMPTS: Record<string, (ctx: EditorialContext) => string> = {
  partnership: (ctx) => `${BRAND_VOICE}

Write an announcement about a new partnership or sponsorship.
Key points to include:
${ctx.bulletPoints.map(bp => `- ${bp}`).join('\n')}

Keep it professional but exciting.`,

  feature_launch: (ctx) => `${BRAND_VOICE}

Write an announcement about a new feature or platform update.
Key points to include:
${ctx.bulletPoints.map(bp => `- ${bp}`).join('\n')}

Focus on the value to users.`,

  winner_spotlight: (ctx) => `${BRAND_VOICE}

Write a spotlight feature celebrating a winner.
Winner: ${ctx.contestantName || 'our winner'}
Competition: ${ctx.competitionName || ''}
Key points to include:
${ctx.bulletPoints.map(bp => `- ${bp}`).join('\n')}

Make it personal and celebratory.`,

  company_update: (ctx) => `${BRAND_VOICE}

Write a company update or general news announcement.
Key points to include:
${ctx.bulletPoints.map(bp => `- ${bp}`).join('\n')}

Keep it informative and engaging.`,

  competition_highlight: (ctx) => `${BRAND_VOICE}

Write a highlight or update about an ongoing competition.
Competition: ${ctx.competitionName || ''}
Location: ${ctx.city || ''}
Key points to include:
${ctx.bulletPoints.map(bp => `- ${bp}`).join('\n')}

Build excitement and engagement.`,
}

// =============================================================================
// TYPES
// =============================================================================

interface EventContext {
  competitionName: string
  city: string
  season?: number
  nominationEnd?: string
  votingEnd?: string
  contestantCount?: number
  totalVotes?: number
  winnerNames?: string[]
}

interface EditorialContext {
  topicType: string
  bulletPoints: string[]
  competitionName?: string
  city?: string
  contestantName?: string
}

interface GenerateRequest {
  mode: 'event' | 'editorial'
  // For event mode
  eventType?: string
  competitionId?: string
  // For editorial mode
  topicType?: string
  bulletPoints?: string[]
  contestantId?: string // For winner spotlight
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: GenerateRequest = await req.json()
    const { mode, eventType, competitionId, topicType, bulletPoints, contestantId } = body

    let prompt: string
    let title: string

    if (mode === 'event') {
      // Event-triggered post
      if (!eventType || !competitionId) {
        throw new Error('eventType and competitionId required for event mode')
      }

      // Fetch competition data
      const { data: competition, error: compError } = await supabase
        .from('competitions')
        .select('*, contestants(id, name, status)')
        .eq('id', competitionId)
        .single()

      if (compError || !competition) {
        throw new Error(`Competition not found: ${compError?.message}`)
      }

      const winners = competition.contestants?.filter((c: any) => c.status === 'winner') || []

      const context: EventContext = {
        competitionName: `${competition.city} ${competition.season}`,
        city: competition.city,
        season: competition.season,
        nominationEnd: competition.nomination_end,
        votingEnd: competition.voting_end,
        contestantCount: competition.total_contestants || competition.contestants?.length,
        totalVotes: competition.total_votes,
        winnerNames: winners.map((w: any) => w.name),
      }

      const promptFn = EVENT_PROMPTS[eventType]
      if (!promptFn) {
        throw new Error(`Unknown event type: ${eventType}`)
      }
      prompt = promptFn(context)

      // Generate appropriate title based on event type
      const titleMap: Record<string, string> = {
        competition_launched: `${competition.city} ${competition.season} Competition Launches`,
        nominations_open: `Nominations Now Open for ${competition.city}`,
        nominations_close: `Nomination Period Closes for ${competition.city}`,
        voting_open: `Voting Opens for ${competition.city} ${competition.season}`,
        voting_close: `Voting Concludes for ${competition.city} ${competition.season}`,
        results_announced: `${competition.city} ${competition.season} Winners Announced`,
      }
      title = titleMap[eventType] || `${competition.city} Update`

    } else if (mode === 'editorial') {
      // Admin-created editorial post
      if (!topicType || !bulletPoints?.length) {
        throw new Error('topicType and bulletPoints required for editorial mode')
      }

      let context: EditorialContext = {
        topicType,
        bulletPoints,
      }

      // If contestant is specified (for winner spotlight), fetch their data
      if (contestantId) {
        const { data: contestant, error: contError } = await supabase
          .from('contestants')
          .select('*, competition:competitions(*)')
          .eq('id', contestantId)
          .single()

        if (!contError && contestant) {
          context.contestantName = contestant.name
          context.competitionName = `${contestant.competition.city} ${contestant.competition.season}`
          context.city = contestant.competition.city
        }
      }

      const promptFn = EDITORIAL_PROMPTS[topicType]
      if (!promptFn) {
        throw new Error(`Unknown topic type: ${topicType}`)
      }
      prompt = promptFn(context)

      // For editorial, we'll generate a title too
      title = '' // Will be generated by Claude

    } else {
      throw new Error('Invalid mode: must be "event" or "editorial"')
    }

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: mode === 'editorial'
              ? `${prompt}\n\nRespond with JSON in this exact format:\n{"title": "Short catchy title", "content": "The post content"}`
              : `${prompt}\n\nRespond with only the post content, no title.`,
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const error = await claudeResponse.text()
      throw new Error(`Claude API error: ${error}`)
    }

    const claudeData = await claudeResponse.json()
    const generatedText = claudeData.content[0].text.trim()

    let result: { title: string; content: string }

    if (mode === 'editorial') {
      // Parse JSON response for editorial posts
      try {
        result = JSON.parse(generatedText)
      } catch {
        // If JSON parsing fails, use the text as content
        result = { title: 'New Update', content: generatedText }
      }
    } else {
      // For event posts, we already have the title
      result = { title, content: generatedText }
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error generating AI post:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
