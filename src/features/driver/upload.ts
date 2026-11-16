import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // must match the bucket limit
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export type AllowedMime = (typeof ALLOWED)[number];

export type PickedFile = { uri: string; mime: AllowedMime; size?: number; ext: string };

function normalizeMime(mime: string | undefined, uri: string): AllowedMime | null {
  const m = (mime ?? '').toLowerCase();
  if ((ALLOWED as readonly string[]).includes(m)) return m as AllowedMime;
  if (m === 'image/jpg') return 'image/jpeg';
  const lower = uri.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

const EXT: Record<AllowedMime, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

function check(uri: string, mime: string | undefined, size: number | undefined): PickedFile {
  const m = normalizeMime(mime, uri);
  if (!m) throw new Error('Only photos (JPG, PNG) or PDF files are allowed.');
  if (size && size > MAX_UPLOAD_BYTES) throw new Error('File is too big. The limit is 10 MB.');
  return { uri, mime: m, size, ext: EXT[m] };
}

export async function pickFromCamera(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera permission is needed to take a photo. You can choose from the gallery instead.');
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (res.canceled) return null;
  const a = res.assets[0];
  return check(a.uri, a.mimeType ?? 'image/jpeg', a.fileSize);
}

export async function pickFromGallery(): Promise<PickedFile | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (res.canceled) return null;
  const a = res.assets[0];
  return check(a.uri, a.mimeType, a.fileSize);
}

export async function pickPdf(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
  if (res.canceled) return null;
  const a = res.assets[0];
  return check(a.uri, a.mimeType, a.size);
}

/** Uploads to the PRIVATE driver-documents bucket under the driver's own folder. */
export async function uploadDriverFile(driverId: string, name: string, file: PickedFile): Promise<string> {
  const body = await (await fetch(file.uri)).arrayBuffer();
  if (body.byteLength > MAX_UPLOAD_BYTES) throw new Error('File is too big. The limit is 10 MB.');
  const path = `${driverId}/${name}-${Date.now()}.${file.ext}`;
  const { error } = await supabase.storage.from('driver-documents').upload(path, body, { contentType: file.mime, upsert: false });
  if (error) throw error;
  return path;
}
