import { ReactNode } from "react";
import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";
import { getLandingPage } from "@/services/page";
import DashboardLayoutClient from "./layout-client";

export default async function Layout({
  children,
  params
}: {
  children: ReactNode,
  params: Promise<{ locale: string }>;
}) {
  // Verify auth before rendering dashboard content
  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.email) {
    redirect("/auth/signin");
  }

  const { locale } = await params;
  const page = await getLandingPage(locale);

  return (
    <DashboardLayoutClient header={page.header} footer={page.footer}>
      {children}
    </DashboardLayoutClient>
  );
}