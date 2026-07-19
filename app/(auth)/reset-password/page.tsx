import { redirect } from 'next/navigation';
import { ResetPasswordForm } from '@/components/reset-password-form';
import { getCurrentUser } from '@/lib/auth';
export default async function ResetPasswordPage() { const { user } = await getCurrentUser(); if (!user) redirect('/forgot-password'); return <ResetPasswordForm/>; }
