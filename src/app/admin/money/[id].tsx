import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Chip, ErrorMessage, Input, Loading, Notice, SectionTitle } from '@/components';
import { AdminPage } from '@/features/admin/AdminPage';
import { LedgerRow } from '@/features/driver/WalletCard';
import { useMarkets } from '@/features/markets';
import { formatMoney, fromMoneyInput, toMoneyInput } from '@/lib/format';
import { formatPhoneForDisplay } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space, type } from '@/theme';

type Kind = 'driver_payment' | 'payout' | 'adjustment';

const KINDS: { key: Kind; label: string; help: string }[] = [
  { key: 'driver_payment', label: 'Driver paid us', help: 'The driver paid commission they owed (e.g. M-Pesa to the Paybill, or cash at the office).' },
  { key: 'payout', label: 'We paid the driver', help: 'Lift Me sent the driver their share (e.g. an M-Pesa transfer).' },
  { key: 'adjustment', label: 'Correction', help: 'Fix a mistake or give a bonus. Use − for money the driver owes. A reason is required.' },
];

export default function AdminDriverMoney() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const markets = useMarkets();
  const [kind, setKind] = useState<Kind>('driver_payment');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const q = useQuery({
    queryKey: ['admin-driver-money', id],
    queryFn: async () => {
      const [profile, driver, ledger] = await Promise.all([
        supabase.from('profiles').select('full_name, phone').eq('id', id!).single(),
        supabase.from('drivers').select('wallet_balance, market_code, is_online').eq('id', id!).single(),
        supabase.from('driver_ledger').select('*').eq('driver_id', id!).order('id', { ascending: false }).limit(100),
      ]);
      for (const r of [profile, driver, ledger]) if (r.error) throw r.error;
      return { profile: profile.data!, driver: driver.data!, ledger: ledger.data ?? [] };
    },
  });

  const market = markets.data?.find((m) => m.code === q.data?.driver.market_code);
  const decimals = market?.currency_decimals ?? 0;
  const money = (n: number) => formatMoney(n, market?.currency, decimals);
  const balance = q.data?.driver.wallet_balance ?? 0;

  const record = useMutation({
    mutationFn: async () => {
      const negative = kind === 'adjustment' && amount.trim().startsWith('-');
      const value = fromMoneyInput(amount.replace(/^[-−]\s*/, ''), decimals);
      if (!value) throw new Error(decimals ? 'Enter an amount like 12.50.' : 'Enter a whole amount, e.g. 500.');
      const { error } = await supabase.rpc('admin_record_driver_money', {
        p_driver_id: id!, p_kind: kind, p_amount: negative ? -value : value,
        p_reference: reference.trim() || undefined, p_note: note.trim() || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAmount(''); setReference(''); setNote('');
      qc.invalidateQueries({ queryKey: ['admin-driver-money', id] });
      qc.invalidateQueries({ queryKey: ['admin-money'] });
    },
  });

  if (q.isLoading || markets.isLoading) return <Loading />;
  if (q.error || !q.data) return <AdminPage title="Driver money"><ErrorMessage error={q.error} onRetry={() => q.refetch()} /></AdminPage>;

  const { profile, ledger } = q.data;
  // Quick fill: settle the whole balance in one tap.
  const settle = balance < 0 ? { kind: 'driver_payment' as Kind, amount: -balance } : balance > 0 ? { kind: 'payout' as Kind, amount: balance } : null;

  return (
    <AdminPage title={profile.full_name || 'Driver'} subtitle={`${formatPhoneForDisplay(profile.phone ?? '')} · ${market?.name ?? ''}`} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Card>
        <Text style={type.label}>{balance < 0 ? 'Driver owes Lift Me' : balance > 0 ? 'Lift Me owes the driver' : 'Balance'}</Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: 28, color: balance < 0 ? colors.error : balance > 0 ? colors.success : colors.text, marginVertical: 4 }}>
          {money(Math.abs(balance))}
        </Text>
        {market?.driver_debt_limit != null ? <Text style={type.small}>Limit before they are stopped: {money(market.driver_debt_limit)}</Text> : null}
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md, flexWrap: 'wrap' }}>
          <Button title="Driver profile" variant="outline" small onPress={() => router.push(`/admin/drivers/${id}`)} />
        </View>
      </Card>

      <SectionTitle>Record money</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm }}>
          {KINDS.map((k) => <Chip key={k.key} label={k.label} selected={kind === k.key} onPress={() => setKind(k.key)} />)}
        </View>
        <Text style={[type.small, { marginBottom: space.md }]}>{KINDS.find((k) => k.key === kind)!.help}</Text>
        {settle && settle.kind === kind ? (
          <Button title={`Fill in the full ${money(settle.amount)}`} variant="ghost" small onPress={() => setAmount(toMoneyInput(settle.amount, decimals))} />
        ) : null}
        <Input label={`Amount (${market?.currency ?? ''})`} value={amount} onChangeText={setAmount} keyboardType={kind === 'adjustment' ? 'numbers-and-punctuation' : 'decimal-pad'} placeholder={decimals ? '0.00' : '0'} />
        <Input label="Reference (e.g. M-Pesa code)" value={reference} onChangeText={setReference} autoCapitalize="characters" maxLength={40} />
        <Input label={kind === 'adjustment' ? 'Reason (required)' : 'Note (optional)'} value={note} onChangeText={setNote} maxLength={200} />
        <ErrorMessage error={record.error} />
        {record.isSuccess ? <Notice tone="success" text="Saved. The driver has been notified." /> : null}
        <Button title="Save" variant="dark" onPress={() => record.mutate()} loading={record.isPending} />
      </Card>

      <SectionTitle>History</SectionTitle>
      <Card>
        {ledger.length === 0 ? <Text style={type.small}>No money entries yet.</Text> : null}
        {ledger.map((e) => (
          <View key={e.id}>
            <LedgerRow entry={e} decimals={decimals} admin />
            <Text style={[type.small, { marginBottom: 4 }]}>Balance after: {money(e.balance_after)}{e.note && e.kind !== 'adjustment' ? ` · ${e.note}` : ''}</Text>
          </View>
        ))}
      </Card>
    </AdminPage>
  );
}
