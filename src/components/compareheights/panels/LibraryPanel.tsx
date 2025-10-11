import { useAppContext } from '@/contexts/app';
import { CUSTOM_CHARACTER_CATEGORY_ID } from '@/lib/constants/customCharacters';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { SearchInput } from '../ui/SearchInput';
import { convertHeightSmart, convertHeightSmartImperial } from '../HeightCalculates';
import { type Category, DEFAULT_CATEGORIES } from './categories';
import { Character, PRESET_CAT1_CHARACTERS } from '@/lib/types/characters';

interface CacheEntry {
  data: Character[];
  timestamp: number;
  categoryId: number;
}

class CharacterCacheManager {
  private cache = new Map<number, CacheEntry>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;
  private readonly ROOT_CATEGORY_ID = 0;

  constructor() {

    this.cache.set(1, {
      data: PRESET_CAT1_CHARACTERS,
      timestamp: Number.MAX_SAFE_INTEGER,
      categoryId: 1
    });

  }

  private getAllChildCategoryIds(categoryId: number, categories: Category[]): Set<number> {
    const childIds = new Set<number>();

    if (categoryId === this.ROOT_CATEGORY_ID) {

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

  private isValidCache(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_DURATION;
  }

  private cleanExpiredCache(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValidCache(entry)) {
        this.cache.delete(key);
      }
    }
  }

  private filterCharactersByCategory(characters: Character[], categoryId: number): Character[] {
    if (categoryId === this.ROOT_CATEGORY_ID) {
      return characters;
    }

    return characters.filter(char =>
      char.cat_ids && char.cat_ids.includes(categoryId)
    );
  }

  get(categoryId: number, categories: Category[]): Character[] | null {
    this.cleanExpiredCache();

    const directCache = this.cache.get(categoryId);
    if (directCache && this.isValidCache(directCache)) {
      return directCache.data;
    }

    if (categoryId !== this.ROOT_CATEGORY_ID) {
      const rootCache = this.cache.get(this.ROOT_CATEGORY_ID);
      if (rootCache && this.isValidCache(rootCache)) {
        const filteredData = this.filterCharactersByCategory(rootCache.data, categoryId);
        return filteredData;
      }
    }

    const parentIds = this.getParentCategoryIds(categoryId, categories);
    for (const parentId of parentIds) {
      if (parentId === this.ROOT_CATEGORY_ID) continue;

      const parentCache = this.cache.get(parentId);
      if (parentCache && this.isValidCache(parentCache)) {
        const filteredData = this.filterCharactersByCategory(parentCache.data, categoryId);
        return filteredData;
      }
    }

    return null;
  }

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

