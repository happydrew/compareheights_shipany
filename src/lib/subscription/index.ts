import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { getPricingPage } from "@/services/page";
import { PricingItem, PlanQuota } from "@/types/blocks/pricing";

// 订阅信息类型
export interface SubscriptionInfo {
  plan_name: string;
  product_id: string;
  status: "active" | "expired" | "free";
  period_start?: number;
  period_end?: number;
  quota: PlanQuota;
}

// 免费套餐配额 (与 pricing 配置保持一致)
const FREE_PLAN_QUOTA: PlanQuota = {
  max_projects: 5,
  max_custom_characters: 10,
  max_upload_size_mb: 5,
  max_public_submissions_per_month: 5,
};

/**
 * 获取用户当前有效的订阅信息
 */
export async function getUserSubscription(
  userUuid: string
): Promise<SubscriptionInfo> {
  try {
    const now = Math.floor(Date.now() / 1000);

    // 查询用户最新的有效订阅订单
    // 条件：status = 'paid' 且 sub_period_end > 当前时间
    const activeOrders = await db()
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.user_uuid, userUuid),
          eq(orders.status, "paid"),
          gte(orders.sub_period_end, now)
        )
      )
      .orderBy(desc(orders.sub_period_end))
      .limit(1);

    if (activeOrders.length > 0) {
      const order = activeOrders[0];

      // 从pricing配置中获取套餐配额
      let plan: PricingItem | undefined;
      try {
        const page = await getPricingPage("en");
        if (page?.pricing?.items) {
          plan = page.pricing.items.find((p: any) => p.product_id === order.product_id);
        }
      } catch (error) {
        console.error("Error loading pricing config:", error);
      }

      return {
        plan_name: plan?.title || "Unknown",
        product_id: order.product_id || "",
        status: "active",
        period_start: order.sub_period_start || undefined,
        period_end: order.sub_period_end || undefined,
        quota: plan?.quota || FREE_PLAN_QUOTA,
      };
    }

    // 没有有效订阅，返回免费套餐
    return {
      plan_name: "Free",
      product_id: "free",
      status: "free",
      quota: FREE_PLAN_QUOTA,
    };
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    // 出错时返回免费套餐
    return {
      plan_name: "Free",
      product_id: "free",
      status: "free",
      quota: FREE_PLAN_QUOTA,
    };
  }
}

/**
 * 检查用户是否可以创建新项目
 */
export async function canCreateProject(
  userUuid: string,
  currentProjectCount: number
): Promise<{ allowed: boolean; reason?: string; limit: number }> {
  const subscription = await getUserSubscription(userUuid);
  const limit = subscription.quota.max_projects;

  if (currentProjectCount >= limit) {
    return {
      allowed: false,
      reason: `You have reached the maximum number of projects (${limit}) for your ${subscription.plan_name} plan. Please upgrade to create more projects.`,
      limit,
    };
  }

  return { allowed: true, limit };
}

/**
 * 检查用户是否可以创建新的自定义角色
 */
export async function canCreateCustomCharacter(
  userUuid: string,
  currentCharacterCount: number
): Promise<{ allowed: boolean; reason?: string; limit: number }> {
  const subscription = await getUserSubscription(userUuid);
  const limit = subscription.quota.max_custom_characters;

  if (currentCharacterCount >= limit) {
    return {
      allowed: false,
      reason: `You have reached the maximum number of custom characters (${limit}) for your ${subscription.plan_name} plan. Please upgrade to create more characters.`,
      limit,
    };
  }

  return { allowed: true, limit };
}

/**
 * 获取用户的使用量统计
 */
export interface UsageStats {
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
}

export async function getUserUsageStats(
  userUuid: string,
  currentStats: {
    projectCount: number;
    customCharacterCount: number;
  }
): Promise<UsageStats> {
  const subscription = await getUserSubscription(userUuid);

  return {
    projects: {
      current: currentStats.projectCount,
      limit: subscription.quota.max_projects,
      percentage: Math.round(
        (currentStats.projectCount / subscription.quota.max_projects) * 100
      ),
    },
    custom_characters: {
      current: currentStats.customCharacterCount,
      limit: subscription.quota.max_custom_characters,
      percentage: Math.round(
        (currentStats.customCharacterCount /
          subscription.quota.max_custom_characters) *
        100
      ),
    },
  };
}
