import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ErrorMessage, Input, Notice } from '@/components';
import { mpesaFailureReason } from '@/features/rides/components';
import { formatMoney } from '@/lib/format';
import { callFunction, supabase } from '@/lib/supabase';
import { space, type } from '@/theme';
import type { Wallet } from './wallet';

/**
 * "Pay now with M-Pesa": the driver pays what they owe (or part of it). The M-Pesa prompt goes to their
 * phone; once Safaricom confirms, their balance clears by itself — this screen just watches the result.
 */
export function MpesaPayCard({ wallet }: { wallet: Wallet }) {
  const qc = useQueryClient();
  const owed = Math.max(-wallet.balance, 0);
  const [amount, setAmount] = useState(String(owed));
  const [phone, setPhone] = useState('');
  const [sentId, setSentId] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () =>
      callFunction<{ id: string }>('mpesa-driver-pay', { amount: amount.trim() === '' ? undefined : Number(amount), phone: phone.trim() || undefined }),
    onSuccess: (r) => setSentId(r.id),
  });

  // Watch the payment until M-Pesa answers (checks every 3 seconds while it's waiting).
  const status = useQuery({
    queryKey: ['driver-mpesa', sentId],
    enabled: !!sentId,
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 3000 : false),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_mpesa_payments')
        .select('status, amount, mpesa_receipt, result_code, result_desc')
        .eq('id', sentId!)
        .single();
      if (error) throw error;
      if (data.status === 'paid') qc.invalidateQueries({ queryKey: ['wallet'] });
      return data;
    },
  });

  if (owed <= 0 || !wallet.can_pay_mpesa) return null;
  const money = (n: number) => formatMoney(n, wallet.currency, wallet.currency_decimals);
  const p = status.data;

  if (p?.status === 'paid') {
    return <Notice tone="success" text={`Paid ${money(p.amount)} by M-Pesa${p.mpesa_receipt ? ` · ${p.mpesa_receipt}` : ''}. Thank you!`} />;
  }

  return (
    <View style={{ marginTop: space.md }}>
      <Text style={[type.label, { marginBottom: space.sm }]}>Pay now with M-Pesa</Text>
      {p?.status === 'pending' ? (
        <Notice text={`Check your phone and enter your M-Pesa PIN to pay ${money(p.amount)}. This updates by itself.`} />
      ) : null}
      {p?.status === 'failed' ? (
        <Notice tone="error" text={`Payment did not go through. ${mpesaFailureReason(p.result_code, p.result_desc)}`} />
      ) : null}
      {p?.status !== 'pending' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            <View style={{ flexGrow: 1, flexBasis: 140 }}>
              <Input label={`Amount (${wallet.currency})`} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
            </View>
            <View style={{ flexGrow: 2, flexBasis: 200 }}>
              <Input label="M-Pesa number (empty = your account number)" placeholder="07XX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
          </View>
          <ErrorMessage error={send.error} />
          <Button
            title={p?.status === 'failed' ? 'Try again' : `Pay ${/^\d+$/.test(amount) ? money(Number(amount)) : ''} with M-Pesa`}
            onPress={() => send.mutate()}
            loading={send.isPending}
          />
        </>
      ) : null}
    </View>
  );
}
