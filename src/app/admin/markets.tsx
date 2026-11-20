import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Switch, Text, View } from 'react-native';
import { Button, Card, Chip, ErrorMessage, Input, ListItem, Loading, Notice, SectionTitle } from '@/components';
import { AdminPage } from '@/features/admin/AdminPage';
import { type Market, useMarkets } from '@/features/markets';
import { currencyDecimals } from '@/lib/format';
import { geoJsonToMultiPolygon } from '@/lib/geo';
import { flagEmoji } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { space, switchColors, type } from '@/theme';

function refresh(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['markets'] });
  qc.invalidateQueries({ queryKey: ['admin-areas'] });
}

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30);

/** Service areas (map shapes) of one market: list, switch on/off, add from geojson.io. */
function AreasCard({ market }: { market: Market }) {
  const qc = useQueryClient();
  const areas = useQuery({
    queryKey: ['admin-areas', market.code],
    queryFn: async () => {
      // `area` itself is left out: the shape is only needed by the database.
      const { data, error } = await supabase.from('service_area').select('id, name, is_active, created_at').eq('market_code', market.code).order('created_at');
      if (error) throw error;
      return data;
    },
  });
  const [name, setName] = useState('');
  const [geojson, setGeojson] = useState('');
  const add = useMutation({
    mutationFn: async () => {
      if (name.trim().length < 2) throw new Error('Give the area a name, e.g. "Manhattan".');
      const area = geoJsonToMultiPolygon(geojson);
      const { error } = await supabase.from('service_area').insert({ name: name.trim(), market_code: market.code, area });
      if (error) throw error;
    },
    onSuccess: () => {
      setName('');
      setGeojson('');
      refresh(qc);
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('service_area').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => refresh(qc),
  });

  return (
    <Card>
      <Text style={[type.h3, { marginBottom: space.sm }]}>Service areas</Text>
      <Text style={[type.small, { marginBottom: space.md }]}>Rides can only start and end inside an active area.</Text>
      {areas.isLoading ? <Loading /> : null}
      {areas.data?.length === 0 ? <Notice tone="error" text={`${market.name} has no service area yet, so nobody can book there.`} /> : null}
      {areas.data?.map((a) => (
        <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
          <Text style={type.body}>{a.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text style={type.small}>{a.is_active ? 'Active' : 'Off'}</Text>
            <Switch value={a.is_active} onValueChange={(is_active) => toggle.mutate({ id: a.id, is_active })} {...switchColors} />
          </View>
        </View>
      ))}
      <Text style={[type.label, { marginTop: space.md, marginBottom: space.sm }]}>Add an area</Text>
      <Text style={[type.small, { marginBottom: space.sm }]}>
        1. Open geojson.io, find the city and draw the area with the polygon tool.{'\n'}
        2. Copy all the text from the right-hand panel and paste it below.
      </Text>
      <Button title="Open geojson.io" variant="outline" small onPress={() => Linking.openURL('https://geojson.io')} style={{ alignSelf: 'flex-start', marginBottom: space.md }} />
      <Input label="Area name" value={name} onChangeText={setName} placeholder="e.g. Manhattan" />
      <Input label="GeoJSON from geojson.io" value={geojson} onChangeText={setGeojson} multiline numberOfLines={4} placeholder='{"type":"FeatureCollection", …}' />
      <ErrorMessage error={add.error ?? toggle.error} />
      {add.isSuccess ? <Notice tone="success" text="Area added." /> : null}
      <Button title="Add area" variant="dark" onPress={() => add.mutate()} loading={add.isPending} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

/** Name, on/off, time zone, units and phone code of an existing market. Currency can't change once set. */
function MarketCard({ market }: { market: Market }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: market.name,
    timezone: market.timezone,
    phone_country_code: market.phone_country_code,
    distance_unit: market.distance_unit,
    is_active: market.is_active,
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!/^\+\d{1,4}$/.test(form.phone_country_code)) throw new Error('Phone code looks like +1 or +254.');
      const { error } = await supabase.from('markets').update({ ...form, name: form.name.trim() }).eq('code', market.code);
      if (error) throw error;
    },
    onSuccess: () => refresh(qc),
  });

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
        <Text style={type.h2}>{flagEmoji(market.country_iso)} {market.name} <Text style={type.small}>({market.code})</Text></Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text style={type.small}>{form.is_active ? 'Open for rides' : 'Switched off'}</Text>
          <Switch value={form.is_active} onValueChange={(is_active) => setForm((f) => ({ ...f, is_active }))} {...switchColors} />
        </View>
      </View>
      <Text style={[type.small, { marginBottom: space.md }]}>
        Currency: {market.currency} ({market.currency_decimals === 0 ? 'whole amounts' : `${market.currency_decimals} decimals`}) · Country: {market.country_iso.toUpperCase()}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <View style={{ flexGrow: 1, flexBasis: 200 }}>
          <Input label="Name" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 200 }}>
          <Input label="Time zone (e.g. America/New_York)" value={form.timezone} onChangeText={(timezone) => setForm((f) => ({ ...f, timezone }))} autoCapitalize="none" />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 140 }}>
          <Input label="Phone code" value={form.phone_country_code} onChangeText={(phone_country_code) => setForm((f) => ({ ...f, phone_country_code }))} keyboardType="phone-pad" />
        </View>
      </View>
      <Text style={[type.label, { marginBottom: space.sm }]}>Distances in</Text>
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
        {(['km', 'mi'] as const).map((u) => (
          <Chip key={u} label={u === 'km' ? 'Kilometres' : 'Miles'} selected={form.distance_unit === u} onPress={() => setForm((f) => ({ ...f, distance_unit: u }))} />
        ))}
      </View>
      <ErrorMessage error={save.error} />
      {save.isSuccess ? <Notice tone="success" text="Saved." /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Button title="Save" variant="dark" small onPress={() => save.mutate()} loading={save.isPending} />
        <Button title="Prices & payment methods" variant="outline" small onPress={() => router.push('/admin/pricing')} />
      </View>
      <View style={{ height: space.md }} />
      <AreasCard market={market} />
    </Card>
  );
}

