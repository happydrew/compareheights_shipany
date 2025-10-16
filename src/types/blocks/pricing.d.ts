import { Button } from "@/types/blocks/base/button";

export interface PricingGroup {
  name?: string;
  title?: string;
  description?: string;
  label?: string;
  is_featured?: boolean;
}

export interface PlanQuota {
  max_projects: number;
  max_custom_characters: number;
  max_upload_size_mb?: number;
  max_public_submissions_per_month?: number;
}

export interface PricingItem {
  title?: string;
  description?: string;
  label?: string;
  price?: string;
  original_price?: string;
  currency?: string;
  unit?: string;
  features_title?: string;
  features?: string[];
  button?: Button;
  tip?: string;
  is_featured?: boolean;
  interval: "month" | "year" | "one-time";
  product_id: string;
  product_name?: string;
  amount: number;
  cn_amount?: number;
  credits?: number;
  valid_months?: number;
  group?: string;
  quota?: PlanQuota;
}

export interface Pricing {
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  items?: PricingItem[];
  groups?: PricingGroup[];
}
