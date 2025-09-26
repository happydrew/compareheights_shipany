// 统一导出所有模块化组件 - 简化版

// UI基础组件
export { SearchInput } from './ui/SearchInput';

// 高度计算工具
export { Unit, convertHeightSmart, convertHeightSmartImperial } from './HeightCalculates';

// 主要组件
export { HeightCompareTool } from './HeightCompareTool';
export type { HeightCompareToolProps } from './HeightCompareTool';
export { CharacterDisplay } from './CharacterDisplay';