/** Form to add a new city/country. It starts switched off until prices and an area are set. */
function NewMarketCard() {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', country_iso: 'us', currency: 'USD', timezone: 'America/New_York', phone_country_code: '+1', distance_unit: 'mi', emergency: '911' });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const create = useMutation({
    mutationFn: async () => {
      const code = slug(f.name);
      if (!code) throw new Error('Enter the city name.');
      if (!/^[a-z]{2}$/.test(f.country_iso.trim().toLowerCase())) throw new Error('Country: 2 letters, e.g. us or ke.');
      if (!/^[A-Z]{3}$/.test(f.currency.trim().toUpperCase())) throw new Error('Currency: 3 letters, e.g. USD or KES.');
      if (!/^\+\d{1,4}$/.test(f.phone_country_code.trim())) throw new Error('Phone code looks like +1 or +254.');
      const currency = f.currency.trim().toUpperCase();
      const { error } = await supabase.from('markets').insert({
        code,
        name: f.name.trim(),
        country_iso: f.country_iso.trim().toLowerCase(),
        currency,
        currency_decimals: currencyDecimals(currency),
        timezone: f.timezone.trim(),
        phone_country_code: f.phone_country_code.trim(),
        distance_unit: f.distance_unit === 'km' ? 'km' : 'mi',
        emergency_numbers: f.emergency.split(',').map((s) => s.trim()).filter(Boolean),
        payment_methods: ['cash'],
        is_active: false,
        sort_order: 100,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setF((x) => ({ ...x, name: '' }));
      refresh(qc);
    },
  });

  return (
    <Card>
      <Text style={[type.h3, { marginBottom: space.sm }]}>Add a city</Text>
      <Text style={[type.small, { marginBottom: space.md }]}>
        It starts switched off. Then add its service area and prices, and switch it on. Card payments (Stripe) come later; until then only cash is offered.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <View style={{ flexGrow: 1, flexBasis: 200 }}><Input label="City name" value={f.name} onChangeText={set('name')} placeholder="e.g. New York City" /></View>
        <View style={{ flexGrow: 1, flexBasis: 120 }}><Input label="Country (2 letters)" value={f.country_iso} onChangeText={set('country_iso')} autoCapitalize="none" maxLength={2} /></View>
        <View style={{ flexGrow: 1, flexBasis: 120 }}><Input label="Currency (3 letters)" value={f.currency} onChangeText={set('currency')} autoCapitalize="characters" maxLength={3} /></View>
        <View style={{ flexGrow: 1, flexBasis: 200 }}><Input label="Time zone" value={f.timezone} onChangeText={set('timezone')} autoCapitalize="none" /></View>
        <View style={{ flexGrow: 1, flexBasis: 120 }}><Input label="Phone code" value={f.phone_country_code} onChangeText={set('phone_country_code')} keyboardType="phone-pad" /></View>
        <View style={{ flexGrow: 1, flexBasis: 160 }}><Input label="Emergency numbers" value={f.emergency} onChangeText={set('emergency')} keyboardType="phone-pad" /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
        {(['km', 'mi'] as const).map((u) => (
          <Chip key={u} label={u === 'km' ? 'Kilometres' : 'Miles'} selected={f.distance_unit === u} onPress={() => set('distance_unit')(u)} />
        ))}
      </View>
      <ErrorMessage error={create.error} />
      {create.isSuccess ? <Notice tone="success" text="City added (switched off). Add its area and prices next." /> : null}
      <Button title="Add city" variant="dark" onPress={() => create.mutate()} loading={create.isPending} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

export default function AdminMarkets() {
  const markets = useMarkets();
  return (
    <AdminPage title="Markets" subtitle="The cities Lift Me runs in. Each has its own area, currency, prices and payment methods.">
      {markets.isLoading ? <Loading /> : null}
      <ErrorMessage error={markets.error} onRetry={() => markets.refetch()} />
      {markets.data?.map((m) => <MarketCard key={`${m.code}-${m.updated_at}`} market={m} />)}
      <SectionTitle>New city</SectionTitle>
      <NewMarketCard />
      <ListItem icon="information-circle-outline" title="Drivers are placed in a market by their phone's country code" subtitle="Move a driver to another market from their page under Drivers." />
    </AdminPage>
  );
}
