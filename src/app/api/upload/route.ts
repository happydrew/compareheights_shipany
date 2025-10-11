import { NextRequest, NextResponse } from 'next/server';
import { uploadBase64ToR2, generatePresignedUploadUrl, getFolderByContentType, uploadToR2 } from '@/lib/r2-storage';
import { getUserUuid } from '@/services/user';
import { isAuthEnabled } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const FILE_EXPIRATION_SECONDS = 3600; // 1 hour - files uploaded here are temporary
const ALLOWED_UPLOAD_TYPES = new Set<string>([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/avi',
  'video/quicktime',
  'video/x-msvideo',
]);

const FOLDER_NAME_PATTERN = /^[a-zA-Z0-9\/_-]+$/;

function sanitizeFolder(folder?: string | null): string | null {
  if (!folder) {
    return null;
  }
  const trimmed = folder.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace(/^\/+|\/+$/g, '');
  if (!FOLDER_NAME_PATTERN.test(normalized)) {
    console.warn('upload: rejected folder parameter', folder);
    return null;
  }
  return normalized;
}

function parseTemporaryFlag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (!lower) {
      return undefined;
    }
    if (['true', '1', 'yes', 'y'].includes(lower)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(lower)) {
      return false;
    }
  }
  return undefined;
}

function validateUploadRequest(contentType: string, fileSize?: number) {
  if (!ALLOWED_UPLOAD_TYPES.has(contentType)) {
    return 'Unsupported file type';
  }

  if (typeof fileSize === 'number' && !Number.isNaN(fileSize)) {
    const maxSize = contentType.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (fileSize > maxSize) {
      const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
      return `File too large. Maximum size is ${maxSizeMB}MB`;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const userId = await getUserUuid();
    if (!userId && isAuthEnabled()) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const contentTypeHeader = request.headers.get('content-type') || '';

    if (contentTypeHeader.includes('multipart/form-data')) {
      return await handleProxyUpload(request);
    }

    const requestData = await request.json();
    const { method, ...data } = requestData;

    switch (method) {
      case 'direct-upload':
        return await handleDirectUpload(data);
      case 'presigned-url':
        return await handlePresignedUrl(data);
      default:
        return NextResponse.json(
          { error: 'Invalid upload method. Use "direct-upload" or "presigned-url"' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

async function handleProxyUpload(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || !(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: 'Missing file data' },
        { status: 400 }
      );
    }

    const fileName = (formData.get('fileName') as string) || fileEntry.name;
    const contentType = (formData.get('contentType') as string) || fileEntry.type || 'application/octet-stream';
    const fileSize = Number(formData.get('fileSize') ?? fileEntry.size ?? 0);

    const validationError = validateUploadRequest(contentType, fileSize);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const arrayBuffer = await fileEntry.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const providedFolder = sanitizeFolder(formData.get('folder') as string | null);
    const temporaryFlag = parseTemporaryFlag(formData.get('temporary'));
    const folder = providedFolder ?? getFolderByContentType(contentType);
    const isTemporary = temporaryFlag ?? true;
    const expiresIn = isTemporary ? FILE_EXPIRATION_SECONDS : undefined;

    const result = await uploadToR2(fileBuffer, fileName, contentType, folder, expiresIn);

    return NextResponse.json({
      success: true,
      temporary: isTemporary,
      ...result,
    });
  } catch (error: any) {
    console.error('Proxy upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Proxy upload failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle direct upload of base64 encoded files
 */
async function handleDirectUpload(data: any) {
  const { file, fileName, contentType } = data;

  if (!file || !fileName) {
    return NextResponse.json(
      { error: 'Missing file data or fileName' },
      { status: 400 }
    );
  }

  try {
    const detectedContentType = contentType || 'application/octet-stream';
    if (detectedContentType !== 'application/octet-stream') {
      const validationError = validateUploadRequest(detectedContentType, data?.fileSize);
      if (validationError) {
        return NextResponse.json(
          { error: validationError },
          { status: 400 }
        );
      }
    }

    const providedFolder = sanitizeFolder(data?.folder);
    const temporaryFlag = parseTemporaryFlag(data?.temporary);
    const folder = providedFolder ?? getFolderByContentType(detectedContentType);
    const isTemporary = temporaryFlag ?? true;
    const expiresIn = isTemporary ? FILE_EXPIRATION_SECONDS : undefined;

    const result = await uploadBase64ToR2(file, fileName, folder, expiresIn);

    return NextResponse.json({
      success: true,
      temporary: isTemporary,
      ...result,
    });
  } catch (error: any) {
    console.error('Direct upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Direct upload failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle presigned URL generation for frontend uploads
 */
async function handlePresignedUrl(data: any) {
  const { fileName, contentType, fileSize } = data;

  if (!fileName || !contentType) {
    return NextResponse.json(
      { error: 'Missing fileName or contentType' },
      { status: 400 }
    );
  }

  const validationError = validateUploadRequest(contentType, fileSize);
  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400 }
    );
  }

  try {
    const providedFolder = sanitizeFolder(data?.folder);
    const folder = providedFolder ?? getFolderByContentType(contentType);
    const presignedExpiresIn = typeof data?.expiresIn === 'number' && Number.isFinite(data.expiresIn)
      ? Math.min(Math.max(Math.floor(data.expiresIn), 60), 86400)
      : 3600;
    const result = await generatePresignedUploadUrl(fileName, contentType, folder, presignedExpiresIn);

    return NextResponse.json({
      success: true,
      expiresIn: presignedExpiresIn,
      ...result,
    });
  } catch (error: any) {
    console.error('Presigned URL generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Presigned URL generation failed' },
      { status: 500 }
    );
  }
}

