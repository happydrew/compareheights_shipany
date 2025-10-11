export type SubscriptionMetric = "projects" | "customCharacters" | "publicSubmissions";

export interface SubscriptionAllowances {
  projects: number | null;
  customCharacters: number | null;
  publicSubmissions: number | null;
  autoplay: boolean;
}

export interface SubscriptionPlan {
  id: string;
  title: string;
  description: string;
  priceMonthlyUSD: number;
  priceYearlyUSD?: number;
  allowances: SubscriptionAllowances;
  productIds: string[];
  isFree?: boolean;
}

const basePlans: SubscriptionPlan[] = [
  {
    id: "free",
    title: "Free",
    description: "Get started with core height comparison tools.",
    priceMonthlyUSD: 0,
    allowances: {
      projects: 2,
      customCharacters: 10,
      publicSubmissions: 0,
      autoplay: false,
    },
    productIds: ["plan_free"],
    isFree: true,
  },
  {
    id: "advanced",
    title: "Advanced",
    description: "Unlock more projects and custom characters for enthusiasts.",
    priceMonthlyUSD: 5,
    priceYearlyUSD: 54,
    allowances: {
      projects: 10,
      customCharacters: 50,
      publicSubmissions: 5,
      autoplay: false,
    },
    productIds: [
      "plan_advanced_monthly",
      "plan_advanced_yearly",
      "advanced-monthly",
      "advanced-yearly",
    ],
  },
  {
    id: "professional",
    title: "Professional",
    description: "Full access for power users and teams.",
    priceMonthlyUSD: 10,
    priceYearlyUSD: 108,
    allowances: {
      projects: 50,
      customCharacters: 250,
      publicSubmissions: 10,
      autoplay: true,
    },
    productIds: [
      "plan_professional_monthly",
      "plan_professional_yearly",
      "professional-monthly",
      "professional-yearly",
    ],
  },
];

export const SUBSCRIPTION_PLANS: ReadonlyArray<SubscriptionPlan> = basePlans;

export const PRODUCT_TO_PLAN_MAP: Readonly<Record<string, SubscriptionPlan>> =
  basePlans.reduce<Record<string, SubscriptionPlan>>((acc, plan) => {
    for (const productId of plan.productIds) {
      acc[productId] = plan;
    }
    return acc;
  }, {});

export function getPlanByProductId(productId?: string | null): SubscriptionPlan {
  if (!productId) {
    return basePlans[0];
  }
  return PRODUCT_TO_PLAN_MAP[productId] ?? basePlans[0];
}

export function getPlanById(planId: string): SubscriptionPlan {
  return basePlans.find((plan) => plan.id === planId) ?? basePlans[0];
}

export function getDefaultPlan(): SubscriptionPlan {
  return basePlans[0];
}
