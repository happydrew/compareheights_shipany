import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/services/user";
import {
  findProjectByUuid,
  updateProject,
  deleteProject,
  duplicateProject,
} from "@/models/project";

// GET /api/projects/[uuid] - 获取单个项目
export async function GET(
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

    // 获取项目
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

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to get project",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[uuid] - 更新项目
export async function PATCH(
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

    // 获取项目
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

    // 解析请求体
    const body = await req.json();
    const { title, project_data, thumbnail_url, is_public } = body;

    // 更新项目
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (project_data !== undefined) updateData.project_data = project_data;
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
    if (is_public !== undefined) updateData.is_public = is_public;

    const updatedProject = await updateProject(uuid, updateData);

    return NextResponse.json({
      success: true,
      data: updatedProject,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update project",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[uuid] - 删除项目
export async function DELETE(
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

    // 获取项目
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

    // 软删除项目
    await deleteProject(uuid);

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete project",
      },
      { status: 500 }
    );
  }
}
