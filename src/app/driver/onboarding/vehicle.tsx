import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, ErrorMessage, Header, Input, Loading, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMyDriver } from '@/features/driver/hooks';
import { supabase } from '@/lib/supabase';
import { goBack } from '@/lib/nav';

const thisYear = new Date().getFullYear();
const schema = z.object({
  make: z.string().trim().min(1, 'Required').max(40),
  model: z.string().trim().min(1, 'Required').max(40),
  year: z.string().regex(/^\d{4}$/, 'Enter a year like 2016').refine((y) => +y >= 1980 && +y <= thisYear + 1, 'Enter a valid year'),
  colour: z.string().trim().min(1, 'Required').max(30),
  plate: z.string().trim().toUpperCase().regex(/^[A-Z0-9 ]{3,12}$/, 'Enter the number plate, e.g. KDA 123A or 7ABC123'),
});
type Form = z.infer<typeof schema>;

export default function VehicleDetails() {
  const { session } = useAuth();
  const me = useMyDriver(session?.user.id);
  const qc = useQueryClient();
  const v = me.data?.vehicle;
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    values: { make: v?.make ?? '', model: v?.model ?? '', year: v?.year ? String(v.year) : '', colour: v?.colour ?? '', plate: v?.plate ?? '' },
  });

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const row = { make: f.make, model: f.model, year: Number(f.year), colour: f.colour, plate: f.plate.replace(/\s+/g, ' ').toUpperCase() };
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

  if (me.isLoading) return <Loading />;
  const field = (name: keyof Form, label: string, extra: object = {}) => (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => <Input label={label} value={f.value} onChangeText={f.onChange} error={formState.errors[name]?.message} {...extra} />}
    />
  );

  return (
    <Screen footer={<Button title="Save vehicle" onPress={handleSubmit((f) => save.mutate(f))} loading={save.isPending} />}>
      <Header title="Vehicle details" back />
      {field('make', 'Make', { placeholder: 'Toyota' })}
      {field('model', 'Model', { placeholder: 'Axio' })}
      {field('year', 'Year', { keyboardType: 'number-pad', maxLength: 4, placeholder: '2016' })}
      {field('colour', 'Colour', { placeholder: 'Silver' })}
      {field('plate', 'Number plate', { autoCapitalize: 'characters', placeholder: 'KDA 123A' })}
      <ErrorMessage error={save.error} />
    </Screen>
  );
}