  set(categoryId: number, data: Character[], categories: Category[]): void {
    this.cleanExpiredCache();

    if (categoryId === this.ROOT_CATEGORY_ID) {

      const keysToDelete = Array.from(this.cache.keys()).filter(key => key !== this.ROOT_CATEGORY_ID);
      keysToDelete.forEach(key => this.cache.delete(key));

      this.cache.set(categoryId, {
        data,
        timestamp: Date.now(),
        categoryId
      });
      return;
    }

    const rootCache = this.cache.get(this.ROOT_CATEGORY_ID);
    if (rootCache && this.isValidCache(rootCache)) {
      return;
    }

    const parentIds = this.getParentCategoryIds(categoryId, categories);
    for (const parentId of parentIds) {
      if (this.cache.has(parentId)) {
        this.cache.delete(categoryId);
        return;
      }
    }

    this.cache.set(categoryId, {
      data,
      timestamp: Date.now(),
      categoryId
    });

    this.removeChildCaches(categoryId, categories);
  }

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
    }
  }

  search(categoryId: number, searchTerm: string, categories: Category[]): Character[] | null {
    const cachedData = this.get(categoryId, categories);
    if (!cachedData) return null;

    const searchLower = searchTerm.toLowerCase();
    const filteredResults = cachedData.filter(character =>
      character.name.toLowerCase().includes(searchLower)
    );

    return filteredResults;
  }

  clear(): void {
    this.cache.clear();
  }

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

  const { user } = useAppContext();
  const categories = useMemo<Category[]>(() => {
    if (user) {
      return DEFAULT_CATEGORIES;
    }
    return DEFAULT_CATEGORIES.filter(category => category.id !== CUSTOM_CHARACTER_CATEGORY_ID);
  }, [user]);

  const [characters, setCharacters] = useState<Character[]>(PRESET_CAT1_CHARACTERS);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(() => {
    const rootCategories = categories.map(cat => cat.id);
    return new Set(rootCategories);
  });

  const [isRootExpanded, setIsRootExpanded] = useState(true);

  const [splitRatio, setSplitRatio] = useState(0.4);
  const [isDragging, setIsDragging] = useState(false);

  const loadCharactersRequestId = useRef<number>(0);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const libraryPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpandedCategories(new Set(categories.map(cat => cat.id)));
  }, [categories]);

  useEffect(() => {
    if (!user && selectedCategoryId === CUSTOM_CHARACTER_CATEGORY_ID) {
      const fallbackCategory = categories.find(cat => cat.id !== CUSTOM_CHARACTER_CATEGORY_ID);
      const fallbackId = fallbackCategory?.id ?? (categories[0]?.id ?? 1);
      if (fallbackId !== selectedCategoryId) {
        setSelectedCategoryId(fallbackId);
      }
    }
  }, [user, categories, selectedCategoryId]);

  const loadCharacters = async (categoryId: number, search?: string) => {
    setIsLoadingCharacters(true);
    setError(null);

    const requestId = ++loadCharactersRequestId.current;

    try {

      if (search) {
        const cachedResults = characterCache.search(categoryId, search, categories);
        if (cachedResults !== null) {
          if (requestId === loadCharactersRequestId.current) {
            setCharacters(cachedResults);
            setIsLoadingCharacters(false);
          }
          return;
        }
      }

      if (!search) {
        const cachedData = characterCache.get(categoryId, categories);
        if (cachedData !== null) {
          if (requestId === loadCharactersRequestId.current) {
            setCharacters(cachedData);
            setIsLoadingCharacters(false);
          }
          return;
        }
      }

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

          if (!search) {
            characterCache.set(categoryId, data.data, categories);

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

  useEffect(() => {
    if (selectedCategoryId !== null) {
      loadCharacters(selectedCategoryId, searchTerm || undefined);
    }
  }, [selectedCategoryId, searchTerm, user]);

  const handleSelectCategory = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
  };

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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const calculateNewRatio = (clientY: number) => {

    const container = libraryPanelRef.current;
    if (!container) return splitRatio;

    const containerRect = container.getBoundingClientRect();
    const headerHeight = toolbarRef.current?.offsetHeight || 0;
    const availableHeight = containerRect.height - headerHeight;
    const relativeY = clientY - containerRect.top - headerHeight;

    let newRatio = relativeY / availableHeight;
    return Math.max(0.1, Math.min(0.9, newRatio));
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const newRatio = calculateNewRatio(e.clientY);
    setSplitRatio(newRatio);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !e.touches[0]) return;
    e.preventDefault();
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

  useEffect(() => {
    if (isDragging) {

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      document.addEventListener('touchcancel', handleTouchEnd, { passive: false });

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
      {/* ?*/}
      <div ref={toolbarRef} className="p-2 border-b border-gray-200 flex-shrink-0 bg-green-theme-50/50">
        <div className="flex justify-between items-center gap-2 w-full">
          {onImageUpload && (
            <button
              onClick={onImageUpload}
              className="flex items-center gap-1.5 px-2.5 py-1 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-sm whitespace-nowrap flex-shrink-0 cursor-pointer"
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

      {/* ?*/}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* ?*/}
        <div
          className="flex-none border-none border-gray-200"
          style={{ height: `${splitRatio * 100}%` }}
        >
          <div className="h-full flex flex-col overflow-y-auto p-3 thin-scrollbar">
            {/* All Characters ?- ?*/}
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

              {/* ?- ?*/}
              {isRootExpanded && (
                <div className="ml-4">
                  {categories.map(category => renderCategoryNode(category, 1))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/*  */}
        <div
          className={`
            relative transition-colors flex-shrink-0 group
            ${isDragging ? 'bg-blue-50' : 'hover:bg-gray-50'}
          `}
          style={{ height: '12px' }}
        >
          {/* ?*/}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300 animated-divider transform -translate-y-1/2" />

          {/* ?- ?*/}
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
            {/*  */}
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

        {/*  */}
        <div className="flex-1 overflow-y-auto p-4 thin-scrollbar relative">
          <div className="absolute inset-4">
            {/* ?*/}
            {isLoadingCharacters && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="loading-modern mb-4"></div>
                <p className="text-body-md text-gray-600">Loading characters...</p>
              </div>
            )}

            {/* ?*/}
            {error && !isLoadingCharacters && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-red-500 text-4xl mb-4"></div>
                <p className="text-body-md text-red-600 text-center mb-4 leading-relaxed">{error}</p>
                <button
                  onClick={() => selectedCategoryId !== null && loadCharacters(selectedCategoryId, searchTerm)}
                  className="px-4 py-2 bg-green-theme-500 text-white rounded-xl hover:bg-green-theme-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm ripple-effect"
                >
                  Retry
                </button>
              </div>
            )}

            {/*  */}
            {!isLoadingCharacters && !error && (
              <div className="flex justify-around items-center flex-wrap gap-2">
                {characters.length === 0 ? (
                  <div className="col-span-3 flex flex-col items-center justify-center py-8">
                    <div className="text-gray-400 text-4xl mb-4"></div>
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
                      {/* ?*/}
                      <div className="aspect-square w-[8rem] flex items-center justify-center bg-gray-50 rounded overflow-hidden">
                        {/* ?-  */}
                        {character.thumbnail_url ? (
                          <img
                            src={character.thumbnail_url}
                            alt={character.name}
                            className="w-full h-full object-contain hover:scale-105 transition-transform duration-200"
                          />
                        ) : (

                          <div
                            className={`w-12 h-16 rounded flex items-center justify-center text-white text-sm font-bold hover:ring-2 hover:ring-gray-300 hover:ring-offset-1`}
                            style={{
                              backgroundColor: character.color || 'transparent'
                            }}
                          >
                            ?
                          </div>
                        )}
                      </div>

                      {/*  */}
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

