import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Button, Card, Chip, ErrorMessage, Input, Loading, Notice, SectionTitle } from '@/components';
import { AdminPage } from '@/features/admin/AdminPage';
import { AdminMarketSwitcher, useAdminMarket } from '@/features/admin/market';
import type { Market } from '@/features/markets';
import { formatMoney, fromMoneyInput, toMoneyInput } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import { space, switchColors, type } from '@/theme';

type RideType = Tables<'pricing'>;
type Price = Tables<'market_prices'>;
const PRICE_FIELDS = ['base_fare', 'per_distance', 'per_minute', 'minimum_fare'] as const;
type PriceField = (typeof PRICE_FIELDS)[number];

function invalidateMarkets(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['markets'] });
  qc.invalidateQueries({ queryKey: ['admin-prices'] });
  qc.invalidateQueries({ queryKey: ['admin-overview'] });
}

/** One ride type's prices in one market. Amounts are typed like money (e.g. 2.50 for $2.50) and stored in the smallest unit. */
function PriceCard({ market, rideType, price }: { market: Market; rideType: RideType; price?: Price }) {
  const qc = useQueryClient();
  const d = market.currency_decimals;
  const unit = market.distance_unit === 'mi' ? 'mile' : 'km';
  const [values, setValues] = useState<Record<PriceField, string>>(() =>
    Object.fromEntries(PRICE_FIELDS.map((f) => [f, price ? toMoneyInput(price[f], d) : ''])) as Record<PriceField, string>,
  );
  const [name, setName] = useState({ display_name: rideType.display_name, description: rideType.description });
  const parsed = Object.fromEntries(PRICE_FIELDS.map((f) => [f, fromMoneyInput(values[f], d)])) as Record<PriceField, number | null>;
  const invalid = PRICE_FIELDS.filter((f) => parsed[f] === null);

  const save = useMutation({
    mutationFn: async () => {
      if (invalid.length) throw new Error(d ? `Enter amounts like 2.50 (up to ${d} decimals).` : 'Enter whole amounts (no decimals).');
      const amounts = parsed as Record<PriceField, number>;
      const { error } = price
        ? await supabase.from('market_prices').update(amounts).eq('market_code', market.code).eq('ride_type', rideType.ride_type)
        : await supabase.from('market_prices').insert({ market_code: market.code, ride_type: rideType.ride_type, ...amounts });
      if (error) throw error;
      if (name.display_name !== rideType.display_name || name.description !== rideType.description) {
        const r = await supabase.from('pricing').update(name).eq('ride_type', rideType.ride_type);
        if (r.error) throw r.error;
        qc.invalidateQueries({ queryKey: ['admin-ride-types'] });
      }
    },
    onSuccess: () => invalidateMarkets(qc),
  });
  const active = useMutation({
    mutationFn: async (is_active: boolean) => {
      const { error } = await supabase.from('market_prices').update({ is_active }).eq('market_code', market.code).eq('ride_type', rideType.ride_type);
      if (error) throw error;
    },
    onSuccess: () => invalidateMarkets(qc),
  });

  // Preview only — the real fare is always calculated by the database.
  const exampleDistance = market.distance_unit === 'mi' ? 6 : 10;
  const n = (f: PriceField) => parsed[f] ?? 0;
  const example = Math.max(n('minimum_fare'), Math.round(n('base_fare') + n('per_distance') * exampleDistance + n('per_minute') * 25));
  const label = (text: string) => `${text} (${market.currency})`;
  const field = (f: PriceField, text: string) => (
    <View key={f} style={{ flexGrow: 1, flexBasis: 160 }}>
      <Input
        label={label(text)}
        value={values[f]}
        onChangeText={(x) => setValues((v) => ({ ...v, [f]: x }))}
        keyboardType={d ? 'decimal-pad' : 'number-pad'}
        placeholder={d ? '0.00' : '0'}
        error={values[f] !== '' && parsed[f] === null ? 'Not a valid amount' : undefined}
      />
    </View>
  );

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
        <Text style={type.h2}>{rideType.display_name} <Text style={type.small}>({rideType.ride_type})</Text></Text>
        {price ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text style={type.small}>{price.is_active ? `Offered in ${market.name}` : 'Hidden'}</Text>
            <Switch value={price.is_active} onValueChange={(x) => active.mutate(x)} {...switchColors} />
          </View>
        ) : (
          <Text style={type.small}>Not offered in {market.name} yet</Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <View style={{ flexGrow: 1, flexBasis: 200 }}>
          <Input label="Name shown to passengers (all markets)" value={name.display_name} onChangeText={(x) => setName((v) => ({ ...v, display_name: x }))} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 200 }}>
          <Input label="Short description (all markets)" value={name.description} onChangeText={(x) => setName((v) => ({ ...v, description: x }))} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {field('base_fare', 'Base fare')}
        {field('per_distance', `Per ${unit}`)}
        {field('per_minute', 'Per minute')}
        {field('minimum_fare', 'Minimum fare')}
      </View>
      {!invalid.length ? (
        <Text style={[type.small, { marginBottom: space.md }]}>
          Example: a {exampleDistance} {market.distance_unit}, 25 minute trip would cost {formatMoney(example, market.currency, d)}.
        </Text>
      ) : null}
      <ErrorMessage error={save.error ?? active.error} />
      {save.isSuccess ? <Notice tone="success" text="Saved. New quotes use these prices straight away." /> : null}
      <Button
        title={price ? 'Save prices' : `Offer ${rideType.display_name} in ${market.name}`}
        variant="dark"
        onPress={() => save.mutate()}
        loading={save.isPending}
        style={{ alignSelf: 'flex-start' }}
      />
    </Card>
  );
}

