// 分类相关类型定义

export interface Category {
  id: number;
  name: string;
  pid: number | null;
  order_num: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

// 分类路径工具类型
export type CategoryPath = number[];

// 分类查询参数
export interface CategoryQueryOptions {
  includeChildren?: boolean;
  maxDepth?: number;
}