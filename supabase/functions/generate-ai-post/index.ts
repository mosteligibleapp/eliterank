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

interface EditorialContext {
  topicType: string
  bulletPoints: string[]
  competitionName?: string
  city?: string
  contestantName?: string
}

interface GenerateRequest {
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create a client with the user's JWT to verify authentication
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Super admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const body: GenerateRequest = await req.json()
    const { topicType, bulletPoints, contestantId } = body

    if (!topicType || !bulletPoints?.length) {
      throw new Error('topicType and bulletPoints required')
    }

    const context: EditorialContext = {
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
    const prompt = promptFn(context)

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
            content: `${prompt}\n\nRespond with JSON in this exact format:\n{"title": "Short catchy title", "content": "The post content"}`,
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
    try {
      result = JSON.parse(generatedText)
    } catch {
      result = { title: 'New Update', content: generatedText }
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
