import type { SharedData, SharedCharacterData, SharedSettings } from '@/lib/shareUtils';

/**
 * 深度比较两个项目数据是否相等
 * 避免因 JSON.stringify 键顺序不同导致的误判
 */
export function compareProjectData(data1: SharedData | null, data2: SharedData | null): boolean {
  // 处理 null/undefined 情况
  if (data1 === data2) return true;
  if (!data1 || !data2) return false;

  // 比较 characters 数组
  if (!compareCharactersArray(data1.characters, data2.characters)) {
    return false;
  }

  // 比较 settings 对象
  if (!compareSettings(data1.settings, data2.settings)) {
    return false;
  }

  return true;
}

/**
 * 比较 characters 数组
 * 注意：SharedCharacterData 没有 order 和 visible 字段
 */
export function compareCharactersArray(
  arr1: SharedCharacterData[],
  arr2: SharedCharacterData[]
): boolean {
  if (arr1.length !== arr2.length) return false;

  // 按数组索引顺序比较（数组顺序就是显示顺序）
  for (let i = 0; i < arr1.length; i++) {
    const char1 = arr1[i];
    const char2 = arr2[i];

    // 逐字段比较 - 只比较存储的字段
    if (
      char1.id !== char2.id ||
      char1.name !== char2.name ||
      char1.height !== char2.height ||
      char1.color !== char2.color
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 比较 settings 对象
 */
function compareSettings(
  settings1: SharedSettings,
  settings2: SharedSettings
): boolean {
  return (
    settings1.unit === settings2.unit &&
    settings1.chartTitle === settings2.chartTitle &&
    settings1.backgroundColor === settings2.backgroundColor &&
    settings1.backgroundImage === settings2.backgroundImage &&
    settings1.gridLines === settings2.gridLines &&
    settings1.labels === settings2.labels &&
    settings1.shadows === settings2.shadows &&
    settings1.theme === settings2.theme &&
    settings1.chartHeight === settings2.chartHeight &&
    settings1.spacing === settings2.spacing
  );
}
