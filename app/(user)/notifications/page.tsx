import { NotificationsView } from '@/components/notifications-view';
import { requireUser } from '@/lib/auth';
import type { Notification } from '@/lib/types';

export default async function NotificationsPage(){const{supabase,user}=await requireUser();const{data}=await supabase.from('app_notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false});return <NotificationsView notifications={(data??[]) as Notification[]}/>;}
