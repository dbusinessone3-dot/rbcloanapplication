'use client';

import { useLanguage } from '@/components/language-provider';

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  return (
    <div className="language-pills" aria-label="Language selector">
      <button type="button" className={locale === 'bn' ? 'active' : ''} onClick={() => setLocale('bn')}>{compact ? 'বাং' : 'বাংলা'}</button>
      <button type="button" className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
    </div>
  );
}
