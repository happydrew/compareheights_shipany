// 搜索输入框组件

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  debounceMs?: number;
  clearable?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'filled';
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = '搜索角色...',
  disabled = false,
  loading = false,
  debounceMs = 300,
  clearable = true,
  className = '',
  size = 'md',
  variant = 'outlined'
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // 尺寸样式映射
  const sizeStyles = {
    sm: {
      container: 'h-8',
      input: 'text-sm px-3',
      icon: 'w-4 h-4'
    },
    md: {
      container: 'h-10',
      input: 'text-sm px-4',
      icon: 'w-5 h-5'
    },
    lg: {
      container: 'h-12',
      input: 'text-base px-4',
      icon: 'w-6 h-6'
    }
  };

  // 变体样式映射
  const variantStyles = {
    default: 'border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500',
    outlined: 'border-2 border-gray-200 bg-white focus-within:border-blue-500',
    filled: 'border border-transparent bg-gray-100 focus-within:bg-white focus-within:border-blue-500'
  };

  const styles = sizeStyles[size];

  // 同步外部value变化
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // 防抖处理
  const debouncedOnChange = useCallback((newValue: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  }, [onChange, debounceMs]);

  // 处理输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    debouncedOnChange(newValue);
  }, [debouncedOnChange]);

  // 处理清空
  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  // 处理搜索（Enter键或搜索按钮）
  const handleSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onChange(internalValue);
    onSearch?.(internalValue);
  }, [internalValue, onChange, onSearch]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleSearch, handleClear]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={clsx(
      'relative flex items-center rounded-lg transition-all duration-200',
      styles.container,
      variantStyles[variant],
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      {/* 搜索图标 */}
      <div className={clsx(
        'absolute left-3 flex items-center justify-center pointer-events-none z-10',
        styles.icon,
        'text-gray-400'
      )}>
        <Search />
      </div>

      {/* 输入框 - 固定右侧padding，不受按钮影响 */}
      <input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
          'w-full bg-transparent border-0 outline-none pl-10 pr-10',
          styles.input,
          'placeholder:text-gray-400',
          disabled && 'cursor-not-allowed'
        )}
      />

      {/* 加载状态 - 绝对定位，不占用文档流 */}
      {loading && (
        <div className={clsx(
          'absolute right-3 flex items-center justify-center pointer-events-none z-10',
          styles.icon,
          'text-gray-400'
        )}>
          <Loader2 className="animate-spin" />
        </div>
      )}

      {/* 清空按钮 - 绝对定位，不占用文档流 */}
      {clearable && internalValue && !loading && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className={clsx(
            'absolute right-3 flex items-center justify-center z-20 rounded-sm',
            styles.icon,
            'text-gray-400 hover:text-gray-600 transition-colors',
            'hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1',
            disabled && 'cursor-not-allowed'
          )}
          aria-label="清空搜索"
        >
          <X className='w-4 h-4' />
        </button>
      )}
    </div>
  );
};