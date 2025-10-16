"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HeightCompareTool } from "@/components/compareheights/HeightCompareTool";
import { toast } from "sonner";
import type { ProjectData } from "@/types/project";
import { heightCompareCache } from "@/lib/cache/heightCompareCache";

interface ShareProjectClientProps {
  project: {
    uuid: string;
    title: string;
    project_data: ProjectData;
    thumbnail_url: string | null;
    view_count: number;
    created_at: string;
    updated_at: string;
  };
}

export default function ShareProjectClient({ project }: ShareProjectClientProps) {
  const router = useRouter();

  // 处理编辑按钮点击 - 缓存数据并跳转到首页
  const handleEdit = () => {
    // 将项目数据缓存到本地
    heightCompareCache.save(project.project_data);

    // 显示提示
    toast.success("Project data loaded! Redirecting to editor...");

    // 跳转到首页
    router.push("/");
  };

  return (
    <div className="flex flex-col w-screen overflow-hidden bg-gray-50">
      {/* 顶部标题区域 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {/* 项目标题 - 服务端渲染 */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {project.title}
          </h1>

          {/* 标题栏 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* 左侧说明文字 */}
            <p className="text-sm text-gray-600">
              This is a shared height comparison. Click <strong>Edit</strong> to create your own version.
            </p>

            {/* 右侧编辑按钮 */}
            <Button
              onClick={handleEdit}
              className="flex-shrink-0 bg-green-theme-600 hover:bg-green-theme-700"
            >
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* 工具组件 - 占满剩余空间 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <HeightCompareTool
          presetData={project.project_data}
          shareMode={true}
        />
      </div>
    </div>
  );
}
