import React, { useState, useEffect, useRef } from 'react';
import { Upload, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { SearchInput } from '../ui/SearchInput';
import { convertHeightSmart, convertHeightSmartImperial } from '../HeightCalculates';
import { type Category, DEFAULT_CATEGORIES } from './categories';
import { Character, PRESET_CAT1_CHARACTERS } from '@/lib/types/characters';

// 缓存管理器
interface CacheEntry {
  data: Character[];
  timestamp: number;
  categoryId: number;
}

class CharacterCacheManager {
  private cache = new Map<number, CacheEntry>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时
  private readonly ROOT_CATEGORY_ID = 0; // 根分类ID

  constructor() {

    // 直接设置到 cache 中
    this.cache.set(1, {
      data: PRESET_CAT1_CHARACTERS,
      timestamp: Number.MAX_SAFE_INTEGER,
      categoryId: 1
    });

    // console.log(`💾 构造函数初始化缓存，分类 1，共 ${presetData.length} 个角色`);
  }

  // 获取分类的所有子分类ID（递归）
  private getAllChildCategoryIds(categoryId: number, categories: Category[]): Set<number> {
    const childIds = new Set<number>();

    if (categoryId === this.ROOT_CATEGORY_ID) {
      // 根分类包含所有分类
      const collectAllIds = (cats: Category[]) => {
        for (const cat of cats) {
          childIds.add(cat.id);
          if (cat.children) {
            collectAllIds(cat.children);
          }
        }
      };
      collectAllIds(categories);
      return childIds;
    }

    // 查找指定分类并收集其所有子分类ID
    const findAndCollectChildren = (cats: Category[]) => {
      for (const cat of cats) {
        if (cat.id === categoryId && cat.children) {
          const collectChildren = (children: Category[]) => {
            for (const child of children) {
              childIds.add(child.id);
              if (child.children) {
                collectChildren(child.children);
              }
            }
          };
          collectChildren(cat.children);
          return true;
        }
        if (cat.children && findAndCollectChildren(cat.children)) {
          return true;
        }
      }
      return false;
    };

    findAndCollectChildren(categories);
    return childIds;
  }

  // 检查缓存是否有效
  private isValidCache(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_DURATION;
  }

  // 清理过期缓存
  private cleanExpiredCache(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValidCache(entry)) {
        this.cache.delete(key);
      }
    }
  }

  // 从角色数据中过滤指定分类的角色
  private filterCharactersByCategory(characters: Character[], categoryId: number): Character[] {
    if (categoryId === this.ROOT_CATEGORY_ID) {
      return characters; // 根分类返回所有角色
    }

    return characters.filter(char =>
      char.cat_ids && char.cat_ids.includes(categoryId)
    );
  }

  // 获取缓存数据
  get(categoryId: number, categories: Category[]): Character[] | null {
    this.cleanExpiredCache();

    // 1. 先检查当前分类的直接缓存
    const directCache = this.cache.get(categoryId);
    if (directCache && this.isValidCache(directCache)) {
      // console.log(`💾 缓存直接命中，分类 ${categoryId}，共 ${directCache.data.length} 个角色`);
      return directCache.data;
    }

    // 2. 检查根分类缓存，如果存在且当前查询不是根分类，则从根分类缓存中过滤
    if (categoryId !== this.ROOT_CATEGORY_ID) {
      const rootCache = this.cache.get(this.ROOT_CATEGORY_ID);
      if (rootCache && this.isValidCache(rootCache)) {
        const filteredData = this.filterCharactersByCategory(rootCache.data, categoryId);
        console.log(`💾 从根分类缓存过滤，分类 ${categoryId}，过滤出 ${filteredData.length} 个角色`);
        return filteredData;
      }
    }

    // 3. 检查父分类缓存（原有逻辑，但优先级降低）
    const parentIds = this.getParentCategoryIds(categoryId, categories);
    for (const parentId of parentIds) {
      if (parentId === this.ROOT_CATEGORY_ID) continue; // 根分类已在上面检查过

      const parentCache = this.cache.get(parentId);
      if (parentCache && this.isValidCache(parentCache)) {
        const filteredData = this.filterCharactersByCategory(parentCache.data, categoryId);
        console.log(`💾 从父分类缓存过滤，父分类 ${parentId} -> 分类 ${categoryId}，过滤出 ${filteredData.length} 个角色`);
        return filteredData;
      }
    }

    return null;
  }

  // 获取分类的所有父分类ID（保留原有方法）
  private getParentCategoryIds(categoryId: number, categories: Category[]): number[] {
    const parentIds: number[] = [];
    const findParents = (catId: number) => {
      for (const category of categories) {
        if (category.children) {
          for (const child of category.children) {
            if (child.id === catId) {
              parentIds.push(category.id);
              findParents(category.id);
              return;
            }
          }
        }
      }
    };
    findParents(categoryId);
    return parentIds;
  }

  // 设置缓存数据
  set(categoryId: number, data: Character[], categories: Category[]): void {
    this.cleanExpiredCache();

    // 如果设置的是根分类缓存，清空所有其他分类缓存
    if (categoryId === this.ROOT_CATEGORY_ID) {
      console.log(`💾 设置根分类缓存，清空所有子分类缓存，共 ${data.length} 个角色`);
      // 清空所有非根分类缓存
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key !== this.ROOT_CATEGORY_ID);
      keysToDelete.forEach(key => this.cache.delete(key));

      // 设置根分类缓存
      this.cache.set(categoryId, {
        data,
        timestamp: Date.now(),
        categoryId
      });
      return;
    }

    // 如果已有根分类缓存，则不缓存子分类数据（因为可以从根分类缓存中过滤）
    const rootCache = this.cache.get(this.ROOT_CATEGORY_ID);
    if (rootCache && this.isValidCache(rootCache)) {
      console.log(`💾 已有根分类缓存，跳过子分类 ${categoryId} 的缓存`);
      return;
    }

    // 如果父分类已有缓存，则移除当前分类的缓存（如果存在）
    const parentIds = this.getParentCategoryIds(categoryId, categories);
    for (const parentId of parentIds) {
      if (this.cache.has(parentId)) {
        console.log(`💾 父分类 ${parentId} 已有缓存，跳过子分类 ${categoryId} 的缓存`);
        this.cache.delete(categoryId);
        return;
      }
    }

    // 设置新缓存
    console.log(`💾 设置分类缓存，分类 ${categoryId}，共 ${data.length} 个角色`);
    this.cache.set(categoryId, {
      data,
      timestamp: Date.now(),
      categoryId
    });

    // 移除所有子分类的缓存
    this.removeChildCaches(categoryId, categories);
  }

  // 移除子分类缓存
  private removeChildCaches(parentCategoryId: number, categories: Category[]): void {
    const childIds = this.getAllChildCategoryIds(parentCategoryId, categories);
    let removedCount = 0;

    for (const childId of childIds) {
      if (this.cache.has(childId)) {
        this.cache.delete(childId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`💾 移除 ${removedCount} 个子分类缓存，父分类 ${parentCategoryId}`);
    }
  }

  // 从缓存中搜索
  search(categoryId: number, searchTerm: string, categories: Category[]): Character[] | null {
    const cachedData = this.get(categoryId, categories);
    if (!cachedData) return null;

    const searchLower = searchTerm.toLowerCase();
    const filteredResults = cachedData.filter(character =>
      character.name.toLowerCase().includes(searchLower)
    );

    console.log(`🔍 从缓存搜索，分类 ${categoryId}，关键词 "${searchTerm}"，找到 ${filteredResults.length} 个结果`);
    return filteredResults;
  }

  // 清空所有缓存
  clear(): void {
    this.cache.clear();
    console.log(`💾 清空所有缓存`);
  }

  // 获取缓存统计信息
  getStats(): { totalEntries: number; totalCharacters: number; hasRootCache: boolean } {
    this.cleanExpiredCache();
    let totalCharacters = 0;
    for (const entry of this.cache.values()) {
      totalCharacters += entry.data.length;
    }
    return {
      totalEntries: this.cache.size,
      totalCharacters,
      hasRootCache: this.cache.has(this.ROOT_CATEGORY_ID)
    };
  }
}

