import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage() {
  const { user, profile } = await getCurrentUser();
  if (!user) redirect('/login');
  if (profile && ['admin', 'super_admin'].includes(profile.role)) redirect('/admin/dashboard');
  redirect('/dashboard');
}
