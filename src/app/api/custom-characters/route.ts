import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { Buffer } from 'node:buffer';
import { getUserInfo } from '@/services/user';
import {
  createCustomCharacterRecord,
  customCharacterNameExists,
  listCustomCharacters,
} from '@/models/custom-character';
import { uploadBase64ToR2 } from '@/lib/r2-storage';
import {
  CUSTOM_CHARACTER_CATEGORY_ID,
  CUSTOM_CHARACTER_DEFAULT_ORDER,
} from '@/lib/constants/customCharacters';
import { getUserSubscription } from '@/lib/subscription';

const CUSTOM_CHARACTER_ASSET_FOLDER = 'custom-characters';
const R2_KEY_PATTERN = /^[A-Za-z0-9/_\.-]+$/;
const ORDER_NUM_EPOCH_MS = Date.UTC(2024, 0, 1);
const USER_FRAGMENT_LENGTH = 6;
const MAX_POSTGRES_INTEGER = 2147483647;

// 图片大小限制（字节）
const FREE_USER_MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const PAID_USER_MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const PRESIGNED_UPLOAD_THRESHOLD = 3 * 1024 * 1024; // 3MB

function splitImageDataUrl(dataUrl: string): { metadata: string; base64: string } {
  const [metadata, base64] = dataUrl.split(',', 2);
  if (!base64) {
    return { metadata: '', base64: metadata };
  }
  return { metadata, base64 };
}

function buildUserFragment(uuid: string): string {
  const cleaned = uuid.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const fragment = cleaned.slice(-USER_FRAGMENT_LENGTH);
  return fragment || 'user';
}

function generateCustomCharacterId(userUuid: string): string {
  const userFragment = buildUserFragment(userUuid);
  const uniquePart = randomUUID();
  return `custom-${userFragment}-${uniquePart}`;
}

function generateUniqueFileName(extension: string = 'png'): string {
  return `${randomUUID()}.${extension}`;
}

function calculateOrderNumber(): number {
  const secondsSinceEpoch = Math.max(0, Math.floor((Date.now() - ORDER_NUM_EPOCH_MS) / 1000));
  const candidate = CUSTOM_CHARACTER_DEFAULT_ORDER + secondsSinceEpoch;
  return Math.min(MAX_POSTGRES_INTEGER, Math.max(CUSTOM_CHARACTER_DEFAULT_ORDER, candidate));
}

export async function GET(request: NextRequest) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo?.uuid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const search = request.nextUrl.searchParams.get('search') ?? undefined;

    const characters = await listCustomCharacters(userInfo.uuid, {
      search: search?.trim() || undefined,
    });

    return NextResponse.json({
      success: true,
      data: characters,
    });
  } catch (error) {
    console.error('custom-characters GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch custom characters',
      },
      { status: 500 }
    );
  }
}

interface CreateCustomCharacterBody {
  name?: string;
  height?: number;
  imageData?: string;
  imageKey?: string;
  imageUrl?: string;
  imagePublicUrl?: string;
  image?: {
    key?: string;
    url?: string;
    publicUrl?: string;
  } | null;
}

function normalizeR2Key(rawKey: unknown): string | null {
  if (typeof rawKey !== 'string') {
    return null;
  }
  const trimmed = rawKey.trim();
  if (!trimmed || trimmed.startsWith('/') || trimmed.includes('..')) {
    return null;
  }
  if (!R2_KEY_PATTERN.test(trimmed)) {
    return null;
  }
  if (!trimmed.startsWith(`${CUSTOM_CHARACTER_ASSET_FOLDER}/`)) {
    return null;
  }
  return trimmed;
}

function normalizePublicUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') {
    return null;
  }
  try {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch (_error) {
    return null;
  }
}

interface UploadedImagePayload {
  key: string;
  url: string;
}

