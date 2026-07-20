import { ProfileForm } from '@/components/profile-form';
import { requireUser } from '@/lib/auth';

export default async function ProfilePage() {
  const { supabase, profile } = await requireUser();

  let profilePhotoUrl: string | null = null;
  if (profile?.profile_photo_path) {
    const { data } = await supabase.storage
      .from('kyc-documents')
      .createSignedUrl(profile.profile_photo_path, 60 * 30);
    profilePhotoUrl = data?.signedUrl ?? null;
  }

  return <ProfileForm profile={profile} profilePhotoUrl={profilePhotoUrl} />;
}
