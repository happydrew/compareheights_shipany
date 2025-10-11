import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/services/user";
import { findProjectByUuid, duplicateProject } from "@/models/project";

// POST /api/projects/[uuid]/duplicate - 复制项目
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;

    // 验证用户登录
    const userInfo = await getUserInfo();
    if (!userInfo || !userInfo.uuid) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 获取原项目
    const project = await findProjectByUuid(uuid);

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }

    // 验证项目所有权
    if (project.user_uuid !== userInfo.uuid) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // 生成新UUID
    const { v4: uuidv4 } = await import("uuid");
    const newUuid = uuidv4();

    // 复制项目
    const newProject = await duplicateProject(uuid, userInfo.uuid, newUuid);

    return NextResponse.json({
      success: true,
      data: { uuid: newProject?.uuid },
      message: "Project duplicated successfully",
    });
  } catch (error) {
    console.error("Duplicate project error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to duplicate project",
      },
      { status: 500 }
    );
  }
}
