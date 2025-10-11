import { type Character, queryCharactersByIds } from './types/characters';

// 分享的角色数据接口
export interface SharedCharacterData {
  id: string;        // Character.id - 数据库主键，必须字段
  name?: string;     // 用户自定义名称，可选覆盖
  height?: number;   // 用户自定义身高，可选覆盖
  color?: string;    // 用户自定义颜色，可选覆盖
}

// 样式设置接口
export interface SharedSettings {
  unit: 'cm' | 'ft-in';
  chartTitle: string;
  backgroundColor?: string;
  backgroundImage?: string;
  gridLines?: boolean;
  labels?: boolean;
  shadows?: boolean;
  theme?: 'light' | 'dark';
  chartHeight?: number;
  spacing?: number;
}

// 分享数据接口（支持两种格式）
export interface SharedData {
  characters: SharedCharacterData[];
  // 扁平格式（用于URL分享，向后兼容）
  chartTitle?: string;
  unit?: string;
  // 嵌套格式（用于项目数据）
  settings?: SharedSettings;
}

// 比较项目接口（从HeightCompareTool.tsx复制）
interface ComparisonItem {
  id: string;
  character: Character;
  visible: boolean;
  selected: boolean;
  order: number;
}

// 分享链接管理器
export class ShareUrlManager {

  // 编码对比数据到URL参数
  encodeToUrl(items: ComparisonItem[], chartTitle: string, unit: string): string {
    if (!items || items.length === 0) {
      return '';
    }

    const params = new URLSearchParams();

    // 按order排序确保顺序一致
    const sortedItems = [...items].sort((a, b) => a.order - b.order);

    sortedItems.forEach(item => {
      const char = item.character;

      // 必须参数：角色ID
      params.append('cid', char.id);

      // 可选参数：用户自定义的属性
      // 注意：这里我们无法知道原始数据，所以直接存储当前值
      // 在解析时会以数据库数据为准，这些作为覆盖
      params.append('cn', char.name || '');
      params.append('ch', char.height.toString());
      params.append('cc', char.color || '');
    });
    params.append('ct', chartTitle);
    params.append('u', unit);

    return params.toString();
  }

  // 从URL参数解码出分享数据
  decodeFromUrl(url: string): SharedData {
    let urlToParse: string;

    // 处理完整URL或查询字符串
    if (url.includes('?')) {
      urlToParse = url.split('?')[1];
    } else {
      urlToParse = url;
    }

    if (!urlToParse) {
      return {
        chartTitle: '',
        unit: 'cm',
        characters: []
      };
    }

    const params = new URLSearchParams(urlToParse);

    // 获取图表标题和单位制
    const chartTitle = params.get('ct') || '';
    const unit = params.get('u') || 'cm';

    // 获取所有角色参数值
    const cids = params.getAll('cid');
    const cns = params.getAll('cn');
    const chs = params.getAll('ch');
    const ccs = params.getAll('cc');

    // 验证参数数量一致性
    if (cids.length !== cns.length || cids.length !== chs.length || cids.length !== ccs.length) {
      console.warn('分享链接参数数量不一致，可能已损坏');
      return {
        chartTitle,
        unit,
        characters: []
      };
    }

    const characters: SharedCharacterData[] = [];

    // 按顺序组装角色数据
    for (let i = 0; i < cids.length; i++) {
      const id = cids[i];
      const name = cns[i];
      const heightStr = chs[i];
      const color = ccs[i];

      if (!id) {
        console.warn(`跳过无效的角色ID，索引：${i}`);
        continue;
      }

      const shared: SharedCharacterData = { id };

      // 只有非空值才添加到覆盖属性中
      if (name && name.trim()) {
        shared.name = name.trim();
      }

      if (heightStr && heightStr.trim()) {
        const height = parseFloat(heightStr);
        if (!isNaN(height) && height > 0) {
          shared.height = height;
        }
      }

      if (color && color.trim()) {
        shared.color = color.trim();
      }

      characters.push(shared);
    }

    return {
      chartTitle,
      unit,
      characters
    };
  }

  // 生成完整分享链接
  generateShareLink(items: ComparisonItem[], chartTitle: string, unit: string, baseUrl?: string): string {
    const params = this.encodeToUrl(items, chartTitle, unit);
    if (!params) {
      return baseUrl || window.location.origin + window.location.pathname;
    }

    const base = baseUrl || window.location.origin + window.location.pathname;
    return `${base}?${params}`;
  }

  // 检查当前URL是否包含分享数据
  hasSharedData(url?: string): boolean {
    const urlToCheck = url || window.location.search;
    const sharedData = this.decodeFromUrl(urlToCheck);
    return sharedData.characters.length > 0;
  }

  // 检查URL长度是否超限
  checkUrlLength(items: ComparisonItem[], chartTitle: string, unit: string): { isValid: boolean; length: number; maxLength: number } {
    const params = this.encodeToUrl(items, chartTitle, unit);
    const fullUrl = this.generateShareLink(items, chartTitle, unit);
    const maxLength = 2048; // 大多数浏览器的URL长度限制

    return {
      isValid: fullUrl.length <= maxLength,
      length: fullUrl.length,
      maxLength
    };
  }

  // 从分享数据重建ComparisonItem数组
  async rebuildComparisonItems(characterData: SharedCharacterData[]): Promise<ComparisonItem[]> {
    if (!characterData || characterData.length === 0) {
      return [];
    }

    try {
      // 提取所有角色ID
      const characterIds = characterData.map(item => item.id);

      // 批量查询数据库获取基础角色信息
      const response = await queryCharactersByIds(characterIds);

      if (!response.success || !response.data) {
        throw new Error(response.message || '查询角色失败');
      }

      const baseCharacters = response.data;

      // 合并自定义属性，重建ComparisonItem[]
      const comparisonItems: ComparisonItem[] = [];

      characterData.forEach((shared, index) => {
        const baseChar = baseCharacters.find(c => c.id === shared.id);
        if (!baseChar) {
          console.warn(`角色不存在，跳过: ${shared.id}`);
          return;
        }

        // 用自定义属性覆盖基础属性
        const customizedCharacter: Character = {
          ...baseChar,
          name: shared.name || baseChar.name,
          height: shared.height ?? baseChar.height,
          color: shared.color || baseChar.color
        };

        const comparisonItem: ComparisonItem = {
          id: `shared-${shared.id}-${index}-${Date.now()}`, // 确保唯一性
          character: customizedCharacter,
          visible: true,
          selected: false,
          order: index
        };

        comparisonItems.push(comparisonItem);
      });

      return comparisonItems;

    } catch (error) {
      console.error('重建ComparisonItem失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const shareUrlManager = new ShareUrlManager();

// 便捷函数导出
export const {
  encodeToUrl,
  decodeFromUrl,
  generateShareLink,
  hasSharedData,
  checkUrlLength,
  rebuildComparisonItems
} = shareUrlManager;