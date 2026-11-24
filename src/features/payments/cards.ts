import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type PaymentMethod = Tables<'payments'>['method'];
export type SavedCard = { brand: string | null; last4: string | null; expMonth: number | null; expYear: number | null };

/** Stripe's publishable key (public). Empty = card payments not set up in this build. */
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

const BRANDS: Record<string, string> = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', discover: 'Discover',
  diners: 'Diners Club', jcb: 'JCB', unionpay: 'UnionPay',
};

/** "Visa •••• 4242" */
export function cardLabel(brand: string | null | undefined, last4: string | null | undefined): string {
  const name = BRANDS[String(brand)] ?? 'Card';
  return last4 ? `${name} •••• ${last4}` : name;
}

/** "M-Pesa" / "Cash" / "Card" */
export function methodLabel(method: string | null | undefined): string {
  return method === 'mpesa' ? 'M-Pesa' : method === 'card' ? 'Card' : 'Cash';
}

/** How a payment was (or will be) made, e.g. "Visa •••• 4242", "M-Pesa QKX12AB", "Cash". */
export function paymentLabel(p: { method: string; card_brand?: string | null; card_last4?: string | null; mpesa_receipt?: string | null }): string {
  if (p.method === 'card') return p.card_last4 ? cardLabel(p.card_brand, p.card_last4) : 'Card';
  if (p.method === 'mpesa') return p.mpesa_receipt ? `M-Pesa ${p.mpesa_receipt}` : 'M-Pesa';
  return 'Cash';
}

/** The signed-in passenger's saved card (null = none). */
export function useSavedCard() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['saved-card', userId],
    enabled: !!userId,
    queryFn: async (): Promise<SavedCard | null> => {
      const { data, error } = await supabase
        .from('stripe_customers')
        .select('payment_method_id, card_brand, card_last4, card_exp_month, card_exp_year')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data?.payment_method_id) return null;
      return { brand: data.card_brand, last4: data.card_last4, expMonth: data.card_exp_month, expYear: data.card_exp_year };
    },
  });
}
