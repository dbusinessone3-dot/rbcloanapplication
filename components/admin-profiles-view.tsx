'use client';

import Image from 'next/image';
import { ExternalLink, FileCheck2, ShieldCheck, UserRound } from 'lucide-react';
import { reviewProfileAction } from '@/app/(admin)/admin/actions';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useLanguage } from '@/components/language-provider';
import type { AdminProfileReview } from '@/lib/types';

function value(input: string | null | undefined) {
  return input?.trim() || '—';
}

export function AdminProfilesView({ items }: { items: AdminProfileReview[] }) {
  const { t } = useLanguage();

  return <div className="admin-page-stack">
    <div className="admin-page-intro">
      <div><span>Identity verification</span><h1>{t('profileApprovals')}</h1><p>{t('profileAdminHelp')}</p></div>
      <div className="admin-intro-count"><strong>{items.length}</strong><span>Profiles</span></div>
    </div>

    {items.length ? <div className="admin-profile-list">
      {items.map((item) => <article className="card admin-profile-card" key={item.id}>
        <div className="card-body">
          <div className="admin-profile-head">
            <div className="admin-profile-person">
              <div className="admin-profile-photo-wrap">
                {item.profile_photo_url ? (
                  <Image src={item.profile_photo_url} alt={item.full_name || 'Profile'} width={78} height={78} className="admin-profile-photo" unoptimized />
                ) : (
                  <div className="admin-profile-photo placeholder"><UserRound size={30} /></div>
                )}
              </div>
              <div>
                <div className="list-title">{item.full_name || item.email || 'User'}</div>
                <div className="list-subtitle">{item.email} · {item.phone || '—'}</div>
              </div>
            </div>
            <StatusBadge status={item.kyc_status} />
          </div>

          <div className="admin-profile-grid">
            <div><span>{t('country')}</span><strong>{value(item.country)}</strong></div>
            <div><span>{t('city')}</span><strong>{value(item.city)}</strong></div>
            <div><span>{t('dateOfBirth')}</span><strong>{value(item.date_of_birth)}</strong></div>
            <div><span>{t('gender')}</span><strong>{value(item.gender)}</strong></div>
            <div><span>{t('nidNumber')}</span><strong>{value(item.nid_number)}</strong></div>
            <div><span>{t('passportNumber')}</span><strong>{value(item.passport_number)}</strong></div>
            <div className="wide"><span>{t('address')}</span><strong>{value(item.address)}</strong></div>
          </div>

          <div className="admin-document-links">
            {[
              ['Profile photo', item.profile_photo_url],
              ['NID front', item.nid_front_url],
              ['NID back', item.nid_back_url],
            ].map(([label, url]) => url ? (
              <a href={url} target="_blank" rel="noreferrer" key={String(label)}>
                <FileCheck2 size={17} />{label}<ExternalLink size={14} />
              </a>
            ) : (
              <span key={String(label)}><FileCheck2 size={17} />{label}: —</span>
            ))}
          </div>

          {['submitted', 'under_review'].includes(item.kyc_status) ? (
            <form action={reviewProfileAction} className="form-grid admin-profile-review-form">
              <input type="hidden" name="profile_id" value={item.id} />

              <div className="field">
                <label>{t('adminNote')}</label>
                <textarea className="textarea" name="admin_note" placeholder={t('profileReviewNote')} />
              </div>

              <div className="admin-review-actions">
                <button className="primary-btn" name="decision" value="approve">
                  <ShieldCheck size={18} />{t('approve')}
                </button>
                <button className="danger-btn" name="decision" value="reject">
                  {t('reject')}
                </button>
              </div>
            </form>
          ) : null}

          {item.kyc_status === 'rejected' && item.kyc_rejection_reason ? (
            <div className="alert error" style={{ marginTop: 16 }}>{item.kyc_rejection_reason}</div>
          ) : null}
        </div>
      </article>)}
    </div> : <div className="card"><EmptyState /></div>}
  </div>;
}