// 创建全局缓存实例
const characterCache = new CharacterCacheManager();

interface LibraryPanelProps {
  onCharacterAdd: (character: Character) => void;
  onImageUpload?: () => void;
  className?: string;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  onCharacterAdd,
  onImageUpload,
  className = ''
}) => {
  // 简单的状态管理
  // 默认加载目录1（通用角色）的角色列表
  const [characters, setCharacters] = useState<Character[]>(PRESET_CAT1_CHARACTERS);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 分类树的展开状态 - 默认展开所有根分类
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(() => {
    const rootCategories = DEFAULT_CATEGORIES.map(cat => cat.id);
    return new Set(rootCategories);
  });

  // 根分类折叠状态 - 新增根分类折叠控制
  const [isRootExpanded, setIsRootExpanded] = useState(true);

  // 分割比例状态
  const [splitRatio, setSplitRatio] = useState(0.4);
  const [isDragging, setIsDragging] = useState(false);

  const loadCharactersRequestId = useRef<number>(0);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const libraryPanelRef = useRef<HTMLDivElement>(null);

  // 加载角色数据 - 集成智能缓存系统
  const loadCharacters = async (categoryId: number, search?: string) => {
    setIsLoadingCharacters(true);
    setError(null);
    // setCharacters([]); // 立即清空当前角色列表

    const requestId = ++loadCharactersRequestId.current;

    try {
      // 1. 如果有搜索关键词，尝试从缓存中搜索
      if (search) {
        const cachedResults = characterCache.search(categoryId, search, DEFAULT_CATEGORIES);
        if (cachedResults !== null) {
          // console.log(`🔍 从缓存中搜索到 ${cachedResults.length} 个角色`);
          if (requestId === loadCharactersRequestId.current) {
            setCharacters(cachedResults);
            setIsLoadingCharacters(false);
          }
          return;
        }
      }

      // 2. 如果没有搜索关键词，检查是否有缓存
      if (!search) {
        const cachedData = characterCache.get(categoryId, DEFAULT_CATEGORIES);
        if (cachedData !== null) {
          // console.log(`💾 从缓存加载分类 ${categoryId}，共 ${cachedData.length} 个角色`);
          if (requestId === loadCharactersRequestId.current) {
            setCharacters(cachedData);
            setIsLoadingCharacters(false);
          }
          return;
        }
      }

      // 3. 缓存未命中，发起网络请求
      // console.log(`🌐 网络请求加载分类 ${categoryId}${search ? ` 搜索: "${search}"` : ''}`);
      const params = new URLSearchParams();
      params.append('category_id', categoryId.toString());
      if (search) params.append('search', search);
      params.append('limit', '1000');

      const response = await fetch(`/api/queryCharacters?${params}`);
      if (!response.ok) {
        throw new Error(`fetch characters failed, response code: ${response.status}, message: ${response.statusText}`);
      }
      const data = await response.json();

      if (requestId === loadCharactersRequestId.current) {
        if (data.success && data.data) {
          // 4. 只有在无搜索关键词时才缓存数据
          if (!search) {
            characterCache.set(categoryId, data.data, DEFAULT_CATEGORIES);
            // console.log(`💾 已缓存分类 ${categoryId}，共 ${data.data.length} 个角色`);
            // const stats = characterCache.getStats();
            // console.log(`📊 缓存统计: ${stats.totalEntries} 个分类，${stats.totalCharacters} 个角色${stats.hasRootCache ? ' [含根分类缓存]' : ''}`);
          }
          setCharacters(data.data);
        } else {
          setCharacters([]);
        }
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
      if (requestId === loadCharactersRequestId.current) {
        setError('Failed to load characters');
        setCharacters([]);
      }
    } finally {
      if (requestId === loadCharactersRequestId.current) {
        setIsLoadingCharacters(false);
      }
    }
  };

  // 监听分类变化：加载角色
  useEffect(() => {
    if (selectedCategoryId !== null) {
      loadCharacters(selectedCategoryId, searchTerm || undefined);
    }
  }, [selectedCategoryId, searchTerm]);

  // 分类选择处理
  const handleSelectCategory = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
  };

  // 展开/折叠处理
  const handleToggleExpanded = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // 分割线拖拽处理 - 支持鼠标和触摸
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const calculateNewRatio = (clientY: number) => {
    // const container = document.querySelector('.simple-library-panel') as HTMLElement;
    const container = libraryPanelRef.current;
    if (!container) return splitRatio;

    const containerRect = container.getBoundingClientRect();
    const headerHeight = toolbarRef.current?.offsetHeight || 0;
    const availableHeight = containerRect.height - headerHeight;
    const relativeY = clientY - containerRect.top - headerHeight;

    let newRatio = relativeY / availableHeight;
    return Math.max(0.1, Math.min(0.9, newRatio)); // 限制在10%-90%之间
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const newRatio = calculateNewRatio(e.clientY);
    setSplitRatio(newRatio);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !e.touches[0]) return;
    e.preventDefault(); // 防止滚动
    const touch = e.touches[0];
    const newRatio = calculateNewRatio(touch.clientY);
    setSplitRatio(newRatio);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // 监听拖拽事件 - 支持鼠标和触摸
  useEffect(() => {
    if (isDragging) {
      // 鼠标事件
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // 触摸事件 - 使用 passive: false 允许 preventDefault
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      document.addEventListener('touchcancel', handleTouchEnd, { passive: false });

      // 防止选择文本和滚动
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.body.style.touchAction = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.touchAction = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // 渲染分类树节点
  const renderCategoryNode = (category: Category, depth = 0) => {
    const isSelected = selectedCategoryId === category.id;
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id}>
        <div
          className={`
            flex items-center gap-1 px-3 py-1 cursor-pointer rounded-lg
            ${isSelected
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'hover:bg-gray-50 text-gray-700'
            }
          `}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => handleSelectCategory(category.id)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) handleToggleExpanded(category.id);
            }}
            className={`
              flex-shrink-0 w-4 h-4 flex items-center justify-center rounded
              ${hasChildren ? 'hover:bg-gray-200' : 'invisible'}
            `}
          >
            {hasChildren && (
              isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            )}
          </button>

          <span className="flex-shrink-0">
            {(hasChildren && isExpanded) ?
              <FolderOpen className="w-4 h-4 text-blue-500" /> :
              <Folder className="w-4 h-4 text-gray-500" />
            }
          </span>

          <span className="flex-1 text-sm truncate">{category.name}</span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={libraryPanelRef} className={`flex flex-col h-full simple-library-panel ${className}`}>
      {/* 工具栏 */}
      <div ref={toolbarRef} className="p-2 border-b border-gray-200 flex-shrink-0 bg-green-theme-50/50">
        <div className="flex justify-between items-center gap-2 w-full">
          {onImageUpload && (
            <button
              onClick={onImageUpload}
              className="flex items-center gap-1.5 px-2.5 py-1 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-sm whitespace-nowrap flex-shrink-0"
            >
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Upload</span>
            </button>
          )}

          <div className="flex-1 min-w-0">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search characters..."
              className="w-full"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* 分类树区域 */}
        <div
          className="flex-none border-none border-gray-200"
          style={{ height: `${splitRatio * 100}%` }}
        >
          <div className="h-full flex flex-col overflow-y-auto p-3 thin-scrollbar">
            {/* All Characters 根分类 - 可折叠 */}
            <div className="mb-2">
              <div
                className={`
                  flex items-center gap-1 px-3 py-1 cursor-pointer rounded-lg
                  ${selectedCategoryId === 0
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'hover:bg-gray-50 text-gray-700'
                  }
                `}
                onClick={() => handleSelectCategory(0)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRootExpanded(prev => !prev);
                  }}
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200"
                >
                  {isRootExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                <span className="flex-shrink-0">
                  {isRootExpanded ?
                    <FolderOpen className="w-4 h-4 text-blue-500" /> :
                    <Folder className="w-4 h-4 text-gray-500" />
                  }
                </span>
                <span className="text-sm font-medium text-gray-800">All Characters</span>
              </div>

              {/* 分类树 - 只在根分类展开时显示 */}
              {isRootExpanded && (
                <div className="ml-4">
                  {DEFAULT_CATEGORIES.map(category => renderCategoryNode(category, 1))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 可拖拽分隔线 */}
        <div
          className={`
            relative transition-colors flex-shrink-0 group
            ${isDragging ? 'bg-blue-50' : 'hover:bg-gray-50'}
          `}
          style={{ height: '12px' }} // 增加整体高度，提供更大的触摸区域
        >
          {/* 视觉分割线 */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300 animated-divider transform -translate-y-1/2" />

          {/* 可拖拽的调节块 - 只有这个区域能触发拖拽 */}
          <div
            className={`
              absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2
              w-10 h-3 cursor-row-resize
              bg-white shadow-md rounded-md border border-gray-200
              opacity-60 group-hover:opacity-100 
              transition-opacity duration-200
              touch-none select-none
              ${isDragging ? 'opacity-100 bg-blue-50 border-blue-300' : ''}
            `}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* 调节块内的指示器 */}
            <div className="flex flex-row gap-0.5 items-center justify-center h-full">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`
                    w-1 h-1 rounded-full
                    ${isDragging ? 'bg-blue-500' : 'bg-gray-400'}
                  `}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 角色网格 */}
        <div className="flex-1 overflow-y-auto p-4 thin-scrollbar relative">
          <div className="absolute inset-4">
            {/* 加载状态 */}
            {isLoadingCharacters && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="loading-modern mb-4"></div>
                <p className="text-body-md text-gray-600">Loading characters...</p>
              </div>
            )}

            {/* 错误状态 */}
            {error && !isLoadingCharacters && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <p className="text-body-md text-red-600 text-center mb-4 leading-relaxed">{error}</p>
                <button
                  onClick={() => selectedCategoryId !== null && loadCharacters(selectedCategoryId, searchTerm)}
                  className="px-4 py-2 bg-green-theme-500 text-white rounded-xl hover:bg-green-theme-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm ripple-effect"
                >
                  Retry
                </button>
              </div>
            )}

            {/* 角色网格 */}
            {!isLoadingCharacters && !error && (
              <div className="flex justify-around items-center flex-wrap gap-2">
                {characters.length === 0 ? (
                  <div className="col-span-3 flex flex-col items-center justify-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">🔍</div>
                    <p className="text-gray-500 text-sm text-center">
                      {searchTerm ? `No characters found for "${searchTerm}"` : 'No characters available'}
                    </p>
                  </div>
                ) : (
                  characters.map(character => (
                    <div
                      key={character.id}
                      data-character-item="true"
                      className="relative group cursor-pointer"
                      onClick={() => {
                        onCharacterAdd(character);
                      }}
                    >
                      {/* 正方形容器 */}
                      <div className="aspect-square w-[8rem] flex items-center justify-center bg-gray-50 rounded overflow-hidden">
                        {/* 角色缩略图 - 保持原始比例 */}
                        {character.thumbnail_url ? (
                          <img
                            src={character.thumbnail_url}
                            alt={character.name}
                            className="w-full h-full object-contain hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          // fallback 到表情符号图标
                          <div
                            className={`w-12 h-16 rounded flex items-center justify-center text-white text-sm font-bold hover:ring-2 hover:ring-gray-300 hover:ring-offset-1`}
                            style={{
                              backgroundColor: character.color || 'transparent'
                            }}
                          >
                            ⭐
                          </div>
                        )}
                      </div>

                      {/* 悬浮提示 */}
                      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                        w-full max-h-full break-words overflow-hidden whitespace-normal flex flex-col justify-center items-center bg-white/80 text-gray-800 
                        opacity-0 text-xs rounded-lg group-hover:opacity-100 z-10 backdrop-blur-sm border 
                        border-gray-200/50 shadow-lg transition-all duration-200 ease-out group-hover:scale-105 
                        `}>
                        <div className="font-medium text-gray-900 text-center">{character.name}</div>
                        <div className="text-gray-600 text-[11px] text-center">
                          {convertHeightSmart(character.height, true)} / {convertHeightSmartImperial(character.height)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};