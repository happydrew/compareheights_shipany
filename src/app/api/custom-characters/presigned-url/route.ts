import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getUserInfo } from '@/services/user';
import { generatePresignedUploadUrl } from '@/lib/r2-storage';
import { getUserSubscription } from '@/lib/subscription';

const CUSTOM_CHARACTER_ASSET_FOLDER = 'custom-characters';

// 图片大小限制（字节）
const FREE_USER_MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const PAID_USER_MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

/**
 * Generate presigned URL for custom character image upload
 */
export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo?.uuid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { fileName, contentType, fileSize } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { success: false, message: 'Missing fileName or contentType' },
        { status: 400 }
      );
    }

    // Validate content type
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unsupported file type. Please upload JPG, PNG, or WebP images.',
        },
        { status: 400 }
      );
    }

    // Get user subscription to determine max file size
    const subscription = await getUserSubscription(userInfo.uuid);
    const isFreePlan = subscription.status === 'free';
    const maxImageSize = isFreePlan ? FREE_USER_MAX_IMAGE_SIZE : PAID_USER_MAX_IMAGE_SIZE;

    // Validate file size
    if (typeof fileSize === 'number' && fileSize > maxImageSize) {
      const maxSizeMB = Math.floor(maxImageSize / (1024 * 1024));
      return NextResponse.json(
        {
          success: false,
          message: `Image size exceeds the ${maxSizeMB}MB limit for ${isFreePlan ? 'free' : 'paid'} users. Please compress the image or upgrade your plan.`,
          error_code: 'IMAGE_TOO_LARGE',
          data: {
            current_size_mb: (fileSize / (1024 * 1024)).toFixed(2),
            max_size_mb: maxSizeMB,
            is_free_plan: isFreePlan,
          },
        },
        { status: 400 }
      );
    }

    // Generate unique file name with UUID
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'png';
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;

    // Generate presigned URL (valid for 1 hour)
    const result = await generatePresignedUploadUrl(
      uniqueFileName,
      contentType,
      CUSTOM_CHARACTER_ASSET_FOLDER,
      3600
    );

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        key: result.key,
        publicUrl: result.publicUrl,
      },
    });
  } catch (error) {
    console.error('Generate presigned URL error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate upload URL',
      },
      { status: 500 }
    );
  }
}
