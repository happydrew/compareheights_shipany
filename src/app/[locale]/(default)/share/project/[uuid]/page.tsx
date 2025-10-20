import { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProjectByUuid } from "@/models/project";
import ShareProjectClient from "./ShareProjectClient";

interface ShareProjectPageProps {
  params: Promise<{ uuid: string; locale: string }>;
}

// 生成页面元数据(SEO)
export async function generateMetadata({ params }: ShareProjectPageProps): Promise<Metadata> {
  const { uuid } = await params;

  try {
    const project = await findProjectByUuid(uuid);

    if (!project) {
      return {
        title: "Project Not Found",
      };
    }

    return {
      title: `${project.title} - CompareHeights`,
      description: `View this height comparison project: ${project.title}`,
      openGraph: {
        title: project.title,
        description: `View this height comparison project on CompareHeights`,
        images: project.thumbnail_url ? [project.thumbnail_url] : [],
      },
    };
  } catch (error) {
    return {
      title: "Project Not Found",
    };
  }
}

// 服务端组件 - 获取项目数据
export default async function ShareProjectPage({ params }: ShareProjectPageProps) {
  const { uuid } = await params;

  // 在服务端获取项目数据（所有项目都可以分享）
  const project = await findProjectByUuid(uuid);

  if (!project) {
    notFound();
  }

  // 传递数据给客户端组件
  return (
    <ShareProjectClient
      project={{
        uuid: project.uuid,
        title: project.title,
        // @ts-expect-error
        project_data: project.project_data,
        thumbnail_url: project.thumbnail_url,
        view_count: project.view_count,
        created_at: project.created_at?.toISOString() || "",
        updated_at: project.updated_at?.toISOString() || "",
      }}
      params={params}
    />
  );
}
