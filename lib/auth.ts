import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  return { supabase, user, profile };
}

export async function requireUser() {
  const result = await getCurrentUser();
  if (!result.user) redirect('/login');
  return result as typeof result & { user: NonNullable<typeof result.user> };
}

export async function requireAdmin() {
  const result = await requireUser();
  if (!result.profile || !['admin', 'super_admin'].includes(result.profile.role)) {
    redirect('/dashboard');
  }
  return result;
}
