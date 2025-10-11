import { NextRequest, NextResponse } from 'next/server';
import { deleteFromR2 } from '@/lib/r2-storage';
import { getUserUuid } from '@/services/user';
import { isAuthEnabled } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const userId = await getUserUuid();
    if (!userId && isAuthEnabled()) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const requestData = await request.json();
    const { key } = requestData;

    if (!key) {
      return NextResponse.json(
        { error: 'Missing file key' },
        { status: 400 }
      );
    }

    // Validate key format to prevent path traversal
    if (key.includes('..') || key.startsWith('/')) {
      return NextResponse.json(
        { error: 'Invalid file key format' },
        { status: 400 }
      );
    }

    console.log(`Attempting to delete file: ${key}`);

    // Delete file from R2
    const deleted = await deleteFromR2(key);

    if (deleted) {
      console.log(`File deleted successfully: ${key}`);
      return NextResponse.json({
        success: true,
        message: 'File deleted successfully',
        key: key
      });
    } else {
      console.warn(`Failed to delete file: ${key}`);
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: error.message || 'Delete failed' },
      { status: 500 }
    );
  }
}