import { NextRequest, NextResponse } from "next/server";
import { getPublicProjects } from "@/models/project";

// GET /api/projects/public - 获取公开项目列表 (用于画廊)
export async function GET(req: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sort = (searchParams.get("sort") as 'recent' | 'popular') || 'popular';

    // 获取公开项目列表
    const projectsData = await getPublicProjects({ page, limit, sort });

    // 格式化返回数据
    const projects = projectsData?.map(project => {
      const projectData = project.project_data as any;
      return {
        uuid: project.uuid,
        title: project.title,
        thumbnail_url: project.thumbnail_url,
        view_count: project.view_count,
        created_at: project.created_at?.toISOString(),
        updated_at: project.updated_at?.toISOString(),
        character_count: projectData?.characters?.length || 0,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error("Get public projects error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to get public projects",
      },
      { status: 500 }
    );
  }
}