const PAYMENT_LABELS: Record<Market['payment_methods'][number], string> = { mpesa: 'M-Pesa', cash: 'Cash', card: 'Card (Stripe)' };

/** Things that differ per market: commission, payment methods, emergency/support numbers, placeholder flag. */
function MarketSettingsCard({ market }: { market: Market }) {
  const qc = useQueryClient();
  const [commission, setCommission] = useState(String(market.commission_percent));
  const [methods, setMethods] = useState<Market['payment_methods']>(market.payment_methods);
  const [emergency, setEmergency] = useState((Array.isArray(market.emergency_numbers) ? market.emergency_numbers : []).join(', '));
  const [support, setSupport] = useState(market.support_phone);
  const [placeholder, setPlaceholder] = useState(market.prices_are_placeholder);
  // M-Pesa only takes Kenyan shillings.
  const available = (Object.keys(PAYMENT_LABELS) as Market['payment_methods']).filter((m) => m !== 'mpesa' || market.currency === 'KES');

  const save = useMutation({
    mutationFn: async () => {
      if (!/^\d{1,3}$/.test(commission) || +commission > 100) throw new Error('Commission: enter a whole number from 0 to 100.');
      if (!methods.length) throw new Error('Pick at least one payment method.');
      const numbers = emergency.split(',').map((s) => s.trim()).filter(Boolean);
      if (numbers.some((x) => !/^[0-9+]{2,15}$/.test(x))) throw new Error('Emergency numbers: digits only, separated by commas.');
      const { error } = await supabase.from('markets').update({
        commission_percent: +commission,
        payment_methods: methods,
        emergency_numbers: numbers,
        support_phone: support.trim(),
        prices_are_placeholder: placeholder,
      }).eq('code', market.code);
      if (error) throw error;
    },
    onSuccess: () => invalidateMarkets(qc),
  });

  return (
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <View style={{ flexGrow: 1, flexBasis: 200 }}>
          <Input label="Commission % per completed ride" value={commission} onChangeText={setCommission} keyboardType="number-pad" />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 200 }}>
          <Input label="Emergency numbers (comma separated)" value={emergency} onChangeText={setEmergency} keyboardType="phone-pad" />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 200 }}>
          <Input label="Support phone (shown on Help page)" value={support} onChangeText={setSupport} keyboardType="phone-pad" />
        </View>
      </View>
      <Text style={[type.label, { marginBottom: space.sm }]}>Payment methods passengers can choose</Text>
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
        {available.map((m) => (
          <Chip
            key={m}
            label={PAYMENT_LABELS[m]}
            selected={methods.includes(m)}
            onPress={() => setMethods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg }}>
        <Switch value={placeholder} onValueChange={setPlaceholder} {...switchColors} />
        <Text style={type.body}>Prices in {market.name} are still placeholders</Text>
      </View>
      <ErrorMessage error={save.error} />
      {save.isSuccess ? <Notice tone="success" text={`${market.name} settings saved.`} /> : null}
      <Button title={`Save ${market.name} settings`} variant="dark" onPress={() => save.mutate()} loading={save.isPending} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

const PLATFORM: { key: string; label: string }[] = [
  { key: 'match_radius_km', label: 'Match radius (km)' },
  { key: 'search_timeout_seconds', label: 'Search timeout (seconds)' },
  { key: 'quote_valid_minutes', label: 'Quote valid for (minutes)' },
  { key: 'location_interval_seconds', label: 'Driver location every (seconds)' },
  { key: 'location_fresh_seconds', label: 'Driver counts as online if seen within (seconds)' },
];

/** Settings shared by every market. */
function PlatformSettingsCard({ rows }: { rows: Tables<'settings'>[] }) {
  const qc = useQueryClient();
  const initial = Object.fromEntries(rows.map((r) => [r.key, String(r.value ?? '')]));
  const [values, setValues] = useState<Record<string, string>>(initial);
  const save = useMutation({
    mutationFn: async () => {
      for (const s of PLATFORM) {
        const raw = values[s.key] ?? '';
        if (raw === initial[s.key]) continue;
        if (!/^\d{1,6}$/.test(raw)) throw new Error(`${s.label}: enter a whole number`);
        const { error } = await supabase.from('settings').update({ value: Number(raw) }).eq('key', s.key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
  return (
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {PLATFORM.map((s) => (
          <View key={s.key} style={{ flexGrow: 1, flexBasis: 240 }}>
            <Input label={s.label} value={values[s.key] ?? ''} keyboardType="number-pad" onChangeText={(x) => setValues((v) => ({ ...v, [s.key]: x }))} />
          </View>
        ))}
      </View>
      <ErrorMessage error={save.error} />
      {save.isSuccess ? <Notice tone="success" text="Settings saved." /> : null}
      <Button title="Save platform settings" variant="dark" onPress={() => save.mutate()} loading={save.isPending} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

export default function AdminPricing() {
  const market = useAdminMarket();
  const rideTypes = useQuery({
    queryKey: ['admin-ride-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pricing').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });
  const prices = useQuery({
    queryKey: ['admin-prices', market?.code],
    enabled: !!market,
    queryFn: async () => {
      const { data, error } = await supabase.from('market_prices').select('*').eq('market_code', market!.code);
      if (error) throw error;
      return data;
    },
  });
  const settings = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('*').order('key');
      if (error) throw error;
      return data;
    },
  });

  return (
    <AdminPage
      title={market ? `Pricing · ${market.name}` : 'Pricing & settings'}
      subtitle={market ? `Amounts in ${market.currency}, distances in ${market.distance_unit}. Every change is saved in the audit log.` : undefined}
    >
      <AdminMarketSwitcher />
      {rideTypes.isLoading || prices.isLoading || settings.isLoading ? <Loading /> : null}
      <ErrorMessage error={rideTypes.error ?? prices.error ?? settings.error} />
      {market?.prices_are_placeholder ? (
        <Notice tone="error" text={`These are PLACEHOLDER prices for ${market.name}. Enter your real prices, then switch off "Prices are still placeholders" below.`} />
      ) : null}
      {market && prices.data
        ? rideTypes.data
            // Ride types limited to some countries (bodas: Kenya only) are hidden elsewhere.
            ?.filter((t) => !t.countries || t.countries.includes(market.country_iso))
            .map((t) => {
            const price = prices.data.find((p) => p.ride_type === t.ride_type);
            return <PriceCard key={`${market.code}-${t.ride_type}-${price?.updated_at ?? 'new'}`} market={market} rideType={t} price={price} />;
          })
        : null}
      {market ? (
        <>
          <SectionTitle>{`${market.name} settings`}</SectionTitle>
          <MarketSettingsCard key={`${market.code}-${market.updated_at}`} market={market} />
        </>
      ) : null}
      <SectionTitle>Platform settings (all markets)</SectionTitle>
      {settings.data ? <PlatformSettingsCard key={settings.dataUpdatedAt} rows={settings.data} /> : null}
      <Button title="Markets & service areas" variant="outline" small onPress={() => router.push('/admin/markets')} style={{ alignSelf: 'flex-start', marginTop: space.md }} />
    </AdminPage>
  );
}
