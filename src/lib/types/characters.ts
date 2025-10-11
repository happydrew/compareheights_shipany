export {
  type Character, type QueryCharactersParams, type QueryCharactersResponse,
  queryCharacters, queryCharactersByIds, PRESET_CAT1_CHARACTERS
};

// 角色接口 - 统一的角色类型定义，完全匹配数据库表字段结构
interface Character {
  id: string;
  name: string;
  height: number; // 以m为单位
  cat_ids: number[]; // 分类路径ID数组（支持多级分类）

  // 媒体相关字段（统一使用数据库字段名）
  media_type: 'svg' | 'image';
  media_url: string;
  thumbnail_url: string;
  media_hash?: string | null;
  svg_content?: string | null;

  // 外观相关字段（统一使用数据库字段名）
  color: string | null;
  color_customizable: boolean;
  // 用于改变颜色的svg属性
  color_property : string | null;

  // 排序字段
  order_num?: number;
}

// API接口参数类型
interface QueryCharactersParams {
  // 新版本参数（推荐使用）
  category_id?: number; // 按分类ID查询
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'height' | 'order';
  sortOrder?: 'asc' | 'desc';

  // 注：已移除旧的type参数，现在使用category_id
}

// 角色查询结果类型
export interface CharacterQueryResult {
  characters: Character[];
  total: number;
  hasMore: boolean;
}

// API响应类型
interface QueryCharactersResponse {
  success: boolean;
  data?: Character[];
  total?: number;
  message?: string;
}

// API基础URL - 使用相对路径调用本地API
const QUERY_CHARACTERS_URL = '/api/queryCharacters';

// 内存缓存 - 按角色类型缓存数据
interface CacheEntry {
  data: Character[];
  timestamp: number;
  total: number;
}

// 缓存存储 - 页面级别临时缓存
const charactersCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时缓存有效期

// 检查缓存是否有效
function isCacheValid(cacheEntry: CacheEntry): boolean {
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
}

// 获取缓存数据
function getFromCache(key: string): CacheEntry | null {
  const cached = charactersCache.get(key);

  if (cached && isCacheValid(cached)) {
    return cached;
  }

  // 如果缓存过了有效期
  if (cached) {
    charactersCache.delete(key);
  }

  return null;
}

// 设置缓存数据
function setToCache(key: string, data: Character[], total: number): void {
  const cacheEntry: CacheEntry = {
    data,
    total,
    timestamp: Date.now()
  };

  charactersCache.set(key, cacheEntry);
  //console.log(`💾 已缓存 ${data.length} 个角色，缓存键：${key}`);
}

// 实际API调用函数（当API可用时使用）
const queryCharactersApi = async (params: QueryCharactersParams = {}): Promise<QueryCharactersResponse> => {
  const queryParams = new URLSearchParams();

  if (params.category_id) {
    queryParams.append('category_id', params.category_id.toString());
  }
  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params.offset) {
    queryParams.append('offset', params.offset.toString());
  }
  if (params.search) {
    queryParams.append('search', params.search);
  }
  if (params.sortBy) {
    queryParams.append('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    queryParams.append('sortOrder', params.sortOrder);
  }

  const url = `${QUERY_CHARACTERS_URL}?${queryParams.toString()}`;

  console.log('query characters url is: ' + url)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: QueryCharactersResponse = await response.json();
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw new Error('从API获取角色失败');
  }
};

// 主要导出函数 - 带缓存的API调用
const queryCharacters = async (params: QueryCharactersParams = {}): Promise<QueryCharactersResponse> => {
  const { category_id, search = '', limit = 50, offset = 0 } = params;

  // 只对基础查询（无分页、无搜索）进行缓存
  const shouldCache = offset === 0 && limit >= 50 && !search;
  const cacheKey = category_id ? `category_${category_id}` : 'all';

  if (shouldCache) {
    // 尝试从缓存获取数据（无搜索词）
    const cached = getFromCache(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached.data.slice(0, limit), // 应用limit限制
        total: cached.total,
        message: '数据从缓存中检索'
      };
    }
  }

  try {
    // 调用真实API
    const response = await queryCharactersApi(params);

    // 如果成功且应该缓存，则缓存数据（无搜索词）
    if (response.success && response.data && shouldCache) {
      setToCache(cacheKey, response.data, response.total || 0);
    }

    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// 批量查询角色的API调用函数
const queryCharactersByIdsApi = async (ids: string[]): Promise<QueryCharactersResponse> => {
  const url = '/api/queryCharactersByIds';

  console.log('query characters by ids:', ids);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: QueryCharactersResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Batch API call failed:', error);
    throw new Error('从API批量获取角色失败');
  }
};

