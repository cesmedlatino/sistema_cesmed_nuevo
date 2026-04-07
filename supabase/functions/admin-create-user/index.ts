import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify the requesting user is authenticated and is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's token to verify they're authenticated
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify user's token
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token)
    
    if (claimsError || !claimsData?.user) {
      console.log('Invalid token:', claimsError)
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestingUserId = claimsData.user.id
    console.log('Request from user:', requestingUserId)

    // Verify the requesting user is an admin
    const { data: adminCheck, error: adminError } = await userClient
      .from('usuario')
      .select('rol')
      .eq('auth_user_id', requestingUserId)
      .single()

    if (adminError || !adminCheck || adminCheck.rol !== 'administrador') {
      console.log('User is not an admin:', adminError, adminCheck)
      return new Response(
        JSON.stringify({ error: 'No tiene permisos de administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, password, personal_id, rol, user_metadata } = await req.json()

    if (!email || !password || !personal_id || !rol) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: email, password, personal_id, rol' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating user for personal_id:', personal_id, 'with email:', email)

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if user already exists with this email
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)
    
    if (existingUser) {
      console.log('User already exists with email:', email)
      return new Response(
        JSON.stringify({ error: 'Ya existe un usuario con este correo electrónico' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if personal already has a user
    const { data: existingPersonalUser } = await adminClient
      .from('usuario')
      .select('id')
      .eq('personal_id', personal_id)
      .maybeSingle()

    if (existingPersonalUser) {
      console.log('Personal already has a user:', personal_id)
      return new Response(
        JSON.stringify({ error: 'Este miembro del personal ya tiene un usuario asignado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the auth user using admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: user_metadata || {}
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return new Response(
        JSON.stringify({ error: 'Error al crear usuario en autenticación: ' + authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auth user created:', authData.user?.id)

    // Create the usuario record
    const { data: usuarioData, error: usuarioError } = await adminClient
      .from('usuario')
      .insert({
        email,
        rol,
        personal_id,
        auth_user_id: authData.user!.id,
        activo: true
      })
      .select()
      .single()

    if (usuarioError) {
      console.error('Error creating usuario record:', usuarioError)
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(authData.user!.id)
      return new Response(
        JSON.stringify({ error: 'Error al crear registro de usuario: ' + usuarioError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Usuario record created:', usuarioData.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: usuarioData,
        auth_user_id: authData.user!.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor: ' + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
