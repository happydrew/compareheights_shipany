import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/services/user";
import {
  getProjectsByUserUuid,
  getProjectsCountByUserUuid,
} from "@/models/project";

// GET /api/projects - 获取用户项目列表
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

    // 获取查询参数
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sort = (searchParams.get("sort") as 'recent' | 'name' | 'views') || 'recent';
    const search = searchParams.get("search") || undefined;

    // 获取项目列表和总数
    const [projectsData, total] = await Promise.all([
      getProjectsByUserUuid(userInfo.uuid, { page, limit, sort, search }),
      getProjectsCountByUserUuid(userInfo.uuid, search)
    ]);

    // 格式化返回数据
    const projects = projectsData?.map(project => {
      const projectData = project.project_data as any;
      return {
        uuid: project.uuid,
        title: project.title,
        thumbnail_url: project.thumbnail_url,
        is_public: project.is_public,
        view_count: project.view_count,
        created_at: project.created_at?.toISOString(),
        updated_at: project.updated_at?.toISOString(),
        character_count: projectData?.characters?.length || 0,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: {
        projects,
        total,
      },
    });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to get projects",
      },
      { status: 500 }
    );
  }
}

// POST /api/projects - 创建新项目
export async function POST(req: NextRequest) {
  try {
    // 验证用户登录
    const userInfo = await getUserInfo();
    if (!userInfo || !userInfo.uuid) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 检查用户项目配额
    const currentCount = await getProjectsCountByUserUuid(userInfo.uuid);
    const { canCreateProject } = await import("@/lib/subscription");
    const quotaCheck = await canCreateProject(userInfo.uuid, currentCount);

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

    // 解析请求体
    const body = await req.json();
    const { title, project_data, thumbnail_url } = body;

    if (!title || !project_data) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: title, project_data" },
        { status: 400 }
      );
    }

    // 生成UUID
    const { v4: uuidv4 } = await import("uuid");
    const uuid = uuidv4();

    // 创建项目
    const { insertProject } = await import("@/models/project");
    await insertProject({
      uuid,
      user_uuid: userInfo.uuid,
      title,
      project_data,
      thumbnail_url,
      is_public: false,
      view_count: 0,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: { uuid },
      message: "Project created successfully",
    });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create project",
      },
      { status: 500 }
    );
  }
}
