// 左侧面板容器组件 - 简化版

import React, { useState, forwardRef } from 'react';
import { TabNavigation } from './TabNavigation';
import { CharactersPanel } from './CharactersPanel';
import { LibraryPanel } from './LibraryPanel';
import { Unit } from '../HeightCalculates';
import { X } from 'lucide-react';
import {ComparisonItem} from '../HeightCompareTool'

interface LeftPanelProps {
  // 当前角色相关props
  unit: Unit;
  onUnitChange: (unit: Unit) => void;
  comparisonItems: ComparisonItem[];

  // 角色库相关props
  onCharacterAdd: (character: any) => void;
  onImageUpload?: () => void;

  // 角色面板交互props
  onSelectItem?: (item: ComparisonItem) => void;
  onRemoveItem?: (itemId: string) => void;
  onDragStart?: (itemId: string, event: React.MouseEvent | React.TouchEvent) => void;
  getItemStyle?: (itemId: string) => React.CSSProperties;

  // 样式
  className?: string;
  style?: React.CSSProperties;
  withCollaspseButton?: boolean;
  onCollapse?: (e: React.MouseEvent) => void;
}

// 简化版左侧面板 - 直接使用 useState
export const LeftPanel = forwardRef<HTMLDivElement, LeftPanelProps>(({
  unit,
  onUnitChange,
  comparisonItems,
  onCharacterAdd,
  onImageUpload,
  onSelectItem,
  onRemoveItem,
  onDragStart,
  getItemStyle,
  className = '',
  style,
  withCollaspseButton = false,
  onCollapse,
}, ref) => {
  // 简单的 tab 状态管理
  const [activeTab, setActiveTab] = useState<'characters' | 'library'>('library');

  return (
    <div
      ref={ref}
      className={`flex flex-col bg-white border-r border-gray-200 ${className}`}
      style={style}
    >
      {/* 右侧折叠按钮 */}
      {withCollaspseButton &&
        <button
          title='collapse'
          className='absolute top-2 right-0 translate-x-[100%] z-10 p-2 text-gray-500 hover:text-gray-700 rounded-r-full bg-gray-100'
          onClick={onCollapse}
        >
          <X size={16} />
        </button>
      }

      {/* Tab导航 */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab内容 - 使用absolute定位和visibility控制显示，保持状态 */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Characters面板 - 始终存在 */}
        <div
          className={`absolute inset-0 w-full h-full bg-white ${activeTab === 'characters' ? 'block' : 'hidden'}`}
          style={{
            pointerEvents: activeTab === 'characters' ? 'auto' : 'none'
          }}
        >
          <CharactersPanel
            unit={unit}
            onUnitChange={onUnitChange}
            comparisonItems={comparisonItems}
            onSelectItem={onSelectItem}
            onRemoveItem={onRemoveItem}
            onDragStart={onDragStart}
            getItemStyle={getItemStyle}
          />
        </div>

        {/* Library面板 - 始终存在 */}
        <div
          className={`absolute inset-0 w-full h-full bg-white ${activeTab === 'library' ? 'block' : 'hidden'}`}
          style={{
            pointerEvents: activeTab === 'library' ? 'auto' : 'none'
          }}
        >
          <LibraryPanel
            onCharacterAdd={onCharacterAdd}
            onImageUpload={onImageUpload}
          />
        </div>
      </div>
    </div>
  );
});

LeftPanel.displayName = 'LeftPanel';