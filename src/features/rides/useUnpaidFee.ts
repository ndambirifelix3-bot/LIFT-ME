import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

/** The passenger's unpaid cancellation fee, if any (blocks new bookings until paid). */
export function useUnpaidFee() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['unpaid-fee', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rides')
        .select('id, cancellation_fee, currency, market_code, payments!inner(status)')
        .eq('passenger_id', userId!)
        .eq('status', 'cancelled')
        .gt('cancellation_fee', 0)
        .neq('payments.status', 'paid')
        .order('cancelled_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
