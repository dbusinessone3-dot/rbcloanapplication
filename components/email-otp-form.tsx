'use client';

import Image from 'next/image';
import { useActionState, useMemo } from 'react';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { LanguageSwitch } from '@/components/language-switch';
import { SubmitButton } from '@/components/submit-button';
import { resendEmailOtpAction, verifyEmailOtpAction } from '@/app/(auth)/actions';
import { useLanguage } from '@/components/language-provider';
import type { ActionState } from '@/lib/types';

const initialState: ActionState = { ok: false, message: '' };

export function EmailOtpForm({ email }: { email: string }) {
  const { t } = useLanguage();
  const [verifyState, verifyAction] = useActionState(verifyEmailOtpAction, initialState);
  const [resendState, resendAction] = useActionState(resendEmailOtpAction, initialState);
  const digits = useMemo(() => Array.from({ length: 6 }), []);

  return <div className="page-center">
    <div className="auth-shell auth-shell-single">
      <section className="auth-visual auth-visual-compact">
        <div className="brand-line"><Image src="/images/rbc-logo.svg" width={62} height={62} className="brand-logo" alt="RBC"/><div><div className="brand-title">{t('appName')}</div><div className="brand-subtitle">{t('royalBank')}</div></div></div>
        <div className="auth-copy"><h1>{t('verifyCode')}</h1><p>{t('emailOtpHelp')}</p></div>
        <div><ShieldCheck size={30}/></div>
      </section>
      <section className="auth-card-wrap">
        <div className="auth-card otp-card">
          <div className="otp-logo-wrap"><Image src="/images/rbc-logo.svg" width={74} height={74} className="brand-logo" alt="RBC"/></div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,marginBottom:18}}><div><h2>{t('verifyCode')}</h2><p className="subtext">{email} {t('codeSentToEmail')}</p></div><LanguageSwitch compact/></div>
          {verifyState.message ? <div className={`alert ${verifyState.ok ? 'success' : 'error'}`} style={{marginBottom:16}}>{verifyState.message}</div> : null}
          {resendState.message ? <div className={`alert ${resendState.ok ? 'success' : 'error'}`} style={{marginBottom:16}}>{resendState.message}</div> : null}
          <form action={verifyAction} className="form-grid">
            <input type="hidden" name="email" value={email} />
            <label htmlFor="token" className="field-label">{t('verificationCode')}</label>
            <div className="otp-visual-input" aria-hidden="true">{digits.map((_, index) => <span key={index} />)}</div>
            <div style={{position:'relative'}}>
              <MailCheck size={18} style={{position:'absolute',left:14,top:14,color:'#8b95a5'}}/>
              <input className="input otp-input" id="token" name="token" inputMode="numeric" maxLength={6} pattern="[0-9A-Za-z]{6}" placeholder="123456" required autoFocus style={{paddingLeft:42}} />
            </div>
            <SubmitButton>{t('verifyNow')}</SubmitButton>
          </form>
          <form action={resendAction} style={{marginTop:18}}>
            <input type="hidden" name="email" value={email} />
            <button type="submit" className="ghost-btn otp-resend">{t('didNotReceiveCode')} <span className="inline-link">{t('resendCode')}</span></button>
          </form>
        </div>
      </section>
    </div>
  </div>;
}
