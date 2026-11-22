/**
 * Driver money ("wallet"): what a driver owes Lift Me or is owed, as a list of entries.
 * Amounts are in the smallest unit of the driver's currency (KES whole shillings, USD cents).
 * Positive balance = Lift Me owes the driver; negative = the driver owes Lift Me.
 * All money rules live in the database (supabase/migrations/20261122000001_driver_wallet.sql).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type LedgerEntry = Omit<Tables<'driver_ledger'>, 'driver_id' | 'created_by'>;
export type LedgerKind = 'cash_commission' | 'trip_earnings' | 'payout' | 'driver_payment' | 'adjustment';

export type Wallet = {
  balance: number;
  currency: string;
  currency_decimals: number;
  /** Most the driver may owe before they can't go online (null = no limit). */
  debt_limit: number | null;
  over_limit: boolean;
  payment_instructions: string;
  entries: LedgerEntry[];
};

export const LEDGER_LABEL: Record<LedgerKind, string> = {
  cash_commission: 'Commission (cash trip)',
  trip_earnings: 'Your share (M-Pesa trip)',
  payout: 'Payout to you',
  driver_payment: 'Your payment',
  adjustment: 'Adjustment',
};

/** The same entries, worded for the admin. */
export const ADMIN_LEDGER_LABEL: Record<LedgerKind, string> = {
  cash_commission: 'Commission owed (cash trip)',
  trip_earnings: 'Driver share (M-Pesa trip)',
  payout: 'Payout to driver',
  driver_payment: 'Driver paid Lift Me',
  adjustment: 'Correction',
};

export function ledgerLabel(kind: string, admin = false): string {
  return (admin ? ADMIN_LEDGER_LABEL : LEDGER_LABEL)[kind as LedgerKind] ?? kind;
}

export function useWallet(enabled = true) {
  return useQuery({
    queryKey: ['wallet'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_wallet');
      if (error) throw error;
      return data as unknown as Wallet;
    },
  });
}
