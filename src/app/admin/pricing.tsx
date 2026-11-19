import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Switch, Text, View } from 'react-native';
import { z } from 'zod';
import { Button, Card, ErrorMessage, Input, Loading, Notice, SectionTitle } from '@/components';
import { AdminPage } from '@/features/admin/AdminPage';
import { formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import { space, switchColors, type } from '@/theme';

const money = z.string().regex(/^\d{1,6}$/, 'Whole KES only (no decimals)');
const schema = z.object({ base_fare: money, per_km: money, per_minute: money, minimum_fare: money, display_name: z.string().trim().min(2), description: z.string().trim().max(120) });
type Form = z.infer<typeof schema>;

function PriceCard({ row }: { row: Tables<'pricing'> }) {
  const qc = useQueryClient();
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    values: {
      base_fare: String(row.base_fare), per_km: String(row.per_km), per_minute: String(row.per_minute),
      minimum_fare: String(row.minimum_fare), display_name: row.display_name, description: row.description,
    },
  });
  const save = useMutation({
    mutationFn: async (f: Form) => {
      const { error } = await supabase.from('pricing').update({
        base_fare: +f.base_fare, per_km: +f.per_km, per_minute: +f.per_minute, minimum_fare: +f.minimum_fare,
        display_name: f.display_name, description: f.description,
      }).eq('ride_type', row.ride_type);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pricing'] }),
  });
  const active = useMutation({
    mutationFn: async (is_active: boolean) => {
      const { error } = await supabase.from('pricing').update({ is_active }).eq('ride_type', row.ride_type);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pricing'] }),
  });

  const v = useWatch({ control });
  // Preview only — the real fare is always calculated by the database.
  const n = (x: string | undefined) => Number(x ?? 0) || 0;
  const example = Math.max(n(v.minimum_fare), Math.round(n(v.base_fare) + n(v.per_km) * 10 + n(v.per_minute) * 25));
  const field = (name: keyof Form, label: string, numeric = true) => (
    <View style={{ flexGrow: 1, flexBasis: 160 }}>
      <Controller control={control} name={name} render={({ field: f }) => (
        <Input label={label} value={f.value} onChangeText={f.onChange} keyboardType={numeric ? 'number-pad' : 'default'} error={formState.errors[name]?.message} />
      )} />
    </View>
  );

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
        <Text style={type.h2}>{row.display_name} <Text style={type.small}>({row.ride_type})</Text></Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text style={type.small}>{row.is_active ? 'Available' : 'Hidden'}</Text>
          <Switch value={row.is_active} onValueChange={(x) => active.mutate(x)} {...switchColors} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {field('display_name', 'Name shown to passengers', false)}
        {field('description', 'Short description', false)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {field('base_fare', `Base fare (${row.currency})`)}
        {field('per_km', `Per km (${row.currency})`)}
        {field('per_minute', `Per minute (${row.currency})`)}
        {field('minimum_fare', `Minimum fare (${row.currency})`)}
      </View>
      <Text style={[type.small, { marginBottom: space.md }]}>Example: a 10 km, 25 minute trip would cost {formatMoney(example, row.currency)}.</Text>
      <ErrorMessage error={save.error ?? active.error} />
      {save.isSuccess ? <Notice tone="success" text="Saved. New quotes use these prices straight away." /> : null}
      <Button title="Save prices" variant="dark" onPress={handleSubmit((f) => save.mutate(f))} loading={save.isPending} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

const EDITABLE: { key: string; label: string; kind: 'int' | 'text' | 'bool' }[] = [
  { key: 'commission_percent', label: 'Commission % per completed ride', kind: 'int' },
  { key: 'match_radius_km', label: 'Match radius (km)', kind: 'int' },
  { key: 'search_timeout_seconds', label: 'Search timeout (seconds)', kind: 'int' },
  { key: 'quote_valid_minutes', label: 'Quote valid for (minutes)', kind: 'int' },
  { key: 'location_interval_seconds', label: 'Driver location every (seconds)', kind: 'int' },
  { key: 'support_phone', label: 'Support phone (shown on Help page)', kind: 'text' },
  { key: 'pricing_is_placeholder', label: 'Prices are still placeholders', kind: 'bool' },
];

function SettingsCard({ rows }: { rows: Tables<'settings'>[] }) {
  const qc = useQueryClient();
  const initial = Object.fromEntries(rows.map((r) => [r.key, typeof r.value === 'string' ? r.value : JSON.stringify(r.value)]));
  const [values, setValues] = useState<Record<string, string>>(initial);
  const save = useMutation({
    mutationFn: async () => {
      for (const s of EDITABLE) {
        const raw = values[s.key];
        if (raw === initial[s.key]) continue;
        let value: unknown = raw;
        if (s.kind === 'int') {
          if (!/^\d{1,6}$/.test(raw)) throw new Error(`${s.label}: enter a whole number`);
          value = Number(raw);
        }
        if (s.kind === 'bool') value = raw === 'true';
        const { error } = await supabase.from('settings').update({ value: value as never }).eq('key', s.key);
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
        {EDITABLE.map((s) => (
          <View key={s.key} style={{ flexGrow: 1, flexBasis: 240 }}>
            {s.kind === 'bool' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg }}>
                <Switch value={values[s.key] === 'true'} onValueChange={(x) => setValues((v) => ({ ...v, [s.key]: String(x) }))} {...switchColors} />
                <Text style={type.body}>{s.label}</Text>
              </View>
            ) : (
              <Input label={s.label} value={values[s.key] ?? ''} keyboardType={s.kind === 'int' ? 'number-pad' : 'phone-pad'} onChangeText={(x) => setValues((v) => ({ ...v, [s.key]: x }))} />
            )}
          </View>
        ))}
      </View>
      <ErrorMessage error={save.error} />
      {save.isSuccess ? <Notice tone="success" text="Settings saved." /> : null}
      <Button title="Save settings" variant="dark" onPress={() => save.mutate()} loading={save.isPending} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

export default function AdminPricing() {
  const pricing = useQuery({
    queryKey: ['admin-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pricing').select('*').order('sort_order');
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
    <AdminPage title="Pricing & settings" subtitle="All amounts are whole KES. Every change is saved in the audit log.">
      {pricing.isLoading || settings.isLoading ? <Loading /> : null}
      <ErrorMessage error={pricing.error ?? settings.error} />
      {settings.data?.find((s) => s.key === 'pricing_is_placeholder')?.value === true ? (
        <Notice tone="error" text="These are PLACEHOLDER prices. Enter your real prices, then switch off 'Prices are still placeholders' below." />
      ) : null}
      {pricing.data?.map((row) => <PriceCard key={`${row.ride_type}-${row.updated_at}`} row={row} />)}
      <SectionTitle>Platform settings</SectionTitle>
      {settings.data ? <SettingsCard key={settings.dataUpdatedAt} rows={settings.data} /> : null}
      <Text style={type.small}>The service area (Nairobi polygon) is edited in Supabase → Table editor → service_area, or with SQL (see docs/SETUP.md).</Text>
    </AdminPage>
  );
}
