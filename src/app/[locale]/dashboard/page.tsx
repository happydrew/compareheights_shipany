import { redirect } from "next/navigation";

// Dashboard 首页重定向到项目列表
export default function DashboardPage() {
  redirect("/dashboard/projects");
}
