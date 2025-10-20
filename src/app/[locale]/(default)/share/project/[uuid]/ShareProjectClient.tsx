"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
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
  params: Promise<{ uuid: string, locale: string }>;
}

export default function ShareProjectClient({ project, params }: ShareProjectClientProps) {
  const router = useRouter();
  const t = useTranslations("share_project");
  const [locale, setLocale] = useState<string>("en");

  // Resolve params to get locale
  useEffect(() => {
    params.then((p) => {
      setLocale(p.locale);
    });
  }, [params]);

  // 处理编辑按钮点击 - 缓存数据并跳转到首页
  const handleEdit = () => {
    // 将项目数据缓存到本地
    heightCompareCache.save(project.project_data);

    // 显示提示
    toast.success(t("toast.project_loaded"));

    // 跳转到首页（考虑多语言路径）
    router.push(`${locale !== 'en' ? `/${locale}` : ''}/`);
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
              {t("description")}
            </p>

            {/* 右侧编辑按钮 */}
            <Button
              onClick={handleEdit}
              className="flex-shrink-0 bg-green-theme-600 hover:bg-green-theme-700"
            >
              {t("edit_button")}
            </Button>
          </div>
        </div>
      </div>

      {/* 工具组件 - 占满剩余空间 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <HeightCompareTool
          presetData={project.project_data}
          shareMode={true}
          projectUuid={project.uuid}
          locale={locale}
        />
      </div>
    </div>
  );
}
