"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    RiFileList3Line,
    RiFolderLine,
    RiTeamLine,
    RiUserLine,
    RiVipCrownLine,
} from "react-icons/ri";
import { Link as I18nLink } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface NavItem {
    label: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface DashboardSidebarContentProps {
    onNavigate?: () => void;
    className?: string;
}

export function DashboardSidebarContent({
    onNavigate,
    className,
}: DashboardSidebarContentProps) {
    const pathname = usePathname();
    const t = useTranslations('dashboard.navigation');

    const projectNavigation: NavItem[] = [
        {
            label: t('my_projects'),
            url: "/dashboard/projects",
            icon: RiFolderLine,
        },
        {
            label: t('my_characters'),
            url: "/dashboard/custom-characters",
            icon: RiTeamLine,
        },
    ];

    const accountNavigation: NavItem[] = [
        {
            label: t('profile'),
            url: "/dashboard/profile",
            icon: RiUserLine,
        },
        {
            label: t('subscription'),
            url: "/dashboard/subscription",
            icon: RiVipCrownLine,
        },
        {
            label: t('billing_history'),
            url: "/dashboard/orders",
            icon: RiFileList3Line,
        },
    ];

    return (
        <div className={cn("flex h-full flex-col", className)}>
            <nav className="flex-1 overflow-y-auto p-4">
                <div className="mb-6">
                    <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {t('projects_section')}
                    </h3>
                    <div className="space-y-1">
                        {projectNavigation.map((item) => {
                            const isActive = pathname.startsWith(item.url);
                            const Icon = item.icon;

                            return (
                                <I18nLink
                                    key={item.url}
                                    href={item.url}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                                        isActive
                                            ? "bg-green-theme-50 font-medium text-green-theme-700 shadow-sm"
                                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                    onClick={() => onNavigate?.()}
                                >
                                    <Icon
                                        className={cn(
                                            "h-5 w-5",
                                            isActive ? "text-green-theme-600" : undefined
                                        )}
                                    />
                                    <span>{item.label}</span>
                                </I18nLink>
                            );
                        })}
                    </div>
                </div>
            </nav>

            <div className="flex-shrink-0 border-t border-gray-200 p-4">
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t('account_section')}
                </h3>
                <div className="space-y-1">
                    {accountNavigation.map((item) => {
                        const isActive = pathname.startsWith(item.url);
                        const Icon = item.icon;

                        return (
                            <I18nLink
                                key={item.url}
                                href={item.url}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                                    isActive
                                        ? "bg-green-theme-50 font-medium text-green-theme-700 shadow-sm"
                                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                )}
                                onClick={() => onNavigate?.()}
                            >
                                <Icon
                                    className={cn(
                                        "h-5 w-5",
                                        isActive ? "text-green-theme-600" : undefined
                                    )}
                                />
                                <span>{item.label}</span>
                            </I18nLink>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

interface DashboardSidebarProps {
    className?: string;
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
    return (
        <aside
            className={cn(
                "fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-64 flex-col border-r border-gray-200 bg-white",
                className
            )}
        >
            <DashboardSidebarContent />
        </aside>
    );
}