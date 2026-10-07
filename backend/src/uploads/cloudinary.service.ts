import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

/** What the browser needs to upload one image directly to Cloudinary. */
export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private config: ConfigService) {}

  /**
   * Cloudinary signs a request by SHA-1 hashing every parameter it will
   * receive (except file, api_key, cloud_name and resource_type), sorted by
   * key as `a=1&b=2`, with the API secret appended. Because *every* parameter
   * must be covered, a client cannot smuggle in an extra one — the hash would
   * no longer match and Cloudinary rejects the upload.
   */
  private sign(params: Record<string, string | number>): string {
    const secret = this.config.getOrThrow<string>('CLOUDINARY_API_SECRET');
    const canonical = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return createHash('sha1').update(canonical + secret).digest('hex');
  }

  /** False when the credentials are absent, so callers can fail politely. */
  isConfigured(): boolean {
    return Boolean(
      this.config.get('CLOUDINARY_CLOUD_NAME') &&
        this.config.get('CLOUDINARY_API_KEY') &&
        this.config.get('CLOUDINARY_API_SECRET'),
    );
  }

  private get cloudName(): string {
    return this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME');
  }

  /** Short-lived credentials for one browser upload. The secret stays here. */
  createUploadSignature(): UploadSignature {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Image uploads are not configured on the server.',
      );
    }

    const folder = this.config.get<string>('CLOUDINARY_FOLDER') ?? 'fashion-store/products';
    const timestamp = Math.floor(Date.now() / 1000);

    return {
      cloudName: this.cloudName,
      apiKey: this.config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      timestamp,
      folder,
      signature: this.sign({ folder, timestamp }),
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
    };
  }

  /**
   * Removes an asset that is no longer referenced. Best-effort: a failure here
   * leaves an orphaned file in Cloudinary but must never fail the product save
   * that triggered it, so it is logged rather than thrown.
   */
  async destroy(publicId: string): Promise<void> {
    if (!publicId || !this.isConfigured()) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const body = new URLSearchParams({
      public_id: publicId,
      api_key: this.config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      timestamp: String(timestamp),
      signature: this.sign({ public_id: publicId, timestamp }),
    });

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
        { method: 'POST', body },
      );
      const result = (await res.json()) as { result?: string };
      // "not found" is fine — the asset is gone either way.
      if (!res.ok || (result.result !== 'ok' && result.result !== 'not found')) {
        this.logger.warn(
          `Could not delete Cloudinary asset ${publicId}: ${result.result ?? res.status}`,
        );
      }
    } catch (e) {
      this.logger.warn(`Could not delete Cloudinary asset ${publicId}: ${e}`);
    }
  }
}