function resolveUploadedImage(body: CreateCustomCharacterBody): UploadedImagePayload | null {
  const candidates: Array<Record<string, unknown>> = [];
  if (body.image && typeof body.image === 'object') {
    candidates.push(body.image as Record<string, unknown>);
  }
  candidates.push({
    key: (body as Record<string, unknown>).imageKey,
    url: (body as Record<string, unknown>).imageUrl,
    publicUrl: (body as Record<string, unknown>).imagePublicUrl,
  });

  for (const candidate of candidates) {
    const candidateRecord = candidate as Record<string, unknown>;
    const key = normalizeR2Key(candidateRecord.key);
    if (!key) {
      continue;
    }
    const urlValue = normalizePublicUrl(candidateRecord.publicUrl) ?? normalizePublicUrl(candidateRecord.url);
    if (!urlValue) {
      continue;
    }
    if (!urlValue.includes(key)) {
      continue;
    }
    return { key, url: urlValue };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo?.uuid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 获取用户订阅信息
    const subscription = await getUserSubscription(userInfo.uuid);
    const isFreePlan = subscription.status === 'free';
    const maxImageSize = isFreePlan ? FREE_USER_MAX_IMAGE_SIZE : PAID_USER_MAX_IMAGE_SIZE;

    // 检查自定义角色配额
    const characters = await listCustomCharacters(userInfo.uuid);
    const currentCount = characters.length;
    const { canCreateCustomCharacter } = await import("@/lib/subscription");
    const quotaCheck = await canCreateCustomCharacter(userInfo.uuid, currentCount);

    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: quotaCheck.reason,
          error_code: "QUOTA_EXCEEDED",
          data: {
            current: currentCount,
            limit: quotaCheck.limit,
          },
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateCustomCharacterBody;
    const name = body.name?.trim();
    const height = Number(body.height);
    const imageData = body.imageData;
    const uploadedImage = resolveUploadedImage(body);

    if (!name) {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 });
    }
    if (!Number.isFinite(height) || height <= 0) {
      return NextResponse.json({ success: false, message: 'Height must be a positive number' }, { status: 400 });
    }
    if (!uploadedImage && !imageData) {
      return NextResponse.json({ success: false, message: 'Character image is required' }, { status: 400 });
    }

    // 检查图片大小（仅检查base64上传的图片）
    if (imageData) {
      const { base64 } = splitImageDataUrl(imageData);
      const buffer = Buffer.from(base64, 'base64');
      const imageSizeBytes = buffer.length;

      if (imageSizeBytes > maxImageSize) {
        const maxSizeMB = Math.floor(maxImageSize / (1024 * 1024));
        return NextResponse.json(
          {
            success: false,
            message: `Image size exceeds the ${maxSizeMB}MB limit for ${isFreePlan ? 'free' : 'paid'} users. Please compress the image or upgrade your plan.`,
            error_code: 'IMAGE_TOO_LARGE',
            data: {
              current_size_mb: (imageSizeBytes / (1024 * 1024)).toFixed(2),
              max_size_mb: maxSizeMB,
              is_free_plan: isFreePlan,
            },
          },
          { status: 400 }
        );
      }
    }

    const nameAlreadyExists = await customCharacterNameExists(userInfo.uuid, name);
    if (nameAlreadyExists) {
      return NextResponse.json(
        { success: false, message: 'A character with this name already exists.' },
        { status: 409 }
      );
    }

    const characterId = generateCustomCharacterId(userInfo.uuid);

    let mediaUrl: string;
    let thumbnailUrl: string;

    if (uploadedImage) {
      // Image already uploaded via presigned URL
      mediaUrl = uploadedImage.url;
      thumbnailUrl = uploadedImage.url;
    } else if (imageData) {
      // Fallback: direct base64 upload for backward compatibility
      const fileName = generateUniqueFileName('png');
      const uploadResult = await uploadBase64ToR2(imageData, fileName, CUSTOM_CHARACTER_ASSET_FOLDER);
      mediaUrl = uploadResult.publicUrl;
      thumbnailUrl = uploadResult.publicUrl;
    } else {
      throw new Error('Character image is required');
    }

    const character = await createCustomCharacterRecord(userInfo.uuid, {
      id: characterId,
      name,
      height,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl,
      order_num: calculateOrderNumber(),
      cat_ids: [0, CUSTOM_CHARACTER_CATEGORY_ID],
    });

    return NextResponse.json({
      success: true,
      data: character,
      message: 'Custom character created successfully',
    });
  } catch (error) {
    console.error('custom-characters POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create custom character',
      },
      { status: 500 }
    );
  }
}
