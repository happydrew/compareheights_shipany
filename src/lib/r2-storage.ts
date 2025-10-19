import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Cloudflare R2 configuration
const R2_CONFIG = {
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT, // e.g., https://your-account-id.r2.cloudflarestorage.com
  region: 'auto', // Cloudflare R2 uses 'auto' as region
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
};

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
const PUBLIC_DOMAIN = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN; // Optional: your custom domain

// Initialize S3 client for R2
const r2Client = new S3Client(R2_CONFIG);

const DEFAULT_LOCAL_CORS_ORIGINS = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
  "https://wananimation.art",
  "https://test.compareheights.org",
  "https://compareheights.org"
];

function sanitizeOrigin(origin?: string | null): string | null {
  if (!origin) return null;
  const trimmed = origin.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/$/, '');
}

function buildCorsAllowedOrigins(): string[] {
  const origins = new Set<string>();

  DEFAULT_LOCAL_CORS_ORIGINS.forEach((origin) => origins.add(origin));

  const envOrigins = sanitizeOrigin(process.env.NEXT_PUBLIC_WEB_URL);
  if (envOrigins) origins.add(envOrigins);

  const publicDomain = sanitizeOrigin(PUBLIC_DOMAIN ? `https://${PUBLIC_DOMAIN}` : null);
  if (publicDomain) origins.add(publicDomain);

  const customOrigins = process.env.CLOUDFLARE_R2_CORS_ALLOWED_ORIGINS;
  if (customOrigins) {
    customOrigins
      .split(',')
      .map((origin) => sanitizeOrigin(origin))
      .filter((origin): origin is string => Boolean(origin))
      .forEach((origin) => origins.add(origin));
  }

  const originList = Array.from(origins).filter(Boolean);

  if (!originList.length) {
    return ['*'];
  }

  return originList;
}

let corsConfigured = false;
let corsConfigPromise: Promise<void> | null = null;

async function ensureR2CorsConfigured(): Promise<void> {
  if (corsConfigured) {
    return;
  }

  if (corsConfigPromise) {
    return corsConfigPromise;
  }

  corsConfigPromise = (async () => {
    try {
      const allowedOrigins = buildCorsAllowedOrigins();
      const corsRules = [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['OPTIONS', 'GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
          AllowedOrigins: allowedOrigins,
          ExposeHeaders: ['ETag', 'x-amz-request-id', 'x-amz-version-id'],
          MaxAgeSeconds: 3600,
        },
      ];

      await r2Client.send(
        new PutBucketCorsCommand({
          Bucket: BUCKET_NAME,
          CORSConfiguration: {
            CORSRules: corsRules,
          },
        })
      );

      corsConfigured = true;
      console.info('Configured Cloudflare R2 bucket CORS policy:', allowedOrigins);
    } catch (error) {
      corsConfigured = false;
      console.error('Failed to configure Cloudflare R2 bucket CORS policy:', error);
    } finally {
      corsConfigPromise = null;
    }
  })();

  return corsConfigPromise;
}

export interface UploadResult {
  key: string;
  url?: string;
  publicUrl: string;
}

/**
 * Upload file to Cloudflare R2
 * @param fileBuffer Buffer containing file data
 * @param fileName Original file name
 * @param contentType MIME type of the file
 * @param folder Optional folder prefix (e.g., 'images', 'videos')
 * @param expiresInSeconds Optional expiration time in seconds (e.g., 3600 for 1 hour)
 * @returns Upload result with file key and URLs
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folder?: string,
  expiresInSeconds?: number
): Promise<UploadResult> {
  try {
    // Generate unique file key
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    const key = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

    // Calculate expiration time if provided
    const expiresAt = expiresInSeconds
      ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
      : undefined;

    // Configure upload parameters
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // Set cache control - shorter for temporary files
      CacheControl: expiresInSeconds
        ? `public, max-age=${expiresInSeconds}`
        : 'public, max-age=31536000', // 1 year for permanent files
      // Set metadata
      Metadata: {
        'original-name': fileName,
        'upload-time': new Date().toISOString(),
        ...(expiresAt && { 'expires-at': expiresAt, 'temporary': 'true' }),
      },
    };

    // Upload file to R2
    const command = new PutObjectCommand(uploadParams);
    await r2Client.send(command);

    // Generate URLs
    const publicUrl = `https://${PUBLIC_DOMAIN}/${BUCKET_NAME}/${key}`;

    console.log(`File uploaded to R2 successfully: ${key}${expiresAt ? ` (expires at ${expiresAt})` : ''}`);

    return {
      key,
      publicUrl,
    };
  } catch (error) {
    console.error('Failed to upload to R2:', error);
    throw new Error(`R2 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload base64 encoded file to Cloudflare R2
 * @param base64Data Base64 encoded file data (with or without data URL prefix)
 * @param fileName Original file name
 * @param folder Optional folder prefix
 * @param expiresInSeconds Optional expiration time in seconds (e.g., 3600 for 1 hour)
 * @returns Upload result with file key and URLs
 */
