import { UserShell } from '@/components/user-shell';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireUser();
  const { count } = await supabase
    .from('app_notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);

  return <UserShell profile={profile} unreadCount={count ?? 0}>{children}</UserShell>;
}
