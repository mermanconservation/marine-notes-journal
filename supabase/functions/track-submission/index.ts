import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    const { submissionId, email } = await req.json()

    if (!submissionId || !email) {
      return new Response(
        JSON.stringify({ error: 'Submission ID and email are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabaseAdmin
      .from('manuscript_submissions')
      .select('id, title, manuscript_type, status, created_at, corresponding_author_name')
      .eq('id', submissionId)
      .eq('corresponding_author_email', email)
      .single()

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'Submission not found or email does not match' }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    return new Response(
      JSON.stringify({ submission: data }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})
