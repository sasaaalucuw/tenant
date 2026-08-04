import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
let supabase = null;
if (supabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase URL dan ANON KEY belum diatur. Isi file .env sesuai .env.example.');
}

function requireSupabase() {
  if (!supabaseConfigured || !supabase) {
    throw new Error('Supabase belum dikonfigurasi. Silakan isi .env dengan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
  }
}

function formatSupabaseError(error) {
  if (!error) return 'Terjadi kesalahan Supabase.';
  const message = error.details || error.message || String(error);
  if (/row-level security/i.test(message) || /RLS/i.test(message)) {
    return 'Supabase row-level security masih aktif. Jalankan supabase-schema.sql di SQL editor Supabase dan nonaktifkan RLS untuk tabel users, tenants, votes.';
  }
  if (/duplicate key value/i.test(message)) {
    return 'Anda sudah melakukan aksi ini sebelumnya.';
  }
  if (error.status === 401) {
    return 'Akses Supabase ditolak. Periksa anon key dan kebijakan tabel.';
  }
  return message;
}

export async function findUserByEmail(email) {
  requireSupabase();
  const { data, error, status } = await supabase.from('users').select('id,email,role').eq('email', email).single();
  if (error && error.code !== 'PGRST116' && status !== 406) throw error;
  return data;
}

export async function createUser(email, role = 'visitor') {
  requireSupabase();
  if (!['admin', 'visitor'].includes(role)) {
    throw new Error('Role harus admin atau visitor.');
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error('Email sudah terdaftar.');
  }
  const { data, error } = await supabase.from('users').insert({ email, role }).select('id,email,role').single();
  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

export async function ensureAdminUser(email) {
  requireSupabase();
  const { data, error } = await supabase
    .from('users')
    .upsert({ email, role: 'admin' }, { onConflict: 'email', returning: 'representation' })
    .select('id,email,role')
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

export async function createVisitor(email) {
  try {
    return await createUser(email, 'visitor');
  } catch (error) {
    throw new Error(formatSupabaseError(error));
  }
}

export async function loadTenants() {
  requireSupabase();
  const { data, error } = await supabase.from('tenants').select('id,name,terminal,image_url,created_at').order('created_at', { ascending: false });
  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

export async function loadUsers() {
  requireSupabase();
  const { data, error } = await supabase.from('users').select('id,email,role,created_at').order('created_at', { ascending: false });
  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

export async function loadVotesToday() {
  requireSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase.from('votes').select('id', { count: 'exact', head: true }).eq('voted_date', today);
  if (error) throw new Error(formatSupabaseError(error));
  return count || 0;
}

export async function loadVoteMonitoring() {
  requireSupabase();
  const [votesResult, tenants] = await Promise.all([
    supabase.from('votes').select('id, tenant_id, voted_at, voted_date').order('voted_date', { ascending: false }),
    loadTenants(),
  ]);

  const { data: votes, error } = votesResult;
  if (error) throw new Error(formatSupabaseError(error));

  const dailyStats = new Map();
  const tenantTotals = new Map();
  const tenantLookup = new Map(tenants.map((tenant) => [tenant.id, tenant]));

  for (const vote of votes || []) {
    const votedDate = String(vote.voted_date || vote.voted_at || '').slice(0, 10);
    if (votedDate) {
      dailyStats.set(votedDate, (dailyStats.get(votedDate) || 0) + 1);
    }

    if (vote.tenant_id) {
      tenantTotals.set(vote.tenant_id, (tenantTotals.get(vote.tenant_id) || 0) + 1);
    }
  }

  const tenantSummary = [...tenantTotals.entries()]
    .map(([tenantId, count]) => ({
      tenantId,
      name: tenantLookup.get(tenantId)?.name || 'Tenant tidak diketahui',
      terminal: tenantLookup.get(tenantId)?.terminal || '—',
      count,
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

  return {
    dailyStats: [...dailyStats.entries()]
      .sort((left, right) => right[0].localeCompare(left[0]))
      .map(([date, count]) => ({ date, count })),
    topTenant: tenantSummary[0] || null,
    tenantTotals: tenantSummary,
  };
}

export async function updateUserRole(id, role) {
  requireSupabase();
  if (!['admin', 'visitor'].includes(role)) {
    throw new Error('Role harus admin atau visitor.');
  }
  const { data, error } = await supabase.from('users').update({ role }).eq('id', id).select('id,email,role').single();
  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

export async function deleteUser(id) {
  requireSupabase();
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw new Error(formatSupabaseError(error));
  return true;
}

export async function createTenant(tenant) {
  requireSupabase();
  const tenantPayload = {
    name: tenant.name,
    terminal: tenant.terminal,
    image_url: tenant.image_url,
  };
  const { data, error } = await supabase.from('tenants').insert(tenantPayload).select().single();
  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

export async function updateTenant(id, tenant) {
  requireSupabase();
  const tenantPayload = {
    name: tenant.name,
    terminal: tenant.terminal,
    image_url: tenant.image_url,
  };
  const { data, error } = await supabase.from('tenants').update(tenantPayload).eq('id', id).select().single();
  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

export async function deleteTenant(id) {
  requireSupabase();
  const { error } = await supabase.from('tenants').delete().eq('id', id);
  if (error) throw new Error(formatSupabaseError(error));
  return true;
}

export async function loadUserVotes(email) {
  requireSupabase();
  const { data, error } = await supabase.from('votes').select('tenant_id,voted_at,voted_date').eq('user_email', email).order('voted_at', { ascending: false });
  if (error) throw new Error(formatSupabaseError(error));
  return data || [];
}

export async function voteTenant(email, tenantId) {
  requireSupabase();
  const { data, error } = await supabase.from('votes').insert({ user_email: email, tenant_id: tenantId }).select().single();
  if (error) throw new Error(formatSupabaseError(error));
  return data;
}
