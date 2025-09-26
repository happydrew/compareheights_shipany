// 通用Tab面板组件

import React from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabPanelProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  variant = 'default',
  size = 'md',
  fullWidth = true
}) => {
  // 尺寸样式映射
  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-base'
  };

  // 变体样式映射
  const variantStyles = {
    default: {
      container: 'border-b border-gray-200',
      tab: {
        base: 'border-b-2 font-medium transition-all duration-200',
        active: 'border-blue-500 text-blue-600 bg-blue-50',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }
    },
    pills: {
      container: 'bg-gray-100 rounded-lg p-1',
      tab: {
        base: 'rounded-md font-medium transition-all duration-200',
        active: 'bg-white text-gray-900 shadow-sm',
        inactive: 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
      }
    },
    underline: {
      container: '',
      tab: {
        base: 'border-b-2 font-medium transition-all duration-200',
        active: 'border-blue-500 text-blue-600',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={clsx('flex', styles.container, className)}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={clsx(
              // 基础样式
              'flex items-center justify-center gap-2',
              sizeStyles[size],
              styles.tab.base,

              // 全宽样式
              fullWidth && 'flex-1',

              // 状态样式
              isActive ? styles.tab.active : styles.tab.inactive,
            )}
            type="button"
          >
            {/* 图标 */}
            {tab.icon && (
              <span className={clsx(
                'flex-shrink-0',
                size === 'sm' && 'w-4 h-4',
                size === 'md' && 'w-5 h-5',
                size === 'lg' && 'w-6 h-6'
              )}>
                {tab.icon}
              </span>
            )}

            {/* 标签文本 */}
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};