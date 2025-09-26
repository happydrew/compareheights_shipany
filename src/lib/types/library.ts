// 角色库相关类型定义

import { CategoryNode } from './category';
import { Character } from './characters';

// 角色库主状态
export interface LibraryState {
  // Tab状态
  activeTab: 'characters' | 'library';

  // 角色库状态
  library: {
    // 布局相关
    splitRatio: number; // 分类树与角色网格的分割比例 (0-1)
    isTreeCollapsed: boolean; // 分类树是否折叠（小屏幕）

    // 数据相关
    categoryTree: CategoryNode[]; // 分类树数据
    selectedCategoryId: number | null; // 当前选中分类
    searchTerm: string; // 搜索关键词
    characters: Character[]; // 当前显示的角色列表

    // 状态相关
    isLoadingCategories: boolean; // 分类加载状态
    isLoadingCharacters: boolean; // 角色加载状态
    categoriesError: string | null; // 分类错误信息
    charactersError: string | null; // 角色错误信息
  };
}

// 角色库Action类型
export type LibraryAction =
  // Tab相关
  | { type: 'SET_ACTIVE_TAB'; payload: 'characters' | 'library' }

  // 布局相关
  | { type: 'SET_SPLIT_RATIO'; payload: number }
  | { type: 'TOGGLE_TREE_COLLAPSE' }
  | { type: 'SET_TREE_COLLAPSED'; payload: boolean }

  // 数据相关
  | { type: 'SET_CATEGORY_TREE'; payload: CategoryNode[] }
  | { type: 'SELECT_CATEGORY'; payload: number | null }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_CHARACTERS'; payload: Character[] }

  // 状态相关
  | { type: 'SET_CATEGORIES_LOADING'; payload: boolean }
  | { type: 'SET_CHARACTERS_LOADING'; payload: boolean }
  | { type: 'SET_CATEGORIES_ERROR'; payload: string | null }
  | { type: 'SET_CHARACTERS_ERROR'; payload: string | null }

  // 重置相关
  | { type: 'RESET_LIBRARY_STATE' };

// 缓存相关类型
export interface CacheEntry {
  categoryId: number;
  characters: Character[];
  timestamp: number;
  parentIds: number[]; // 分类路径上的所有父级ID
}

export interface CacheOptions {
  maxAge: number; // 最大缓存时间（毫秒）
  maxSize: number; // 最大缓存条目数
}

// 响应式断点
export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export const DEFAULT_BREAKPOINTS: ResponsiveBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280
} as const;