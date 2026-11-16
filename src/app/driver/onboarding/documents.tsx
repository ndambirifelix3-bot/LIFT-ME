import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Card, ErrorMessage, Header, Loading, Notice, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { FilePickerButtons } from '@/features/driver/FilePickerButtons';
import { useMyDriver } from '@/features/driver/hooks';
import { uploadDriverFile, type PickedFile } from '@/features/driver/upload';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, space, type } from '@/theme';

export default function DriverDocuments() {
  const { session } = useAuth();
  const me = useMyDriver(session?.user.id);
  const qc = useQueryClient();
  const [errors, setErrors] = useState<Record<string, unknown>>({});

  const upload = useMutation({
    mutationFn: async ({ code, file }: { code: string; file: PickedFile }) => {
      const uid = session!.user.id;
      const existing = me.data?.documents.find((d) => d.doc_type === code);
      const path = await uploadDriverFile(uid, code, file);
      if (existing) {
        const { error } = await supabase
          .from('driver_documents')
          .update({ file_path: path, mime_type: file.mime, uploaded_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
        await supabase.storage.from('driver-documents').remove([existing.file_path]);
      } else {
        const { error } = await supabase.from('driver_documents').insert({ driver_id: uid, doc_type: code, file_path: path, mime_type: file.mime });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-driver'] }),
    onError: (e, v) => setErrors((x) => ({ ...x, [v.code]: e })),
  });

  if (me.isLoading || !me.data) return <Loading />;
  const { documents, documentTypes } = me.data;

  return (
    <Screen>
      <Header title="Documents" subtitle="Photos or PDFs, up to 10 MB each." back />
      <Notice text="Make sure all four corners are visible and the text is readable." />
      {documentTypes.map((t) => {
        const doc = documents.find((d) => d.doc_type === t.code);
        const busy = upload.isPending && upload.variables?.code === t.code;
        return (
          <Card key={t.code}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs }}>
              <Ionicons name={doc ? 'checkmark-circle' : 'document-outline'} size={22} color={doc ? colors.success : colors.secondary} />
              <Text style={[type.h3, { flex: 1 }]}>{t.name}{t.required ? '' : ' (optional)'}</Text>
            </View>
            <Text style={[type.small, { marginBottom: space.md }]}>
              {busy ? 'Uploading…' : doc ? `Uploaded ${formatDateTime(doc.uploaded_at)}` : t.description}
            </Text>
            <FilePickerButtons
              busy={upload.isPending}
              onPicked={(file) => {
                setErrors((x) => ({ ...x, [t.code]: null }));
                upload.mutate({ code: t.code, file });
              }}
              onError={(e) => setErrors((x) => ({ ...x, [t.code]: e }))}
            />
            <View style={{ height: space.sm }} />
            <ErrorMessage error={errors[t.code]} />
          </Card>
        );
      })}
    </Screen>
  );
}
