import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { Buffer } from 'node:buffer';
import { getUserInfo } from '@/services/user';
import {
  deleteCustomCharacterRecord,
  findCustomCharacterById,
  updateCustomCharacterRecord,
} from '@/models/custom-character';
import { uploadBase64ToR2, deleteFromR2 } from '@/lib/r2-storage';
import { CUSTOM_CHARACTER_CATEGORY_ID } from '@/lib/constants/customCharacters';
import { getUserSubscription } from '@/lib/subscription';

const CUSTOM_CHARACTER_ASSET_FOLDER = 'custom-characters';
const R2_KEY_PATTERN = /^[A-Za-z0-9/_\.-]+$/;

// 图片大小限制（字节）
const FREE_USER_MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const PAID_USER_MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

function splitImageDataUrl(dataUrl: string): { metadata: string; base64: string } {
  const [metadata, base64] = dataUrl.split(',', 2);
  if (!base64) {
    return { metadata: '', base64: metadata };
  }
  return { metadata, base64 };
}

interface RouteContext {
  params: { id: string };
}

function extractR2KeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      return null;
    }
    return segments.slice(1).join('/');
  } catch (error) {
    console.warn('Failed to parse R2 key from URL:', error);
    return null;
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo?.uuid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const character = await findCustomCharacterById(userInfo.uuid, context.params.id);
    if (!character) {
      return NextResponse.json({ success: false, message: 'Character not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: character });
  } catch (error) {
    console.error('custom-characters/:id GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to load custom character',
      },
      { status: 500 }
    );
  }
}

interface UpdateCustomCharacterBody {
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

function resolveUploadedImage(body: UpdateCustomCharacterBody): UploadedImagePayload | null {
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo?.uuid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const existing = await findCustomCharacterById(userInfo.uuid, context.params.id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Character not found' }, { status: 404 });
    }

    const body = (await request.json()) as UpdateCustomCharacterBody;
    const updates: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json({ success: false, message: 'Name cannot be empty' }, { status: 400 });
      }
      updates.name = trimmed;
    }

    if (body.height !== undefined) {
      const height = Number(body.height);
      if (!Number.isFinite(height) || height <= 0) {
        return NextResponse.json({ success: false, message: 'Height must be a positive number' }, { status: 400 });
      }
      updates.height = height;
    }

    // 获取用户订阅信息用于图片大小验证
    const subscription = await getUserSubscription(userInfo.uuid);
    const isFreePlan = subscription.status === 'free';
    const maxImageSize = isFreePlan ? FREE_USER_MAX_IMAGE_SIZE : PAID_USER_MAX_IMAGE_SIZE;

    const uploadedImage = resolveUploadedImage(body);

    if (uploadedImage) {
      // 用户通过预签名上传了新图片
      updates.media_url = uploadedImage.url;
      updates.thumbnail_url = uploadedImage.url;

      const previousKey = extractR2KeyFromUrl(existing.media_url);
      if (previousKey && previousKey !== uploadedImage.key) {
        try {
          await deleteFromR2(previousKey);
        } catch (error) {
          console.warn('Failed to delete previous custom character asset:', error);
        }
      }
    } else if (body.imageData) {
      // 用户通过base64上传了新图片（打开裁剪弹窗并保存）
      // 检查图片大小
      const { base64 } = splitImageDataUrl(body.imageData);
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

      const previousKey = extractR2KeyFromUrl(existing.media_url);
      if (previousKey) {
        try {
          await deleteFromR2(previousKey);
        } catch (error) {
          console.warn('Failed to delete previous custom character asset:', error);
        }
      }

      // Use UUID for filename instead of character ID + timestamp
      const fileName = `${randomUUID()}.png`;
      const uploadResult = await uploadBase64ToR2(
        body.imageData,
        fileName,
        CUSTOM_CHARACTER_ASSET_FOLDER
      );

      updates.media_url = uploadResult.publicUrl;
      updates.thumbnail_url = uploadResult.publicUrl;
    }

    updates.cat_ids = existing.cat_ids?.length ? existing.cat_ids : [0, CUSTOM_CHARACTER_CATEGORY_ID];

    const updated = await updateCustomCharacterRecord(userInfo.uuid, context.params.id, updates);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Custom character updated successfully',
    });
  } catch (error) {
    console.error('custom-characters/:id PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update custom character',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo?.uuid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const existing = await findCustomCharacterById(userInfo.uuid, context.params.id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Character not found' }, { status: 404 });
    }

    await deleteCustomCharacterRecord(userInfo.uuid, context.params.id);

    const mediaKey = extractR2KeyFromUrl(existing.media_url);
    if (mediaKey) {
      void deleteFromR2(mediaKey).catch((error) =>
        console.warn('Failed to delete custom character asset during removal:', error)
      );
    }

    return NextResponse.json({ success: true, message: 'Custom character deleted successfully' });
  } catch (error) {
    console.error('custom-characters/:id DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete custom character',
      },
      { status: 500 }
    );
  }
}
