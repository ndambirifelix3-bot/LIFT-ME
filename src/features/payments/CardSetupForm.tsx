import { Notice } from '@/components';
import type { SavedCard } from './cards';

/** Phone apps: adding a card comes with the App Store / Play Store versions (Stripe's native SDK). */
export function CardSetupForm(_: { onSaved: (card: SavedCard) => void; onCancel?: () => void }) {
  return <Notice text="To add a card, open Lift Me at rideliftme.com." />;
}
