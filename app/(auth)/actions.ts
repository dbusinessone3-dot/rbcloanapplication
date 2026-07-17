'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/types';

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { ok: false, message: 'Email and password are required.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Login succeeded but the user session was not created.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  revalidatePath('/', 'layout');
  redirect(profile && ['admin', 'super_admin'].includes(profile.role) ? '/admin/dashboard' : '/dashboard');
}

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const fullName = String(formData.get('full_name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirm_password') ?? '');

  if (!fullName || !email || !password) return { ok: false, message: 'Name, email and password are required.' };
  if (password.length < 8) return { ok: false, message: 'Password must contain at least 8 characters.' };
  if (password !== confirmPassword) return { ok: false, message: 'Passwords do not match.' };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: { full_name: fullName, phone },
    },
  });

  if (error) return { ok: false, message: error.message };
  if (!data.session) {
    redirect(`/verify-email?email=${encodeURIComponent(email)}&full_name=${encodeURIComponent(fullName)}`);
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function verifyEmailOtpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const token = String(formData.get('token') ?? '').replace(/\s+/g, '');
  if (!email || !token) return { ok: false, message: 'Email and verification code are required.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function resendEmailOtpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { ok: false, message: 'Email is required.' };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'A new verification code has been sent to your email.' };
}


export async function requestPasswordResetAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { ok: false, message: 'Email is required.' };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'If an account exists for this email, a password reset link has been sent.' };
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirm_password') ?? '');
  if (password.length < 8) return { ok: false, message: 'Password must contain at least 8 characters.' };
  if (password !== confirmPassword) return { ok: false, message: 'Passwords do not match.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'The reset session has expired. Request a new password reset link.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: error.message };

  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login?password_reset=1');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
