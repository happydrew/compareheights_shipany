// Subscription related types

export interface PlanQuota {
  max_projects: number;
  max_custom_characters: number;
}

export interface SubscriptionInfo {
  plan_name: string;
  product_id: string;
  status: "active" | "expired" | "free";
  period_start?: number;
  period_end?: number;
  quota: PlanQuota;
}

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

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  limit: number;
}
