import { NextResponse } from 'next/server';
import { getUserInfo } from '@/services/user';
import { getUserSubscription } from '@/lib/subscription';

/**
 * Get user subscription information
 */
export async function GET() {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo?.uuid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const subscription = await getUserSubscription(userInfo.uuid);

    return NextResponse.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Get subscription info error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get subscription info',
      },
      { status: 500 }
    );
  }
}
