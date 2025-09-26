// 当前角色面板组件

import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { Unit, convertHeightSmart, convertHeightSmartImperial, convertHeight } from '../HeightCalculates';
import {ComparisonItem} from '../HeightCompareTool'

interface CharactersPanelProps {
  unit: Unit;
  onUnitChange: (unit: Unit) => void;
  comparisonItems: ComparisonItem[];
  onSelectItem?: (item: ComparisonItem) => void;
  onRemoveItem?: (itemId: string) => void;
  onDragStart?: (itemId: string, event: React.MouseEvent | React.TouchEvent) => void;
  getItemStyle?: (itemId: string) => React.CSSProperties;
  className?: string;
}

export const CharactersPanel: React.FC<CharactersPanelProps> = ({
  unit,
  onUnitChange,
  comparisonItems,
  onSelectItem,
  onRemoveItem,
  onDragStart,
  getItemStyle,
  className = ''
}) => {
  // 单位选项
  const unitOptions = [
    { value: Unit.CM, label: 'cm' },
    { value: Unit.FT_IN, label: 'ft' } // 使用与原代码相同的单位
  ];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 标题区域 */}
      <div className="px-4 py-2 border-b border-gray-200 bg-green-theme-50/50">
        <div className="flex items-center justify-between">
          <div className='text-sm font-medium'>{comparisonItems.length} characters</div>
          {/* 单位切换器 - 保持原有样式 */}
          <div className="flex gap-1">
            <button
              onClick={() => onUnitChange(unit === Unit.CM ? Unit.FT_IN : Unit.CM)}
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg hover:bg-green-theme-100 text-label-md transition-all duration-300"
              title={`Switch to ${unit === Unit.CM ? 'feet' : 'centimeters'}`}
            >
              <span className={unit === Unit.CM ? 'text-green-theme-600 font-bold' : 'text-gray-500'}>cm</span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l4-4-4-4m6 8l4-4-4-4" />
              </svg>
              <span className={unit === Unit.FT_IN ? 'text-green-theme-600 font-bold' : 'text-gray-500'}>ft</span>
            </button>
          </div>
        </div>
      </div>

      {/* 角色列表区域 */}
      <div className="flex-1 p-4 overflow-y-auto thin-scrollbar">
        <div className="space-y-1">
          {comparisonItems.length === 0 ? (
            <p className="text-gray-500 text-sm">No characters to compare</p>
          ) : (
            comparisonItems
              .sort((a, b) => a.order - b.order)
              .map(item => (
                <div
                  key={item.id}
                  data-left-item-id={item.id}
                  className={`flex items-center justify-between p-2 text-sm border-l-4 cursor-pointer transition-all ${item.selected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  style={getItemStyle?.(item.id) || {}}
                  onClick={() => onSelectItem?.(item)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.character.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">
                      {unit === Unit.CM
                        ? convertHeightSmart(item.character.height, true)
                        : convertHeightSmartImperial(item.character.height)
                      }
                    </span>
                    <button
                      title="Drag to reorder"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onDragStart?.(item.id, e);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onDragStart?.(item.id, e);
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1 cursor-grab hover:bg-gray-100 rounded"
                    >
                      <GripVertical className="w-3 h-3" />
                    </button>
                    <button
                      title="Remove character"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem?.(item.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};