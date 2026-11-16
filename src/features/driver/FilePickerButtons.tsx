import { Platform, View } from 'react-native';
import { Button } from '@/components';
import { space } from '@/theme';
import { pickFromCamera, pickFromGallery, pickPdf, type PickedFile } from './upload';

/** Camera / gallery / PDF buttons. */
export function FilePickerButtons({ onPicked, onError, allowPdf = true, busy }: {
  onPicked: (f: PickedFile) => void; onError: (e: unknown) => void; allowPdf?: boolean; busy?: boolean;
}) {
  const run = (fn: () => Promise<PickedFile | null>) => async () => {
    try {
      const f = await fn();
      if (f) onPicked(f);
    } catch (e) {
      onError(e);
    }
  };
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
      {Platform.OS !== 'web' ? <Button small title="Camera" variant="dark" onPress={run(pickFromCamera)} disabled={busy} /> : null}
      <Button small title="Gallery" variant="outline" onPress={run(pickFromGallery)} disabled={busy} />
      {allowPdf ? <Button small title="PDF" variant="outline" onPress={run(pickPdf)} disabled={busy} /> : null}
    </View>
  );
}
