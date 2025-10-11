import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/services/user";
import {
  getUserSubscription,
  getUserUsageStats,
} from "@/lib/subscription";
import { getProjectsCountByUserUuid } from "@/models/project";
import { listCustomCharacters } from "@/models/custom-character";

// GET /api/subscription - 获取用户订阅信息和使用量统计
export async function GET(req: NextRequest) {
  try {
    // 验证用户登录
    const userInfo = await getUserInfo();
    if (!userInfo || !userInfo.uuid) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 获取用户订阅信息
    const subscription = await getUserSubscription(userInfo.uuid);

    // 获取用户当前使用量
    const [projectCount, customCharacters] = await Promise.all([
      getProjectsCountByUserUuid(userInfo.uuid),
      listCustomCharacters(userInfo.uuid),
    ]);

    // 获取使用量统计
    const usageStats = await getUserUsageStats(userInfo.uuid, {
      projectCount,
      customCharacterCount: customCharacters.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        usage: usageStats,
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to get subscription",
      },
      { status: 500 }
    );
  }
}
