"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface SubscriptionData {
  subscription: {
    plan_name: string;
    product_id: string;
    status: "active" | "expired" | "free";
    period_start?: number;
    period_end?: number;
    quota: {
      max_projects: number;
      max_custom_characters: number;
    };
  };
  usage: {
    projects: {
      current: number;
      limit: number;
      percentage: number;
    };
    custom_characters: {
      current: number;
      limit: number;
      percentage: number;
    };
  };
}

export default function SubscriptionPage() {
  const t = useTranslations("subscription");
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/subscription");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || "Failed to load subscription data");
      }
    } catch (err) {
      setError("Failed to load subscription data");
      console.error("Error fetching subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-theme-500";
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 px-3 sm:px-0">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-gray-200"></div>
          <div className="h-64 rounded-lg bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 px-3 sm:px-0">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-red-600">{error || "Failed to load data"}</p>
          <Button onClick={fetchSubscriptionData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { subscription, usage } = data;
  const isFreePlan = subscription.status === "free";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-3 sm:px-0">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500 sm:text-base">
          {t("description")}
        </p>
      </div>

      {/* Current Plan */}
      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t("current_plan")}</h2>
            <p className="text-2xl font-bold">
              {isFreePlan ? t("free_plan") : subscription.plan_name}
            </p>
            {subscription.status === "active" && (
              <p className="mt-1 text-sm text-gray-500">
                Valid until: {formatDate(subscription.period_end)}
              </p>
            )}
            {isFreePlan && (
              <p className="mt-1 text-sm text-gray-500 sm:text-base">$0 / month</p>
            )}
          </div>
          <Link href="/pricing" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">{t("upgrade_plan")}</Button>
          </Link>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">{t("usage_this_month")}</h3>
          <div className="space-y-4">
            {/* Projects */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{t("projects")}</span>
                <span className="text-gray-500">
                  {usage.projects.current} / {usage.projects.limit}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressBarColor(
                    usage.projects.percentage
                  )}`}
                  style={{ width: `${Math.min(usage.projects.percentage, 100)}%` }}
                />
              </div>
              {usage.projects.percentage >= 90 && (
                <p className="text-xs text-red-600">
                  {t("quota_exceeded.projects", {
                    limit: usage.projects.limit,
                    plan: isFreePlan ? t("free_plan") : subscription.plan_name,
                  })}
                </p>
              )}
            </div>

            {/* Custom Characters */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{t("custom_characters")}</span>
                <span className="text-gray-500">
                  {usage.custom_characters.current} / {usage.custom_characters.limit}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressBarColor(
                    usage.custom_characters.percentage
                  )}`}
                  style={{
                    width: `${Math.min(usage.custom_characters.percentage, 100)}%`,
                  }}
                />
              </div>
              {usage.custom_characters.percentage >= 90 && (
                <p className="text-xs text-red-600">
                  {t("quota_exceeded.custom_characters", {
                    limit: usage.custom_characters.limit,
                    plan: isFreePlan ? t("free_plan") : subscription.plan_name,
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-semibold">{t("available_plans")}</h2>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            {t("available_plans_description")}
          </p>
        </div>
        <Link href="/pricing" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            {t("view_all_plans")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
