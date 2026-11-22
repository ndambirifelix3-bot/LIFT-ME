import { TERMS } from '@/features/legal/content';
import { LegalPage } from '@/features/legal/LegalPage';

/** Public: https://rideliftme.com/terms */
export default function TermsOfUse() {
  return <LegalPage title="Terms of Use" sections={TERMS} other={{ href: '/privacy', label: 'Read the Privacy Policy' }} />;
}
