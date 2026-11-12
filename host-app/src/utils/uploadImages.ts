import * as ImagePicker from 'expo-image-picker';
import { hostService } from '../services/host.service';
import { apiErrorMessage } from './apiError';

export interface UploadBatchResult {
  /** The picker was closed without choosing anything. */
  canceled: boolean;
  /** Server URLs of the photos that uploaded, in the order they were picked. */
  urls: string[];
  /** How many photos failed. */
  failed: number;
  /** Arabic reason for the last failure, when any. */
  error?: string;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

/**
 * Let the host pick photos and upload them one by one.
 *
 * One failed photo does not stop the rest, and only a real http(s) URL
 * returned by the server is ever reported — a local file:// path is never
 * treated as an uploaded image.
 */
export async function pickAndUploadImages(onUploaded?: (url: string) => void): Promise<UploadBatchResult> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return { canceled: true, urls: [], failed: 0 };

  const urls: string[] = [];
  let failed = 0;
  let error: string | undefined;

  for (const asset of result.assets) {
    try {
      const fileName = asset.fileName || asset.uri.split('/').pop() || 'image.jpg';
      const ext = (fileName.split('.').pop() || 'jpg').toLowerCase();
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: fileName,
        type: asset.mimeType || MIME_BY_EXT[ext] || 'image/jpeg',
      } as any);

      const res = await hostService.uploadImage(formData);
      const url = res?.data?.url || res?.url;
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        throw new Error('Upload returned no URL');
      }
      urls.push(url);
      onUploaded?.(url);
    } catch (e) {
      failed += 1;
      error = apiErrorMessage(e, 'تعذّر رفع الصورة. حاول مرة أخرى.');
    }
  }

  return { canceled: false, urls, failed, error };
}

/** Arabic summary of a batch with failures, for an alert body. */
export function uploadFailureText(result: UploadBatchResult): string {
  const total = result.urls.length + result.failed;
  const head = result.urls.length === 0
    ? (total === 1 ? 'تعذّر رفع الصورة.' : 'تعذّر رفع الصور.')
    : `تم رفع ${result.urls.length} من ${total}، وتعذّر رفع الباقي.`;
  return result.error ? `${head}\n${result.error}` : head;
}
