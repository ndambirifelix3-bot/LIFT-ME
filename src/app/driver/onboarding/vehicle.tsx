import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, ErrorMessage, Header, Input, Loading, Screen, SectionTitle } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { driverHints } from '@/features/driver/countryHints';
import { useMyDriver } from '@/features/driver/hooks';
import { RideTypeIcon, useRideTypes, type RideType } from '@/features/rides/rideTypes';
import { supabase } from '@/lib/supabase';
import { goBack } from '@/lib/nav';
import { colors, fonts, radius, space, type } from '@/theme';

const thisYear = new Date().getFullYear();
const schema = z.object({
  make: z.string().trim().min(1, 'Required').max(40),
  model: z.string().trim().min(1, 'Required').max(40),
  year: z.string().regex(/^\d{4}$/, 'Enter a year like 2016').refine((y) => +y >= 1980 && +y <= thisYear + 1, 'Enter a valid year'),
  colour: z.string().trim().min(1, 'Required').max(30),
  plate: z.string().trim().toUpperCase().regex(/^[A-Z0-9 -]{3,12}$/, 'Enter the number plate exactly as shown (letters and numbers)'),
});
type Form = z.infer<typeof schema>;

export default function VehicleDetails() {
  const { session } = useAuth();
  const me = useMyDriver(session?.user.id);
  const qc = useQueryClient();
  const v = me.data?.vehicle;
  const market = me.data?.driver?.market_code ?? null;
  const allTypes = useRideTypes();
  // Only the ride types this driver's city offers (e.g. bodas are Kenya only).
  const offered = useQuery({
    queryKey: ['offered-ride-types', market],
    enabled: !!market,
    queryFn: async () => {
      const { data, error } = await supabase.from('market_prices').select('ride_type').eq('market_code', market!).eq('is_active', true);
      if (error) throw error;
      return new Set(data.map((x) => x.ride_type));
    },
  });
  const types = (allTypes.data ?? []).filter((t) => !market || offered.data?.has(t.ride_type));
  const [picked, setPicked] = useState<string | null>(null);
  const rideType = picked ?? v?.ride_type ?? null;
  const [typeError, setTypeError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    values: { make: v?.make ?? '', model: v?.model ?? '', year: v?.year ? String(v.year) : '', colour: v?.colour ?? '', plate: v?.plate ?? '' },
  });

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const row = { make: f.make, model: f.model, year: Number(f.year), colour: f.colour, plate: f.plate.replace(/\s+/g, ' ').toUpperCase(), ride_type: rideType! };
      const res = v
        ? await supabase.from('vehicles').update(row).eq('id', v.id)
        : await supabase.from('vehicles').insert({ ...row, driver_id: session!.user.id });
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['my-driver'] });
      goBack('/driver/onboarding');
    },
  });

  if (me.isLoading || allTypes.isLoading) return <Loading />;
  const isBike = types.find((t) => t.ride_type === rideType)?.vehicle_kind === 'motorcycle';
  const hints = driverHints(me.data?.country);
  const submit = handleSubmit((f) => {
    if (!rideType) return setTypeError('Choose what you drive');
    save.mutate(f);
  });
  const group = (kind: string, title: string) => {
    const list = types.filter((t) => t.vehicle_kind === kind);
    if (!list.length) return null;
    return (
      <>
        <Text style={[type.small, { marginTop: space.sm, marginBottom: space.xs }]}>{title}</Text>
        {list.map((t) => <TypeOption key={t.ride_type} t={t} selected={rideType === t.ride_type} onPress={() => { setPicked(t.ride_type); setTypeError(null); }} />)}
      </>
    );
  };
  const field = (name: keyof Form, label: string, extra: object = {}) => (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => <Input label={label} value={f.value} onChangeText={f.onChange} error={formState.errors[name]?.message} {...extra} />}
    />
  );

  return (
    <Screen footer={<Button title="Save vehicle" onPress={submit} loading={save.isPending} />}>
      <Header title="Vehicle details" back />
      <SectionTitle>What do you drive?</SectionTitle>
      {group('motorcycle', 'Motorbike (boda)')}
      {group('car', 'Car')}
      {typeError ? <Text style={styles.error}>{typeError}</Text> : null}
      <Text style={[type.small, { marginVertical: space.sm }]}>Our team checks this when approving your application.</Text>
      <SectionTitle>Vehicle</SectionTitle>
      {field('make', 'Make', { placeholder: isBike ? hints.bikeMake : hints.carMake })}
      {field('model', 'Model', { placeholder: isBike ? hints.bikeModel : hints.carModel })}
      {field('year', 'Year', { keyboardType: 'number-pad', maxLength: 4, placeholder: hints.year })}
      {field('colour', me.data?.country === 'us' ? 'Color' : 'Colour', { placeholder: hints.colour })}
      {field('plate', me.data?.country === 'us' ? 'License plate' : 'Number plate', { autoCapitalize: 'characters', placeholder: isBike ? hints.bikePlateExample : hints.plateExample })}
      <ErrorMessage error={save.error} />
    </Screen>
  );
}

function TypeOption({ t, selected, onPress }: { t: RideType; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={[styles.option, selected && styles.optionSelected]}>
      <RideTypeIcon type={t} size={28} color={selected ? colors.brand : colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, selected && { color: colors.white }]}>{t.display_name}{t.is_electric ? '  ⚡' : ''}</Text>
        <Text style={[type.small, selected && { color: colors.ivory }]}>{t.description} · {t.seats === 1 ? '1 passenger' : `${t.seats} passenger seats`}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, marginBottom: space.sm },
  optionSelected: { backgroundColor: colors.black, borderColor: colors.black },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  error: { color: colors.error, fontFamily: fonts.medium, marginTop: space.xs },
});