// 批量查询角色函数 - 主要导出函数
const queryCharactersByIds = async (ids: string[]): Promise<QueryCharactersResponse> => {
  if (!ids || ids.length === 0) {
    return {
      success: true,
      data: [],
      total: 0,
      message: '无角色ID提供'
    };
  }

  try {
    // 调用真实API
    const response = await queryCharactersByIdsApi(ids);
    return response;
  } catch (error) {
    console.error('Batch query failed:', error);
    throw error;
  }
};

const PRESET_CAT1_CHARACTERS: Character[] = [
  {
    "id": "generic-generic_human01",
    "name": "Generic Human01",
    "height": 1.7,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_human01-1.70.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_human01-1.70.svg",
    "color": "#3B82F6",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man01",
    "name": "Generic Man01",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man01-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man01-1.75.svg",
    "color": "#EF4444",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man02",
    "name": "Generic Man02",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man02-1.75.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man02-1.75.png",
    "color": "#10B981",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man03",
    "name": "Generic Man03",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man03-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man03-1.75.svg",
    "color": "#F59E0B",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man04",
    "name": "Generic Man04",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man04-1.75.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man04-1.75.png",
    "color": "#8B5CF6",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man05",
    "name": "Generic Man05",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man05-1.75.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man05-1.75.png",
    "color": "#EC4899",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man06",
    "name": "Generic Man06",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man06-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man06-1.75.svg",
    "color": "#000000",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man07",
    "name": "Generic Man07",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man07-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man07-1.75.svg",
    "color": "#3B82F6",
    "color_customizable": false,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man08",
    "name": "Generic Man08",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man08-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man08-1.75.svg",
    "color": "#EF4444",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man09",
    "name": "Generic Man09",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man09-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man09-1.75.svg",
    "color": "#10B981",
    "color_customizable": false,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_man1",
    "name": "Generic Man1",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man1-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man1-1.75.svg",
    "color": "#3B82F6",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man10",
    "name": "Generic Man10",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man10-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man10-1.75.svg",
    "color": "#F59E0B",
    "color_customizable": false,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man11",
    "name": "Generic Man11",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man11-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man11-1.75.svg",
    "color": "#8B5CF6",
    "color_customizable": false,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man12",
    "name": "Generic Man12",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man12-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man12-1.75.svg",
    "color": "#EC4899",
    "color_customizable": false,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_man13",
    "name": "Generic Man13",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man13-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man13-1.75.svg",
    "color": "#000000",
    "color_customizable": false,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_man2",
    "name": "Generic Man2",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man2-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man2-1.75.svg",
    "color": "#EF4444",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_man3",
    "name": "Generic Man3",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man3-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man3-1.75.svg",
    "color": "#10B981",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_man4",
    "name": "Generic Man4",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man4-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man4-1.75.svg",
    "color": "#F59E0B",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_man5",
    "name": "Generic Man5",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man5-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man5-1.75.svg",
    "color": "#8B5CF6",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_man6",
    "name": "Generic Man6",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man6-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man6-1.75.svg",
    "color": "#EC4899",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_man7",
    "name": "Generic Man7",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man7-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man7-1.75.svg",
    "color": "#000000",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_man8",
    "name": "Generic Man8",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man8-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_man8-1.75.svg",
    "color": "#3B82F6",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_woman01",
    "name": "Generic Woman01",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman01-1.62.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman01-1.62.png",
    "color": "#3B82F6",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_woman02",
    "name": "Generic Woman02",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman02-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman02-1.62.svg",
    "color": "#EF4444",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_woman03",
    "name": "Generic Woman03",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman03-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman03-1.62.svg",
    "color": "#10B981",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_woman04",
    "name": "Generic Woman04",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman04-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman04-1.62.svg",
    "color": "#F59E0B",
    "color_customizable": false,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_woman05",
    "name": "Generic Woman05",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman05-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman05-1.62.svg",
    "color": "#8B5CF6",
    "color_customizable": false,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_woman06",
    "name": "Generic Woman06",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman06-1.62.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman06-1.62.png",
    "color": "#EC4899",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_woman07",
    "name": "Generic Woman07",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman07-1.62.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman07-1.62.png",
    "color": "#000000",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_woman08",
    "name": "Generic Woman08",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman08-1.62.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman08-1.62.png",
    "color": "#3B82F6",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_woman09",
    "name": "Generic Woman09",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman09-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman09-1.62.svg",
    "color": "#EF4444",
    "color_customizable": false,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_woman1",
    "name": "Generic Woman1",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman1-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman1-1.62.svg",
    "color": "#EF4444",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_woman10",
    "name": "Generic Woman10",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman10-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman10-1.62.svg",
    "color": "#10B981",
    "color_customizable": false,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_woman11",
    "name": "Generic Woman11",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman11-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman11-1.62.svg",
    "color": "#F59E0B",
    "color_customizable": false,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_woman2",
    "name": "Generic Woman2",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman2-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman2-1.62.svg",
    "color": "#10B981",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_woman3",
    "name": "Generic Woman3",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman3-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman3-1.62.svg",
    "color": "#F59E0B",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_woman4",
    "name": "Generic Woman4",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman4-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman4-1.62.svg",
    "color": "#8B5CF6",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_woman5",
    "name": "Generic Woman5",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman5-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman5-1.62.svg",
    "color": "#EC4899",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_woman6",
    "name": "Generic Woman6",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman6-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman6-1.62.svg",
    "color": "#000000",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_woman7",
    "name": "Generic Woman7",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman7-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman7-1.62.svg",
    "color": "#3B82F6",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-generic_people-generic_woman8",
    "name": "Generic Woman8",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      110
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman8-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/generic_people/generic_woman8-1.62.svg",
    "color": "#EF4444",
    "color_customizable": true,
    "color_property": "fill",
    "order_num": 1000
  },
  {
    "id": "generic-people-agender1",
    "name": "Agender1",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender1-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender1-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-agender2",
    "name": "Agender2",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender2-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender2-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-agender3",
    "name": "Agender3",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender3-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender3-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-agender4",
    "name": "Agender4",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender4-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender4-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-agender5",
    "name": "Agender5",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender5-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender5-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-agender6",
    "name": "Agender6",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender6-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/agender6-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-man1",
    "name": "Man1",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man1-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man1-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-man2",
    "name": "Man2",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man2-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man2-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-man3",
    "name": "Man3",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man3-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man3-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-man4",
    "name": "Man4",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man4-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man4-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-man5",
    "name": "Man5",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man5-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man5-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-man6",
    "name": "Man6",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man6-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man6-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-man7",
    "name": "Man7",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man7-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man7-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-man8",
    "name": "Man8",
    "height": 1.75,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man8-1.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/man8-1.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-woman1",
    "name": "Woman1",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman1-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman1-1.62.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-woman2",
    "name": "Woman2",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman2-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman2-1.62.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-woman3",
    "name": "Woman3",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman3-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman3-1.62.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-woman4",
    "name": "Woman4",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman4-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman4-1.62.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-woman5",
    "name": "Woman5",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman5-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman5-1.62.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-woman6",
    "name": "Woman6",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman6-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman6-1.62.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-people-woman7",
    "name": "Woman7",
    "height": 1.62,
    "cat_ids": [
      0,
      1,
      120
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman7-1.62.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/people/woman7-1.62.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-old_people-oldman1",
    "name": "Oldman1",
    "height": 1.68,
    "cat_ids": [
      0,
      1,
      130
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldman1-1.68.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldman1-1.68.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-old_people-oldman2",
    "name": "Oldman2",
    "height": 1.68,
    "cat_ids": [
      0,
      1,
      130
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldman2-1.68.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldman2-1.68.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-old_people-oldman3",
    "name": "Oldman3",
    "height": 1.68,
    "cat_ids": [
      0,
      1,
      130
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldman3-1.68.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldman3-1.68.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-old_people-oldman4",
    "name": "Oldman4",
    "height": 1.68,
    "cat_ids": [
      0,
      1,
      130
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldman4-1.68.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldman4-1.68.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-old_people-oldman5",
    "name": "Oldman5",
    "height": 1.68,
    "cat_ids": [
      0,
      1,
      130
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldman5-1.68.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldman5-1.68.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-old_people-oldwoman1",
    "name": "Oldwoman1",
    "height": 1.58,
    "cat_ids": [
      0,
      1,
      130
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman1-1.58.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman1-1.58.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-old_people-oldwoman2",
    "name": "Oldwoman2",
    "height": 1.58,
    "cat_ids": [
      0,
      1,
      130
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman2-1.58.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman2-1.58.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-old_people-oldwoman3",
    "name": "Oldwoman3",
    "height": 1.58,
    "cat_ids": [
      0,
      1,
      130
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman3-1.58.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman3-1.58.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-old_people-oldwoman4",
    "name": "Oldwoman4",
    "height": 1.58,
    "cat_ids": [
      0,
      1,
      130
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman4-1.58.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman4-1.58.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-old_people-oldwoman5",
    "name": "Oldwoman5",
    "height": 1.58,
    "cat_ids": [
      0,
      1,
      130
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman5-1.58.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman5-1.58.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-old_people-oldwoman6",
    "name": "Oldwoman6",
    "height": 1.58,
    "cat_ids": [
      0,
      1,
      130
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman6-1.58.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/old_people/oldwoman6-1.58.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-baby01",
    "name": "Baby01",
    "height": 0.75,
    "cat_ids": [
      0,
      1,
      140
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby01-0.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby01-0.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-baby02",
    "name": "Baby02",
    "height": 0.75,
    "cat_ids": [
      0,
      1,
      140
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby02-0.75.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby02-0.75.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-baby03",
    "name": "Baby03",
    "height": 0.75,
    "cat_ids": [
      0,
      1,
      140
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby03-0.75.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby03-0.75.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-baby-baby1",
    "name": "Baby1",
    "height": 0.75,
    "cat_ids": [
      0,
      1,
      140
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby1-0.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby1-0.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-baby-baby2",
    "name": "Baby2",
    "height": 0.75,
    "cat_ids": [
      0,
      1,
      140
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby2-0.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby2-0.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-baby-baby3",
    "name": "Baby3",
    "height": 0.75,
    "cat_ids": [
      0,
      1,
      140
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby3-0.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby3-0.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-baby-baby4",
    "name": "Baby4",
    "height": 0.75,
    "cat_ids": [
      0,
      1,
      140
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby4-0.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby4-0.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-baby-baby5",
    "name": "Baby5",
    "height": 0.75,
    "cat_ids": [
      0,
      1,
      140
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby5-0.75.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/baby/baby5-0.75.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_12years_boy1",
    "name": "Child Kid 12years Boy1",
    "height": 1.52,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_boy1-1.52.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_boy1-1.52.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_12years_boy2",
    "name": "Child Kid 12years Boy2",
    "height": 1.52,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_boy2-1.52.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_boy2-1.52.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_12years_boy3",
    "name": "Child Kid 12years Boy3",
    "height": 1.52,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_boy3-1.52.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_boy3-1.52.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_12years_boy4",
    "name": "Child Kid 12years Boy4",
    "height": 1.52,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_boy4-1.52.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_boy4-1.52.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_12years_girl1",
    "name": "Child Kid 12years Girl1",
    "height": 1.45,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_girl1-1.45.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_girl1-1.45.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_12years_girl2",
    "name": "Child Kid 12years Girl2",
    "height": 1.45,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_girl2-1.45.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_girl2-1.45.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_12years_girl3",
    "name": "Child Kid 12years Girl3",
    "height": 1.45,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_girl3-1.45.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_girl3-1.45.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_12years_girl4",
    "name": "Child Kid 12years Girl4",
    "height": 1.45,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_girl4-1.45.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_12years_girl4-1.45.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_boy1",
    "name": "Child Kid 5years Boy1",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy1-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy1-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_boy2",
    "name": "Child Kid 5years Boy2",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy2-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy2-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_boy3",
    "name": "Child Kid 5years Boy3",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy3-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy3-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_boy4",
    "name": "Child Kid 5years Boy4",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy4-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy4-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_boy5",
    "name": "Child Kid 5years Boy5",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy5-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy5-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_boy6",
    "name": "Child Kid 5years Boy6",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy6-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_boy6-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_girl1",
    "name": "Child Kid 5years Girl1",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl1-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl1-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_girl2",
    "name": "Child Kid 5years Girl2",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl2-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl2-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_girl3",
    "name": "Child Kid 5years Girl3",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl3-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl3-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_girl4",
    "name": "Child Kid 5years Girl4",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl4-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl4-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_girl5",
    "name": "Child Kid 5years Girl5",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl5-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl5-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-child_kid_5years_girl6",
    "name": "Child Kid 5years Girl6",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl6-1.1.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_5years_girl6-1.1.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_boy1",
    "name": "Child Kid Boy1",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy1-1.1.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy1-1.1.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_boy2",
    "name": "Child Kid Boy2",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy2-1.1.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy2-1.1.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_boy3",
    "name": "Child Kid Boy3",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy3-1.1.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy3-1.1.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_boy4",
    "name": "Child Kid Boy4",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy4-1.1.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy4-1.1.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_boy5",
    "name": "Child Kid Boy5",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy5-1.1.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy5-1.1.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_boy6",
    "name": "Child Kid Boy6",
    "height": 1.2,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy6-1.2.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_boy6-1.2.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_girl1",
    "name": "Child Kid Girl1",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl1-1.1.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl1-1.1.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_girl2",
    "name": "Child Kid Girl2",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl2-1.1.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl2-1.1.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_girl3",
    "name": "Child Kid Girl3",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl3-1.1.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl3-1.1.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_girl4",
    "name": "Child Kid Girl4",
    "height": 1.1,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl4-1.1.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl4-1.1.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_girl5",
    "name": "Child Kid Girl5",
    "height": 1.2,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl5-1.2.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl5-1.2.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-child_kid_girl6",
    "name": "Child Kid Girl6",
    "height": 1.2,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl6-1.2.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/child_kid_girl6-1.2.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_boy1",
    "name": "Teenager 16years Boy1",
    "height": 1.65,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy1-1.65.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy1-1.65.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_boy2",
    "name": "Teenager 16years Boy2",
    "height": 1.65,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy2-1.65.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy2-1.65.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_boy3",
    "name": "Teenager 16years Boy3",
    "height": 1.65,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy3-1.65.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy3-1.65.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_boy4",
    "name": "Teenager 16years Boy4",
    "height": 1.65,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy4-1.65.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy4-1.65.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_boy5",
    "name": "Teenager 16years Boy5",
    "height": 1.65,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy5-1.65.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy5-1.65.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_boy6",
    "name": "Teenager 16years Boy6",
    "height": 1.65,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy6-1.65.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy6-1.65.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_boy7",
    "name": "Teenager 16years Boy7",
    "height": 1.65,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy7-1.65.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy7-1.65.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_boy8",
    "name": "Teenager 16years Boy8",
    "height": 1.65,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy8-1.65.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_boy8-1.65.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_girl1",
    "name": "Teenager 16years Girl1",
    "height": 1.55,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl1-1.55.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl1-1.55.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_girl2",
    "name": "Teenager 16years Girl2",
    "height": 1.55,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl2-1.55.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl2-1.55.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_girl3",
    "name": "Teenager 16years Girl3",
    "height": 1.55,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl3-1.55.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl3-1.55.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_girl4",
    "name": "Teenager 16years Girl4",
    "height": 1.55,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl4-1.55.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl4-1.55.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_girl5",
    "name": "Teenager 16years Girl5",
    "height": 1.55,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl5-1.55.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl5-1.55.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_girl6",
    "name": "Teenager 16years Girl6",
    "height": 1.55,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl6-1.55.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl6-1.55.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_girl7",
    "name": "Teenager 16years Girl7",
    "height": 1.55,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl7-1.55.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl7-1.55.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-children-teenager_16years_girl8",
    "name": "Teenager 16years Girl8",
    "height": 1.55,
    "cat_ids": [
      0,
      1,
      150
    ],
    "media_type": "svg",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl8-1.55.svg",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/children/teenager_16years_girl8-1.55.svg",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-australia_man_average_height",
    "name": "Australia Man Average Height",
    "height": 1.788,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Australia%20man%20average%20height-1.788.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Australia%20man%20average%20height-1.788.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-brazilian_man_average_height",
    "name": "Brazilian Man Average Height",
    "height": 1.757,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/brazilian%20man%20average%20height-1.757.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/brazilian%20man%20average%20height-1.757.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-canada_man_average_height",
    "name": "Canada Man Average Height",
    "height": 1.788,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Canada%20man%20average%20height-1.788.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Canada%20man%20average%20height-1.788.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-china_man_average_height",
    "name": "China Man Average Height",
    "height": 1.757,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/China%20man%20average%20height-1.757.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/China%20man%20average%20height-1.757.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-denmark_man_average_height",
    "name": "Denmark Man Average Height",
    "height": 1.8189,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Denmark%20man%20average%20height-1.8189.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Denmark%20man%20average%20height-1.8189.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-france_man_average_height",
    "name": "France Man Average Height",
    "height": 1.797,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/France%20man%20average%20height-1.797.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/France%20man%20average%20height-1.797.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-germany_man_average_height",
    "name": "Germany Man Average Height",
    "height": 1.808,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Germany%20man%20average%20height-1.808.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Germany%20man%20average%20height-1.808.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-iceland_male_average_height",
    "name": "Iceland Male Average Height",
    "height": 1.821,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Iceland%20male%20average%20height-1.821.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Iceland%20male%20average%20height-1.821.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-indian_man_average_height",
    "name": "Indian Man Average Height",
    "height": 1.665,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Indian%20man%20average%20height-1.665.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Indian%20man%20average%20height-1.665.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-indonesian_man_average_height",
    "name": "Indonesian Man Average Height",
    "height": 1.663,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/indonesian%20man%20average%20height-1.663.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/indonesian%20man%20average%20height-1.663.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-japanese_man_average_height",
    "name": "Japanese Man Average Height",
    "height": 1.721,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Japanese%20man%20average%20height-1.721.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Japanese%20man%20average%20height-1.721.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-mexican_man_average_height",
    "name": "Mexican Man Average Height",
    "height": 1.703,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Mexican%20man%20average%20height-1.703.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Mexican%20man%20average%20height-1.703.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-netherlands_man_average_height",
    "name": "Netherlands Man Average Height",
    "height": 1.8378,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Netherlands%20man%20average%20height-1.8378.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Netherlands%20man%20average%20height-1.8378.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-philippines_man_average_height",
    "name": "Philippines Man Average Height",
    "height": 1.633,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Philippines%20man%20average%20height-1.633.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Philippines%20man%20average%20height-1.633.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-south_korea_man_average_height",
    "name": "South Korea Man Average Height",
    "height": 1.755,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/South%20Korea%20man%20average%20height-1.755.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/South%20Korea%20man%20average%20height-1.755.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-ukraine_man_average_height",
    "name": "Ukraine Man Average Height",
    "height": 1.8098,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Ukraine%20man%20average%20height-1.8098.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Ukraine%20man%20average%20height-1.8098.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-united_kingdom_average_height",
    "name": "United Kingdom Average Height",
    "height": 1.782,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/United_Kingdom_average_height-1.782.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/United_Kingdom_average_height-1.782.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-united_states_man_average_height",
    "name": "United States Man Average Height",
    "height": 1.769,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/United%20States%20man%20average%20height-1.769.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/United%20States%20man%20average%20height-1.769.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  },
  {
    "id": "generic-country_average_height-vietnam_man_average_height",
    "name": "Vietnam Man Average Height",
    "height": 1.684,
    "cat_ids": [
      0,
      1,
      160
    ],
    "media_type": "image",
    "media_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Vietnam%20man%20average%20height-1.684.png",
    "thumbnail_url": "https://raw.githubusercontent.com/happydrew/compareheights-characters/refs/heads/main/generic/country_average_height/Vietnam%20man%20average%20height-1.684.png",
    "color": null,
    "color_customizable": false,
    "color_property": null,
    "order_num": 1000
  }
]