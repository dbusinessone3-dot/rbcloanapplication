'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import { CheckCircle2, Clock3, FileCheck2, ShieldCheck, UserRound } from 'lucide-react';
import { updateProfileAction } from '@/app/(user)/actions';
import { ActionMessage } from '@/components/action-message';
import { StatusBadge } from '@/components/status-badge';
import { SubmitButton } from '@/components/submit-button';
import { useLanguage } from '@/components/language-provider';
import type { ActionState, Profile } from '@/lib/types';

const initial: ActionState = { ok: false, message: '' };

function value(input: string | null | undefined) {
  return input?.trim() || '—';
}

export function ProfileForm({ profile, profilePhotoUrl }: { profile: Profile | null; profilePhotoUrl: string | null }) {
  const { t } = useLanguage();
  const [state, action] = useActionState(updateProfileAction, initial);
  const locked = ['submitted', 'under_review', 'verified'].includes(profile?.kyc_status || '');
  const verified = profile?.kyc_status === 'verified';
  const depositVerified = Boolean(profile?.cashout_deposit_verified_at);

  if (locked) {
    const rows = [
      [t('fullName'), profile?.full_name],
      [t('email'), profile?.email],
      [t('phone'), profile?.phone],
      [t('country'), profile?.country],
      [t('city'), profile?.city],
      [t('dateOfBirth'), profile?.date_of_birth],
      [t('gender'), profile?.gender],
      [t('address'), profile?.address],
      [t('nidNumber'), profile?.nid_number],
      [t('passportNumber'), profile?.passport_number],
    ];

    return <div className="form-card profile-summary-card approved-profile-shell">
      <div className="approved-profile-hero">
        <div className="approved-profile-photo-wrap">
          {profilePhotoUrl ? (
            <Image
              src={profilePhotoUrl}
              alt={profile?.full_name || t('profilePhoto')}
              width={132}
              height={132}
              className="approved-profile-photo"
              unoptimized
            />
          ) : (
            <div className="approved-profile-photo placeholder"><UserRound size={46} /></div>
          )}
          {verified ? <span className="profile-verified-mark"><CheckCircle2 size={18} /></span> : null}
        </div>
        <div className="approved-profile-heading">
          <div className="muted small">{verified ? t('profileApproved') : t('profileSubmitted')}</div>
          <h1>{value(profile?.full_name)}</h1>
          <p>{profile?.email || '—'}</p>
          <StatusBadge status={profile?.kyc_status || 'submitted'} />
        </div>
      </div>

      <div className={`profile-review-banner ${verified ? 'verified' : 'waiting'}`}>
        <div className="profile-review-banner-icon">{verified ? <CheckCircle2 size={26}/> : <Clock3 size={26}/>}</div>
        <div>
          <strong>{verified ? t('profileApproved') : t('profileSubmitted')}</strong>
          <p>{verified ? t('profileApprovedHelp') : t('profileWaitingHelp')}</p>
        </div>
      </div>

      {verified ? <section className="profile-deposit-summary">
        <div>
          <span>{t('oneTimeCashoutDeposit')}</span>
          <strong>{t('automaticDepositRate')}</strong>
        </div>
        <div className={`profile-deposit-state ${depositVerified ? 'verified' : 'waiting'}`}>
          {depositVerified ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
          <span>{depositVerified ? t('depositVerifiedOnce') : t('depositCalculatedAtCashout')}</span>
        </div>
      </section> : null}

      <section className="profile-summary-grid">
        {rows.map(([label, item]) => <article className="profile-summary-item" key={String(label)}>
          <span>{label}</span><strong>{value(item)}</strong>
        </article>)}
      </section>

      <section className="profile-documents-summary">
        <h3>{t('documentUpload')}</h3>
        <div className="profile-document-grid">
          <div><FileCheck2 size={20}/><span>{t('profilePhoto')}</span><strong>{profile?.profile_photo_path ? t('uploaded') : t('notUploaded')}</strong></div>
          <div><FileCheck2 size={20}/><span>{t('nidFront')}</span><strong>{profile?.nid_front_path ? t('uploaded') : t('notUploaded')}</strong></div>
          <div><FileCheck2 size={20}/><span>{t('nidBack')}</span><strong>{profile?.nid_back_path ? t('uploaded') : t('notUploaded')}</strong></div>
        </div>
      </section>
    </div>;
  }

  return <form action={action} encType="multipart/form-data" className="form-card mobile-form-shell">
    <div className="section-head"><div><h1 className="section-title">{t('profile')}</h1><p className="muted">{t('personalInfo')}</p></div><StatusBadge status={profile?.kyc_status || 'draft'}/></div>
    <ActionMessage state={state}/>
    {profile?.kyc_status === 'rejected' && profile.kyc_rejection_reason ? <div className="alert error" style={{marginBottom:18}}><strong>{t('profileRejected')}</strong><div>{profile.kyc_rejection_reason}</div></div> : null}
    <section className="form-section"><div className="section-pill">{t('personalInfo')}</div><div className="form-grid two"><div className="field"><label>{t('fullName')}</label><input className="input" name="full_name" defaultValue={profile?.full_name ?? ''} required/></div><div className="field"><label>{t('email')}</label><input className="input" value={profile?.email ?? ''} readOnly/></div><div className="field"><label>{t('phone')}</label><input className="input" name="phone" defaultValue={profile?.phone ?? ''}/></div><div className="field"><label>{t('country')}</label><input className="input" name="country" defaultValue={profile?.country ?? ''}/></div><div className="field"><label>{t('city')}</label><input className="input" name="city" defaultValue={profile?.city ?? ''}/></div><div className="field"><label>{t('dateOfBirth')}</label><input className="input" type="date" name="date_of_birth" defaultValue={profile?.date_of_birth ?? ''}/></div><div className="field"><label>{t('gender')}</label><select className="select" name="gender" defaultValue={profile?.gender ?? ''}><option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div><div className="field" style={{gridColumn:'1/-1'}}><label>{t('address')}</label><textarea className="textarea" name="address" defaultValue={profile?.address ?? ''}/></div></div></section>
    <section className="form-section"><div className="section-pill">{t('kycInfo')}</div><div className="form-grid two"><div className="field"><label>{t('nidNumber')}</label><input className="input" name="nid_number" defaultValue={profile?.nid_number ?? ''}/></div><div className="field"><label>{t('passportNumber')}</label><input className="input" name="passport_number" defaultValue={profile?.passport_number ?? ''}/></div><div className="field"><label>{t('profilePhoto')}</label><label className="upload-dropzone compact"><UserRound size={24}/><strong>{t('profilePhoto')}</strong><span>{t('profilePhotoApprovalHelp')}</span><input type="file" name="profile_photo" accept="image/*" required={!profile?.profile_photo_path}/></label></div><div className="field"><label>{t('nidFront')}</label><input className="file-input" type="file" name="nid_front" accept="image/*,.pdf"/></div><div className="field"><label>{t('nidBack')}</label><input className="file-input" type="file" name="nid_back" accept="image/*,.pdf"/></div></div></section>
    <div className="profile-submit-note"><ShieldCheck size={20}/><span>{t('profileSubmitForApproval')}</span></div>
    <div style={{marginTop:22}}><SubmitButton>{t('submitForApproval')}</SubmitButton></div>
  </form>;
}
