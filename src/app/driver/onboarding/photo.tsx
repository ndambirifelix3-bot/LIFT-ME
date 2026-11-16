import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { Button, ErrorMessage, Header, Notice, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { FilePickerButtons } from '@/features/driver/FilePickerButtons';
import { useMyDriver } from '@/features/driver/hooks';
import { uploadDriverFile, type PickedFile } from '@/features/driver/upload';
import { useSignedPhoto } from '@/features/rides/hooks';
import { supabase } from '@/lib/supabase';
import { colors, space } from '@/theme';

export default function DriverPhoto() {
  const { session } = useAuth();
  const me = useMyDriver(session?.user.id);
  const existing = useSignedPhoto(me.data?.driver?.photo_path);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [pickError, setPickError] = useState<unknown>(null);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const uid = session!.user.id;
      const old = me.data?.driver?.photo_path;
      const path = await uploadDriverFile(uid, 'photo', file!);
      const { error } = await supabase.from('drivers').update({ photo_path: path }).eq('id', uid);
      if (error) throw error;
      if (old) await supabase.storage.from('driver-documents').remove([old]);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['my-driver'] });
      router.back();
    },
  });

  const preview = file?.uri ?? existing.data;
  return (
    <Screen footer={<Button title="Save photo" disabled={!file} onPress={() => save.mutate()} loading={save.isPending} />}>
      <Header title="Profile photo" subtitle="Passengers see this photo so they can recognise you." back />
      <Notice text="Use a clear, recent photo of your face. No sunglasses or hats." />
      <View style={{ alignItems: 'center', marginVertical: space.lg }}>
        {preview ? (
          <Image source={{ uri: preview }} style={{ width: 160, height: 160, borderRadius: 80 }} accessibilityLabel="Your photo" />
        ) : (
          <View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: colors.border }} />
        )}
      </View>
      <FilePickerButtons allowPdf={false} onPicked={(f) => { setPickError(null); setFile(f); }} onError={setPickError} busy={save.isPending} />
      <View style={{ height: space.md }} />
      <ErrorMessage error={pickError ?? save.error} />
    </Screen>
  );
}
