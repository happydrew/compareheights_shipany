// 数据库相关类型定义

// 数据库中的角色记录结构
export interface DatabaseCharacter {
  id: string;
  name: string;
  height: number;
  cat_ids: number[]; // 新增：分类路径ID数组
  media_type: 'svg' | 'image';
  media_url: string;
  thumbnail_url: string;
  color: string | null;
  color_customizable: boolean;
  color_property: string | null;
  order_num: number; // 修正字段名
}

// 数据库中的分类记录结构
export interface DatabaseCategory {
  id: number;
  name: string;
  pid: number | null;
  order_num: number;
  created_at: string;
  updated_at: string;
}

// API查询参数
export interface CharacterQueryParams {
  category_id?: number; // 新增：分类ID查询
  search?: string;
  limit?: number;
  offset?: number;
}

// 分类查询参数
export interface CategoryQueryParams {
  limit?: number;
  offset?: number;
}

// API响应结构
export interface CharacterQueryResponse {
  success: boolean;
  data?: any[];
  total?: number;
  message?: string;
  error?: string;
}

// 分类查询响应结构
export interface CategoryQueryResponse {
  success: boolean;
  data?: DatabaseCategory[];
  total?: number;
  message?: string;
  error?: string;
}