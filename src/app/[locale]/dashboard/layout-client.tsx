'use client';

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Footer from "@/components/blocks/footer";
import Header from "@/components/blocks/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardMobileNav } from "@/components/dashboard/mobile-nav";

export default function DashboardLayoutClient({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header?: any;
  footer?: any;
}) {
  const pathname = usePathname();

  // Check if current route is project edit page
  const isProjectEditPage = pathname?.includes('/projects/') && pathname?.includes('/edit');

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {header && <Header header={header} />}
      <div className="relative flex min-h-[calc(100vh-4rem)]">
        {/* Hide sidebar on project edit page */}
        {!isProjectEditPage && <DashboardSidebar className="hidden lg:flex" />}
        <div className={`flex min-h-[calc(100vh-4rem)] flex-1 flex-col ${!isProjectEditPage ? 'lg:pl-64' : ''}`}>
          {!isProjectEditPage && <DashboardMobileNav />}
          <main className={`flex-1 ${!isProjectEditPage ? 'overflow-y-auto px-4 py-6 sm:px-6 lg:px-8' : ''}`}>
            {children}
          </main>
          {footer && !isProjectEditPage && <Footer footer={footer} />}
        </div>
      </div>
    </div>
  );
}
