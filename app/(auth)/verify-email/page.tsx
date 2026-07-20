import { redirect } from 'next/navigation';
import { EmailOtpForm } from '@/components/email-otp-form';
import { getCurrentUser } from '@/lib/auth';

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { user } = await getCurrentUser();
  if (user) redirect('/dashboard');

  const params = await searchParams;
  const email = params.email?.trim();
  if (!email) redirect('/register');

  return <EmailOtpForm email={email} />;
}
