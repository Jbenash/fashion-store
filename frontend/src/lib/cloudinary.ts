import { api } from './api';

export interface UploadedImage {
  url: string;
  publicId: string;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/** Client-side guard. Cloudinary account limits are the real enforcement. */
export function validateImage(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return 'Use a JPEG, PNG, WebP or AVIF image.';
  if (file.size > MAX_UPLOAD_BYTES) return 'Image must be 5 MB or smaller.';
  return null;
}

interface CloudinaryResponse {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
}

/**
 * Asks our API for a short-lived signature, then sends the file straight to
 * Cloudinary. The file never touches our server and the API secret stays there.
 * Uses XHR rather than fetch because only XHR reports upload progress.
 */
export async function uploadImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadedImage> {
  const sig = await api.uploadSignature();

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('folder', sig.folder);
  form.append('signature', sig.signature);

  const body = await new Promise<CloudinaryResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', sig.uploadUrl);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Could not reach Cloudinary.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText) as CloudinaryResponse);
      } catch {
        reject(new Error(`Cloudinary returned an unreadable response (${xhr.status}).`));
      }
    };

    xhr.send(form);
  });

  if (!body.secure_url || !body.public_id) {
    throw new Error(body.error?.message ?? 'Cloudinary rejected the upload.');
  }
  return { url: body.secure_url, publicId: body.public_id };
}
