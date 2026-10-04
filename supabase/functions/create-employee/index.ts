// supabase/functions/create-employee/index.ts
// ============================================
// Edge Function: Create Employee
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing env vars');
      return new Response(
        JSON.stringify({ error: 'Server config error' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Ambil token dari header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing/invalid auth header:', authHeader);
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    console.log('Token received, length:', token.length);

    // 2. Verifikasi token via admin client (getUser pakai JWT)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error('Token verification failed:', userError);
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          details: userError?.message || 'Auth session missing!',
        }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const requestingUser = userData.user;
    console.log('Requesting user:', requestingUser.email, requestingUser.id);

    // 3. Cek role di tabel profiles (pakai admin client biar gak kena RLS)
    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    if (profileErr) {
      console.error('Profile fetch error:', profileErr);
      return new Response(
        JSON.stringify({ error: 'Profile not found', details: profileErr.message }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (profile?.role !== 'admin') {
      console.error('User is not admin. Role:', profile?.role);
      return new Response(
        JSON.stringify({ error: 'Only admin can create employees' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verified, proceeding...');

    // 4. Parse body
    const body = await req.json();
    const {
      email,
      password,
      full_name,
      phone,
      role = 'worker',
      position,
      division,
      daily_rate = 230000,
      employee_id,
    } = body;

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password minimal 6 karakter' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Bikin user di auth.users
    const empId = employee_id || `EMP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        employee_id: empId,
        role,
        phone,
      },
    });

    if (createError) {
      console.error('Create user error:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user', details: createError.message }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created:', newUser.user.id);

    // 6. Update profile dengan data lengkap
    if (newUser?.user?.id) {
      const { error: updateErr } = await adminClient
        .from('profiles')
        .update({
          full_name,
          phone,
          role,
          position,
          division,
          daily_rate,
          employee_id: empId,
          is_active: true,
          joined_at: new Date().toISOString().slice(0, 10),
        })
        .eq('id', newUser.user.id);

      if (updateErr) {
        console.warn('Profile update warning:', updateErr);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          employee_id: empId,
        },
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Catch error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});