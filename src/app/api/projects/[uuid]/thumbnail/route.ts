import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getUserInfo } from '@/services/user';
import { findProjectByUuid, updateProject } from '@/models/project';
import { uploadBase64ToR2, deleteFromR2 } from '@/lib/r2-storage';

interface RouteContext {
  params: Promise<{ uuid: string }>;
}

// 从 URL 提取 R2 key
function extractR2KeyFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    // URL format: https://domain.com/bucket-name/folder/file.ext
    // We need: folder/file.ext
    if (segments.length < 2) return null;
    return segments.slice(1).join('/');
  } catch {
    return null;
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo?.uuid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { uuid } = await context.params;
    const project = await findProjectByUuid(uuid);
    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    // Verify project ownership
    if (project.user_uuid !== userInfo.uuid) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { thumbnailData } = await request.json();
    if (!thumbnailData || typeof thumbnailData !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid thumbnail data' }, { status: 400 });
    }

    console.log('Updating project thumbnail:', uuid);

    // 上传新封面到 R2，使用 UUID 作为文件名
    const fileName = `${randomUUID()}.webp`;
    const uploadResult = await uploadBase64ToR2(
      thumbnailData,
      fileName,
      'projects'
    );

    console.log('Thumbnail uploaded to R2:', uploadResult.publicUrl);

    // 更新数据库
    await updateProject(uuid, {
      thumbnail_url: uploadResult.publicUrl
    });

    console.log('Database updated with new thumbnail URL');

    // 删除旧封面（如果存在）
    const oldThumbnailKey = extractR2KeyFromUrl(project.thumbnail_url);
    if (oldThumbnailKey) {
      try {
        await deleteFromR2(oldThumbnailKey);
        console.log(`Deleted old thumbnail: ${oldThumbnailKey}`);
      } catch (error) {
        console.warn('Failed to delete old thumbnail:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: { thumbnail_url: uploadResult.publicUrl },
      message: 'Thumbnail updated successfully'
    });
  } catch (error) {
    console.error('Update thumbnail error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update thumbnail'
      },
      { status: 500 }
    );
  }
}
