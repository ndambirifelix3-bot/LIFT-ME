import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Button, Card, Chip, EmptyState, ErrorMessage, Input, Loading, Notice, Pill } from '@/components';
import { AdminPage } from '@/features/admin/AdminPage';
import { AdminMarketSwitcher, useAdminMarket } from '@/features/admin/market';
import type { Market } from '@/features/markets';
import { formatDateTime, formatMoney, fromMoneyInput } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import { space, switchColors, type } from '@/theme';

type Promo = Tables<'promo_codes'> & { uses: number };

/** Admin: promo codes for riders (per country). Lift Me pays the discount; drivers earn on the full fare. */
export default function AdminPromos() {
  const market = useAdminMarket();
  const promos = useQuery({
    queryKey: ['admin-promos', market?.code],
    enabled: !!market,
    queryFn: async (): Promise<Promo[]> => {
      const { data, error } = await supabase.from('promo_codes').select('*').eq('market_code', market!.code).order('created_at', { ascending: false });
      if (error) throw error;
      // How many rides used each code (cancelled rides give the code back, so they don't count).
      const { data: rides, error: e2 } = await supabase
        .from('rides').select('promo_code').eq('market_code', market!.code).not('promo_code', 'is', null)
        .not('status', 'in', '(cancelled,no_driver_found)');
      if (e2) throw e2;
      return (data ?? []).map((p) => ({ ...p, uses: (rides ?? []).filter((r) => r.promo_code === p.code).length }));
    },
  });

  return (
    <AdminPage
      title={market ? `Promo codes · ${market.name}` : 'Promo codes'}
      subtitle="Riders type a code when booking. Lift Me pays the discount; drivers still earn their share of the full fare."
      onRefresh={() => promos.refetch()}
      refreshing={promos.isRefetching}
    >
      <AdminMarketSwitcher />
      {market ? <NewPromoCard key={market.code} market={market} /> : null}
      {promos.isLoading ? <Loading /> : null}
      <ErrorMessage error={promos.error} onRetry={() => promos.refetch()} />
      {promos.data && !promos.data.length ? <EmptyState icon="gift-outline" title="No promo codes yet" message="Create one above, e.g. WELCOME50 for 50% off a rider's first trip." /> : null}
      {market ? promos.data?.map((p) => <PromoRow key={p.code} promo={p} market={market} />) : null}
    </AdminPage>
  );
}

