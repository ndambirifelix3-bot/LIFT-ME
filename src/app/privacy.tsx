import { PRIVACY } from '@/features/legal/content';
import { LegalPage } from '@/features/legal/LegalPage';

/** Public: https://rideliftme.com/privacy (also the link for the app stores). */
export default function PrivacyPolicy() {
  return <LegalPage title="Privacy Policy" sections={PRIVACY} other={{ href: '/terms', label: 'Read the Terms of Use' }} />;
}
