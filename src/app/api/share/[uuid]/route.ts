import { NextRequest, NextResponse } from "next/server";
import {
  findPublicProjectByUuid,
  incrementViewCount,
} from "@/models/project";

// GET /api/share/[uuid] - 获取公开分享的项目 (无需登录)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;

    // 查找公开项目
    const project = await findPublicProjectByUuid(uuid);

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found or not public" },
        { status: 404 }
      );
    }

    // 增加浏览量
    await incrementViewCount(uuid);

    // 返回项目数据 (不返回敏感信息)
    return NextResponse.json({
      success: true,
      data: {
        uuid: project.uuid,
        title: project.title,
        project_data: project.project_data,
        thumbnail_url: project.thumbnail_url,
        view_count: project.view_count + 1, // 返回最新的浏览量
        created_at: project.created_at?.toISOString(),
        updated_at: project.updated_at?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get shared project error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to get shared project",
      },
      { status: 500 }
    );
  }
}