function NewPromoCard({ market }: { market: Market }) {
  const qc = useQueryClient();
  const d = market.currency_decimals;
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [percent, setPercent] = useState('50');
  const [cap, setCap] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [perPassenger, setPerPassenger] = useState('1');
  const [days, setDays] = useState('30');
  const [firstRide, setFirstRide] = useState(true);

  const create = useMutation({
    mutationFn: async () => {
      const c = code.trim().toUpperCase();
      if (!/^[A-Z0-9]{3,20}$/.test(c)) throw new Error('Code: 3 to 20 letters or numbers, no spaces.');
      if (!/^\d{1,3}$/.test(percent) || +percent < 1 || +percent > 100) throw new Error('Discount: a whole number from 1 to 100 (%).');
      const maxDiscount = cap.trim() === '' ? null : fromMoneyInput(cap, d);
      if (maxDiscount === null && cap.trim() !== '') throw new Error('Most off per ride: enter an amount, or leave it empty for no limit.');
      if (maxUses.trim() !== '' && !/^\d{1,6}$/.test(maxUses)) throw new Error('Total uses: a whole number, or empty for no limit.');
      if (!/^\d{1,3}$/.test(perPassenger) || +perPassenger < 1) throw new Error('Uses per rider: a whole number from 1.');
      if (days.trim() !== '' && !/^\d{1,4}$/.test(days)) throw new Error('Valid for: a number of days, or empty for no end date.');
      const { error } = await supabase.from('promo_codes').insert({
        code: c,
        market_code: market.code,
        description: description.trim(),
        percent_off: +percent,
        max_discount: maxDiscount || null,
        max_uses: maxUses.trim() === '' ? null : +maxUses,
        uses_per_passenger: +perPassenger,
        first_ride_only: firstRide,
        ends_at: days.trim() === '' ? null : new Date(Date.now() + +days * 86_400_000).toISOString(),
      });
      if (error) throw error.code === '23505' ? new Error(`The code ${c} already exists.`) : error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-promos'] });
      setCode('');
      setDescription('');
    },
  });

  const field = (label: string, value: string, set: (v: string) => void, kb: 'default' | 'number-pad' | 'decimal-pad' = 'number-pad', placeholder?: string) => (
    <View style={{ flexGrow: 1, flexBasis: 180 }}>
      <Input label={label} value={value} onChangeText={set} keyboardType={kb} placeholder={placeholder} />
    </View>
  );

  return (
    <Card>
      <Text style={[type.h3, { marginBottom: space.md }]}>New promo code</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <View style={{ flexGrow: 1, flexBasis: 180 }}>
          <Input label="Code" value={code} onChangeText={(x) => setCode(x.toUpperCase())} autoCapitalize="characters" placeholder="WELCOME50" />
        </View>
        {field('What riders see', description, setDescription, 'default', '50% off your first ride')}
        {field('Discount (%)', percent, setPercent)}
        {field(`Most off per ride (${market.currency}, empty = no limit)`, cap, setCap, d ? 'decimal-pad' : 'number-pad')}
        {field('Total uses (empty = no limit)', maxUses, setMaxUses)}
        {field('Uses per rider', perPassenger, setPerPassenger)}
        {field('Valid for (days, empty = no end)', days, setDays)}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md }}>
        <Switch value={firstRide} onValueChange={setFirstRide} {...switchColors} />
        <Text style={type.body}>Only for a rider’s first trip</Text>
      </View>
      <ErrorMessage error={create.error} />
      {create.isSuccess ? <Notice tone="success" text="Promo code created. Riders can use it straight away." /> : null}
      <Button title="Create promo code" variant="dark" onPress={() => create.mutate()} loading={create.isPending} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

function PromoRow({ promo: p, market }: { promo: Promo; market: Market }) {
  const qc = useQueryClient();
  const [now] = useState(() => Date.now());
  const toggle = useMutation({
    mutationFn: async (is_active: boolean) => {
      const { error } = await supabase.from('promo_codes').update({ is_active }).eq('code', p.code);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promos'] }),
  });
  const ended = p.ends_at != null && new Date(p.ends_at).getTime() < now;
  const usedUp = p.max_uses != null && p.uses >= p.max_uses;
  const rules = [
    `${p.percent_off}% off`,
    p.max_discount ? `up to ${formatMoney(p.max_discount, market.currency, market.currency_decimals)}` : '',
    p.first_ride_only ? 'first trip only' : '',
    `${p.uses_per_passenger} per rider`,
    p.ends_at ? `${ended ? 'ended' : 'until'} ${formatDateTime(p.ends_at)}` : 'no end date',
  ].filter(Boolean);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, flexWrap: 'wrap' }}>
        <View style={{ flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text style={type.h3}>{p.code}</Text>
            <Pill text={!p.is_active ? 'Off' : ended ? 'Ended' : usedUp ? 'Used up' : 'Active'} tone={p.is_active && !ended && !usedUp ? 'good' : 'neutral'} />
          </View>
          {p.description ? <Text style={type.body}>{p.description}</Text> : null}
          <Text style={type.small}>{rules.join(' · ')}</Text>
          <Text style={type.small}>Used {p.uses}{p.max_uses ? ` of ${p.max_uses}` : ''} times</Text>
        </View>
        <Chip label={p.is_active ? 'Turn off' : 'Turn on'} onPress={() => toggle.mutate(!p.is_active)} />
      </View>
      <ErrorMessage error={toggle.error} />
    </Card>
  );
}
