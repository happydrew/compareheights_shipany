import { redirect } from "next/navigation";

// Dashboard 首页重定向到项目列表
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`${locale != 'en' ? '/' + locale : ''}/dashboard/projects`);
}
