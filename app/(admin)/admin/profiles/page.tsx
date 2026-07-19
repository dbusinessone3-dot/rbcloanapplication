import { AdminProfilesView } from '@/components/admin-profiles-view';
import { requireAdmin } from '@/lib/auth';
import type { AdminProfileReview, Profile } from '@/lib/types';

export default async function AdminProfilesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('profiles').select('*').eq('role', 'user').order('updated_at', { ascending: false });
  const profiles = (data ?? []) as Profile[];

  const items: AdminProfileReview[] = await Promise.all(profiles.map(async (profile) => {
    async function signed(path: string | null) {
      if (!path) return null;
      const { data: result } = await supabase.storage.from('kyc-documents').createSignedUrl(path, 60 * 15);
      return result?.signedUrl ?? null;
    }
    const [profilePhoto, nidFront, nidBack] = await Promise.all([signed(profile.profile_photo_path), signed(profile.nid_front_path), signed(profile.nid_back_path)]);
    return { ...profile, profile_photo_url: profilePhoto, nid_front_url: nidFront, nid_back_url: nidBack };
  }));

  return <AdminProfilesView items={items}/>;
}