export async function uploadBase64ToR2(
  base64Data: string,
  fileName: string,
  folder?: string,
  expiresInSeconds?: number
): Promise<UploadResult> {
  try {
    // Parse base64 data and extract content type
    let contentType = 'application/octet-stream';
    let base64String = base64Data;

    if (base64Data.includes(',')) {
      // Extract content type from data URL
      const dataUrlMatch = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUrlMatch) {
        contentType = dataUrlMatch[1];
        base64String = dataUrlMatch[2];
      } else {
        // Fallback: remove everything before comma
        base64String = base64Data.split(',')[1];
      }
    }

    // Detect content type from file extension if not found in data URL
    if (contentType === 'application/octet-stream') {
      const extension = fileName.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        case 'mp4':
          contentType = 'video/mp4';
          break;
        case 'avi':
          contentType = 'video/x-msvideo';
          break;
        case 'mov':
          contentType = 'video/quicktime';
          break;
      }
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(base64String, 'base64');

    return await uploadToR2(fileBuffer, fileName, contentType, folder, expiresInSeconds);
  } catch (error) {
    console.error('Failed to upload base64 to R2:', error);
    throw new Error(`R2 base64 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a presigned URL for uploading files directly from frontend
 * @param fileName File name
 * @param contentType MIME type
 * @param folder Optional folder prefix
 * @param expiresIn URL expiration time in seconds (default: 1 hour)
 * @returns Presigned URL and file key
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  folder?: string,
  expiresIn: number = 3600
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  try {
    // await ensureR2CorsConfigured();

    // Generate unique file key
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    const key = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn });
    // Generate URLs
    const publicUrl = `https://${PUBLIC_DOMAIN}/${BUCKET_NAME}/${key}`;

    return {
      uploadUrl,
      key,
      publicUrl,
    };
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    throw new Error(`Presigned URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if file exists in R2
 * @param key File key
 * @returns Boolean indicating if file exists
 */
export async function fileExistsInR2(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch (error: any) {
    if (error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Generate a presigned URL for downloading/viewing files
 * @param key File key
 * @param expiresIn URL expiration time in seconds (default: 1 hour)
 * @returns Presigned download URL
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(r2Client, command, { expiresIn });
  } catch (error) {
    console.error('Failed to generate presigned download URL:', error);
    throw new Error(`Presigned download URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file info from R2
 * @param key File key
 * @returns File metadata
 */
export async function getFileInfo(key: string) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const response = await r2Client.send(command);
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    };
  } catch (error) {
    console.error('Failed to get file info from R2:', error);
    throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete file from Cloudflare R2
 * @param key File key to delete
 * @returns Boolean indicating success
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    console.log(`File deleted from R2 successfully: ${key}`);
    return true;
  } catch (error) {
    console.error('Failed to delete from R2:', error);
    // Don't throw error for delete operations, just log and return false
    return false;
  }
}

// Helper function to determine appropriate folder based on content type
export function getFolderByContentType(contentType: string): string {
  if (contentType.startsWith('image/')) {
    return 'images';
  } else if (contentType.startsWith('video/')) {
    return 'videos';
  } else {
    return 'files';
  }
}

// Export R2 client for advanced usage
export { r2Client };

