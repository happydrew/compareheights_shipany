/**
 * 身高比对工具缓存管理
 * 用于在用户未登录编辑后登录时恢复数据
 */

import type { SharedData } from '@/lib/shareUtils';

const CACHE_KEY = 'heightCompareTool_draft';
const CACHE_EXPIRY_KEY = 'heightCompareTool_draft_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

export interface CachedData {
  data: SharedData;
  timestamp: number;
}

export const heightCompareCache = {
  /**
   * 保存数据到缓存
   */
  save(data: SharedData) {
    try {
      const cached: CachedData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
      console.log('Height compare data cached:', data.characters.length, 'characters');
    } catch (error) {
      console.error('Failed to cache height compare data:', error);
    }
  },

  /**
   * 从缓存加载数据
   */
  load(): SharedData | null {
    try {
      const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
      if (expiry && Date.now() > parseInt(expiry)) {
        console.log('Cache expired, clearing...');
        this.clear();
        return null;
      }

      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        return null;
      }

      const parsed: CachedData = JSON.parse(cached);
      console.log('Loaded cached data:', parsed.data.characters.length, 'characters');
      return parsed.data;
    } catch (error) {
      console.error('Failed to load cached height compare data:', error);
      return null;
    }
  },

  /**
   * 清除缓存
   */
  clear() {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  },

  /**
   * 检查是否有缓存数据
   */
  has(): boolean {
    try {
      const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
      if (expiry && Date.now() > parseInt(expiry)) {
        this.clear();
        return false;
      }
      return !!localStorage.getItem(CACHE_KEY);
    } catch {
      return false;
    }
  },
};
