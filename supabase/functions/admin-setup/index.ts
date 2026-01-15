import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'GET') {
      // Check if any super admin exists
      const { data, error } = await supabaseAdmin.rpc('has_any_super_admin')
      
      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({ hasAdmin: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      // Get auth token from request
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'No authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create client with user's token to get their ID
      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid user' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if any super admin already exists using admin client
      const { data: hasAdmin, error: checkError } = await supabaseAdmin.rpc('has_any_super_admin')
      
      if (checkError) {
        throw checkError
      }

      if (hasAdmin) {
        return new Response(
          JSON.stringify({ error: 'A super admin already exists. Setup is complete.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Promote user to super admin using admin client
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ is_super_admin: true })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      return new Response(
        JSON.stringify({ success: true, message: 'You are now a super admin!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Admin setup error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
