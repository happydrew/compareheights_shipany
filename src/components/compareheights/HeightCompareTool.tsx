'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Trash2, Users, Share2, Download,
  Grid, ArrowLeftRight, RotateCcw, ZoomIn, ZoomOut, GripVertical,
  Maximize, Minimize, Palette, Moon, Sun, Save, MoreHorizontal
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { CharacterDisplay } from './CharacterDisplay';
import { ImageUploadModal } from './ImageUploadModal';
import 'simplebar-react/dist/simplebar.min.css';
import './styles.css';
import { type Character } from '@/lib/types/characters';
import {
  Unit, Precision, convertHeightSmart, convertHeightSmartImperial, getBestUnit,
  getImperialGridUnitLabel, convertHeightPrecision, convertHeightForGridImperial, convertHeight, findUnit
} from './HeightCalculates';
import { getContentRect, copyToClipboard } from '@/lib/utils';
import { generateRandomName, shouldGenerateRandomName } from '@/lib/nameGenerator';
import { shareUrlManager, type SharedData } from '@/lib/shareUtils';
import { heightCompareCache } from '@/lib/cache/heightCompareCache';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Import new modular left panel components
import { LeftPanel } from '@/components/compareheights/panels/LeftPanel';
import HeightInput from './HeightInput';
import { Menu } from 'lucide-react';
import { uploadThumbnailToR2 } from '@/lib/thumbnail-upload';

// 比较项目接口
export interface ComparisonItem {
  id: string;
  character: Character;
  visible: boolean;
  selected: boolean;
  order: number;
}

// 样式设置接口
interface StyleSettings {
  backgroundColor: string;
  backgroundImage?: string;
  gridLines: boolean;
  labels: boolean;
  shadows: boolean;
  theme: 'light' | 'dark';
  chartHeight: number;
  spacing: number;
}

// 获取最大高度用于动态单位制选择
const getMaxHeightInComparison = (items: ComparisonItem[]): number => {
  if (items.length === 0) return 2; // 默认值（米）
  return Math.max(...items.map(item => item.character.height));
};

// 主题相关的CSS类助手函数
const getThemeClasses = (theme: 'light' | 'dark') => {
  const isDark = theme === 'dark';
  return {
    // 文本颜色
    text: {
      primary: isDark ? 'text-white' : 'text-gray-900',
      secondary: isDark ? 'text-gray-300' : 'text-gray-600',
      muted: isDark ? 'text-gray-400' : 'text-gray-500',
    },
    // 背景颜色
    bg: {
      primary: isDark ? 'bg-zinc-900' : 'bg-white',
      secondary: isDark ? '!bg-zinc-700' : '!bg-zinc-50',
      hover: isDark ? 'hover:bg-zinc-600' : 'hover:bg-zinc-100',
    },
    // 边框颜色
    border: {
      primary: isDark ? 'border-gray-600' : 'border-gray-200',
      secondary: isDark ? 'border-gray-700' : 'border-gray-300',
    },
    // 分割线颜色
    divider: isDark ? 'bg-gray-600' : 'bg-gray-300',
    // 按钮样式
    button: {
      base: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600',
      hover: isDark ? 'hover:bg-gray-600 hover:text-white' : 'hover:bg-green-theme-100 hover:text-green-theme-600',
      active: isDark ? 'bg-green-theme-700 text-green-theme-100' : 'bg-green-theme-100 text-green-theme-600'
    }
  };
};


// 添加拖拽状态接口
interface DragState {
  isDragging: boolean;
  draggedItemId: string | null;
  startMouseX: number;
  startMouseY: number;
  currentMouseX: number;
  currentMouseY: number;
  fixedElementX: number; // fixed元素的初始X位置
  fixedElementY: number; // fixed元素的初始Y位置
  draggedElement: HTMLElement | null; // 被拖拽元素的引用
  preventNextClick?: boolean;
}

// 组件属性接口
interface HeightCompareToolProps {
  presetData?: SharedData | any; // 预设数据，用于内页展示特定角色比较
  shareMode?: boolean; // 分享模式，隐藏左侧面板并禁用保存/清空按钮
  onChange?: (data: any) => void; // 数据变化回调，用于项目编辑页自动保存
  onSave?: () => Promise<void>; // 父组件保存函数（项目编辑页）
  isProjectEdit?: boolean; // 是否在项目编辑页
  projectUuid?: string; // 项目ID，用于判断是否处于项目中以及生成分享链接
}

// Ref 接口 - 暴露给父组件的方法
interface HeightCompareToolRef {
  generateThumbnail: (options?: { format?: 'base64' | 'blob' }) => Promise<string | Blob | null>;
}

// 主组件
const HeightCompareTool = React.forwardRef<HeightCompareToolRef, HeightCompareToolProps>(
  ({ presetData, shareMode = false, onChange, onSave, isProjectEdit = false, projectUuid }, ref) => {
    const t = useTranslations('heightCompareTool');
    const { data: session, status } = useSession();
    const router = useRouter();
    const { setShowSignModal, isPaidSubscriber } = useAppContext();
    const [unit, setUnit] = useState<Unit>(Unit.CM);
    /**
     * 当前在比较列表中的角色
     */
    const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [selectedComparisonItemId, setSelectedComparisonItemId] = useState<string | null>(null);
    const [showRightPanel, setShowRightPanel] = useState(false);
    const [styleSettings, setStyleSettings] = useState<StyleSettings>({
      backgroundColor: '#ffffff',
      gridLines: true,
      labels: true,
      shadows: true,
      theme: 'light',
      chartHeight: 600,
      spacing: 50,
    });

    const [chartAreaHeightPix, setChartAreaHeightPix] = useState<number>(0);
    const [pixelsPerMState, setPixelsPerMState] = useState(1); // 添加新的状态

    // 获取当前主题的样式类
    const themeClasses = useMemo(() => getThemeClasses(styleSettings.theme), [styleSettings.theme]);
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);

    // 全屏状态
    const [isFullscreen, setIsFullscreen] = useState(false);

    // API相关状态 - 移除旧的角色加载逻辑，现在由新的模块化左侧面板处理

    // 分享功能相关状态
    const [isLoadingShareData, setIsLoadingShareData] = useState(false);
    const [showShareSuccess, setShowShareSuccess] = useState(false);
    const [skipUrlUpdate, setSkipUrlUpdate] = useState(true); // 初始时跳过URL更新，等初始化完成
    const [isInitialized, setIsInitialized] = useState(false); // 标记是否已初始化
    const initializationStartedRef = useRef(false);

    // 移除旧的角色加载逻辑，现在由新的模块化左侧面板处理

    // 分享功能相关函数
    const generateShareLink = useCallback(() => {
      try {
        // 直接使用当前URL，因为它已经实时同步了
        const currentUrl = window.location.href;
        return currentUrl;
      } catch (error) {
        console.error('生成分享链接失败:', error);
        throw error;
      }
    }, []); // 移除comparisonItems依赖，因为URL已经实时更新

    // 图表标题状态
    const [chartTitle, setChartTitle] = useState(t('defaults.chartTitle'))
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const titleInputRef = useRef<HTMLInputElement>(null)

    const loadSharedComparison = useCallback(async (sharedData: SharedData) => {
      if (!sharedData || sharedData.characters.length === 0) {
        return;
      }

      console.log('Loading shared data:', JSON.stringify(sharedData));

      setIsLoadingShareData(true);
      setSkipUrlUpdate(true); // 在加载分享数据时跳过URL更新

      try {
        const rebuiltItems = await shareUrlManager.rebuildComparisonItems(sharedData.characters);
        setComparisonItems(rebuiltItems);

        // 统一读取逻辑：优先从settings读取，其次从扁平结构读取（向后兼容）
        const titleToLoad = sharedData.settings?.chartTitle;
        const unitToLoad = sharedData.settings?.unit;

        if (titleToLoad) {
          setChartTitle(titleToLoad);
        }
        if (unitToLoad) {
          setUnit(findUnit(unitToLoad));
        }

        // 应用样式设置（如果有）
        if (sharedData.settings) {
          setStyleSettings(prev => ({
            ...prev,
            backgroundColor: sharedData.settings!.backgroundColor || prev.backgroundColor,
            backgroundImage: sharedData.settings!.backgroundImage,
            gridLines: sharedData.settings!.gridLines ?? prev.gridLines,
            labels: sharedData.settings!.labels ?? prev.labels,
            shadows: sharedData.settings!.shadows ?? prev.shadows,
            theme: sharedData.settings!.theme || prev.theme,
            chartHeight: sharedData.settings!.chartHeight ?? prev.chartHeight,
            spacing: sharedData.settings!.spacing ?? prev.spacing,
          }));
        }

        console.log('Loading shared data success:', rebuiltItems.length, 'characters, title:', titleToLoad, 'unit:', unitToLoad);
      } catch (error) {
        console.error('Loading shared data failed:', error);
        alert(t('alerts.loadingShareDataFailed'));
      } finally {
        setIsLoadingShareData(false);
        // 延迟恢复URL更新，确保数据加载完成
        setTimeout(() => setSkipUrlUpdate(false), 100);
      }
    }, []);

    // 加载预设数据（项目编辑页使用，统一使用settings格式）
    const loadPresetData = useCallback(async (presetData: SharedData) => {
      if (!presetData || !presetData.characters || presetData.characters.length === 0) {
        return;
      }

      setIsLoadingShareData(true);
      setSkipUrlUpdate(true); // 在加载预设数据时跳过URL更新
      try {
        const rebuiltItems = await shareUrlManager.rebuildComparisonItems(presetData.characters);
        setComparisonItems(rebuiltItems);

        // 从settings中读取所有配置
        if (presetData.settings) {
          const settings = presetData.settings;

          // 应用图表标题
          if (settings.chartTitle) {
            setChartTitle(settings.chartTitle);
          }

          // 应用单位制
          if (settings.unit) {
            setUnit(findUnit(settings.unit));
          }

          // 应用所有样式设置
          setStyleSettings(prev => ({
            ...prev,
            backgroundColor: settings.backgroundColor || prev.backgroundColor,
            backgroundImage: settings.backgroundImage,
            gridLines: settings.gridLines ?? prev.gridLines,
            labels: settings.labels ?? prev.labels,
            shadows: settings.shadows ?? prev.shadows,
            theme: settings.theme || prev.theme,
            chartHeight: settings.chartHeight ?? prev.chartHeight,
            spacing: settings.spacing ?? prev.spacing,
          }));

          console.log('Loading preset data success:', rebuiltItems.length, 'characters, title:', settings.chartTitle, 'unit:', settings.unit);
        } else {
          console.warn('Preset data missing settings object');
        }
      } catch (error) {
        console.error('Loading preset data failed:', error);
      } finally {
        setIsLoadingShareData(false);
        // 对于预设数据，立即允许URL更新
        setSkipUrlUpdate(false);
      }
    }, []);

    // Initialize data once when component mounts
    useEffect(() => {
      if (isInitialized || initializationStartedRef.current) {
        return;
      }

      initializationStartedRef.current = true;

      const handleDataInitialization = async () => {
        try {
          // Priority 1: load preset data (项目编辑页传入的数据)
          if (presetData && presetData.characters && presetData.characters.length > 0) {
            console.log('Priority 1: Loading preset data (project edit):', presetData);
            await loadPresetData(presetData);
            setIsInitialized(true);
            // 项目编辑页不需要缓存
            return;
          }

          // Priority 2: load from shared URL if present
          if (shareUrlManager.hasSharedData()) {
            const sharedData = shareUrlManager.decodeFromUrl(window.location.search);
            if (sharedData.characters.length > 0) {
              console.log('Priority 2: Detected shared link, loading shared data', sharedData);
              await loadSharedComparison(sharedData);
              setIsInitialized(true);
              // URL分享数据不需要缓存
              return;
            }
          }

          // Priority 3: load from cache (缓存数据)
          const cachedData = heightCompareCache.load();
          if (cachedData && cachedData.characters.length > 0) {
            console.log('Priority 3: Loading cached data:', cachedData);
            await loadSharedComparison(cachedData); // 复用加载逻辑
            setIsInitialized(true);
            // 清除缓存（已经恢复了）
            heightCompareCache.clear();
            toast.success(t('console.restoredPreviousWork'));
            return;
          }

          // Priority 4: nothing to load, show empty state
          setSkipUrlUpdate(false);
          setIsInitialized(true);
          console.log('No data to load, rendering empty state');
        } catch (error) {
          console.error('Data initialization failed:', error);
          setSkipUrlUpdate(false);
          setIsInitialized(true);
        }
      };

      handleDataInitialization().finally(() => {
        initializationStartedRef.current = false;
      });
    }, [isInitialized, presetData, loadSharedComparison, loadPresetData]); // Only run until initialized

    // 实时更新URL - 监听comparisonItems变化
    useEffect(() => {
      // 防止在初始化未完成或正在加载分享数据时更新URL
      if (!isInitialized || isLoadingShareData || skipUrlUpdate) {
        return;
      }

      try {
        const urlParams = shareUrlManager.encodeToUrl(comparisonItems, chartTitle, unit);

        // 构建新的URL
        const newUrl = urlParams
          ? `${window.location.pathname}?${urlParams}`
          : window.location.pathname;

        // 使用replaceState而不是pushState，避免影响浏览器历史记录
        window.history.replaceState(null, '', newUrl);

      } catch (error) {
        console.error('更新URL失败:', error);
      }
    }, [comparisonItems, isInitialized, isLoadingShareData, skipUrlUpdate, chartTitle, unit]); // 监听comparisonItems和相关状态的变化

    // 监听数据变化,触发 onChange 回调 (用于项目编辑页自动保存)
    useEffect(() => {
      // 如果是分享模式或没有 onChange 回调,或者还未初始化完成,则跳过
      if (shareMode || !onChange || !isInitialized || isLoadingShareData) {
        return;
      }

      // 构建项目数据格式（只存储必要的覆盖信息）
      const projectData: SharedData = {
        characters: comparisonItems.map(item => ({
          id: item.character.id,
          name: item.character.name,
          height: item.character.height,
          color: item.character.color || undefined,
        })),
        settings: {
          unit: unit === Unit.CM ? 'cm' : 'ft-in',
          chartTitle: chartTitle,
          backgroundColor: styleSettings.backgroundColor,
          backgroundImage: styleSettings.backgroundImage,
          gridLines: styleSettings.gridLines,
          labels: styleSettings.labels,
          shadows: styleSettings.shadows,
          theme: styleSettings.theme,
          chartHeight: styleSettings.chartHeight,
          spacing: styleSettings.spacing,
        },
      };

      onChange(projectData);
    }, [comparisonItems, styleSettings, unit, chartTitle, onChange, shareMode, isInitialized, isLoadingShareData]);

    // 自动缓存数据（非项目编辑页且非分享模式）
    useEffect(() => {
      // 项目编辑页和分享模式不需要缓存
      if (isProjectEdit || shareMode || !isInitialized || isLoadingShareData) {
        return;
      }

      // 清除之前的定时器
      if (cacheTimerRef.current) {
        clearTimeout(cacheTimerRef.current);
      }

      // 500ms debounce
      cacheTimerRef.current = setTimeout(() => {
        if (comparisonItems.length > 0) {
          const dataToCache: SharedData = {
            characters: comparisonItems.map(item => ({
              id: item.character.id,
              name: item.character.name,
              height: item.character.height,
              color: item.character.color || undefined,
            })),
            settings: {
              unit: unit === Unit.CM ? 'cm' : 'ft-in',
              chartTitle: chartTitle,
              backgroundColor: styleSettings.backgroundColor,
              backgroundImage: styleSettings.backgroundImage,
              gridLines: styleSettings.gridLines,
              labels: styleSettings.labels,
              shadows: styleSettings.shadows,
              theme: styleSettings.theme,
              chartHeight: styleSettings.chartHeight,
              spacing: styleSettings.spacing,
            },
          };

          heightCompareCache.save(dataToCache);
        } else {
          // 当角色列表为空时，清除缓存
          heightCompareCache.clear();
          console.log('Cleared cache because comparisonItems is empty');
        }
      }, 500);

      return () => {
        if (cacheTimerRef.current) {
          clearTimeout(cacheTimerRef.current);
        }
      };
    }, [comparisonItems, styleSettings, unit, chartTitle, isProjectEdit, shareMode, isInitialized, isLoadingShareData]);

    // 添加重置缩放函数
    const resetZoom = () => {
      setPixelsPerMState(1); // 重置为默认值1，这会触发自动计算
    };

    // 全屏切换功能
    const toggleFullscreen = useCallback(async () => {
      const element = comparisonAreaRef.current;
      if (!element) return;

      try {
        if (!isFullscreen) {
          // 进入全屏
          if (element.requestFullscreen) {
            await element.requestFullscreen();
          } else if ((element as any).webkitRequestFullscreen) {
            await (element as any).webkitRequestFullscreen();
          } else if ((element as any).msRequestFullscreen) {
            await (element as any).msRequestFullscreen();
          }
          setIsFullscreen(true);
        } else {
          // 退出全屏
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen();
          }
          setIsFullscreen(false);
        }
      } catch (error) {
        console.error('全屏切换失败:', error);
      }
    }, [isFullscreen]);

    // 角色数量为0时，重置缩放
    useEffect(() => {
      if (comparisonItems.length == 0) {
        resetZoom();
      }
    }, [comparisonItems.length])

    /**Current conversion ratio between m and px (screen pixels), i.e., how many px equals 1m */
    const pixelsPerM = useMemo(() => {
      // 如果有手动调整的值，使用手动调整的值
      if (pixelsPerMState !== 1) {
        return pixelsPerMState;
      }
      // 否则使用自动计算值，采用高精度计算
      const maxHeight = getMaxHeightInComparison(comparisonItems);
      const availablePixHeight = chartAreaHeightPix - 85;

      // 使用高精度计算以避免极端情况下的精度损失
      const pixHeightPrecision = Precision.from(availablePixHeight);
      const maxHeightPrecision = Precision.from(maxHeight);
      const ratio = pixHeightPrecision.divide(maxHeightPrecision);
      console.log(`Calculate ratio: availableHeight=${availablePixHeight}, maxHeight=${maxHeight}, ratio=${ratio}`);

      return ratio.toNumber();
    }, [chartAreaHeightPix, comparisonItems, pixelsPerMState]);

    const handleZoom = useCallback((zoomDelta: number) => {
      if (comparisonItems.length == 0) {
        return;
      }

      if (Date.now() - zoomStateRef.current.zoomStart < 66) {
        return;
      }

      const container = scrollContainerRef.current;
      if (!container) return;

      zoomStateRef.current.isZooming = true;
      zoomStateRef.current.zoomStart = Date.now();

      // 记录中心点位置
      const scrollLeftRatio = (container.scrollLeft + container.clientWidth / 2) / container.scrollWidth;

      console.log(`handleZoom方法中，开始缩放，scrollLeft：${container.scrollLeft}，scrollWidth：${container.scrollWidth}，clientWidth：${container.clientWidth}，scrollLeftRatio：${scrollLeftRatio}`);

      zoomStateRef.current.scrollLeftRatio = scrollLeftRatio;

      // 清除之前的定时器
      if (zoomIndicatorTimerRef.current) {
        clearTimeout(zoomIndicatorTimerRef.current);
      }

      // 显示缩放指示器
      setZoomIndicator({
        show: true,
        type: zoomDelta > 0 ? 'in' : 'out',
        exiting: false
      });

      // 根据滚轮方向调整缩放比例
      const currentScale = pixelsPerM;
      const newScale = currentScale + (currentScale * zoomDelta);
      console.log(`handleZoom方法中，当前缩放比例：${currentScale}，新缩放比例：${newScale}`);

      setPixelsPerMState(newScale);

      // 重新设置定时器，800ms后开始淡出
      zoomIndicatorTimerRef.current = setTimeout(() => {
        setZoomIndicator(prev => ({ ...prev, exiting: true }));
        // 再等待200ms淡出动画完成后隐藏
        setTimeout(() => {
          setZoomIndicator({ show: false, type: 'in', exiting: false });
        }, 200);
        zoomIndicatorTimerRef.current = null;
      }, 800);
    }, [pixelsPerM, comparisonItems]);

    // 添加缩放事件处理
    useEffect(() => {
      const chartArea = chartAreaRef.current;
      if (!chartArea) return;

      const handleWheel = (e: WheelEvent) => {
        // 检查是否按下了Ctrl键
        if (e.ctrlKey) {
          console.log('Ctrl key pressed, starting zoom');
          e.preventDefault(); // 阻止默认的缩放行为
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          handleZoom(delta);
        }
      }

      // 添加事件监听器
      chartArea.addEventListener('wheel', handleWheel, { passive: false });

      // 清理函数
      return () => {
        chartArea.removeEventListener('wheel', handleWheel);
      };
    }, [handleZoom]); // 移除pixelsPerM依赖以避免重复的事件绑定

    // 添加refs引用
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const characterListRef = useRef<HTMLDivElement>(null);
    const chartAreaRef = useRef<HTMLDivElement>(null);
    const toolBarRef = useRef<HTMLDivElement>(null);

    // 添加拖拽状态
    const [dragState, setDragState] = useState<DragState>({
      isDragging: false,
      draggedItemId: null,
      startMouseX: 0,
      startMouseY: 0,
      currentMouseX: 0,
      currentMouseY: 0,
      fixedElementX: 0,
      fixedElementY: 0,
      draggedElement: null,
    });

    // 添加左侧面板角色列表拖拽状态
    const [leftPanelDragState, setLeftPanelDragState] = useState<DragState>({
      isDragging: false,
      draggedItemId: null,
      startMouseX: 0,
      startMouseY: 0,
      currentMouseX: 0,
      currentMouseY: 0,
      fixedElementX: 0,
      fixedElementY: 0,
      draggedElement: null,
    });

    // 添加拖拽相关的ref
    const charactersContainerRef = useRef<HTMLDivElement>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 使用 ref 保存最新的状态，避免 handleDragMove 重新创建
    const dragStateRef = useRef(dragState);
    const comparisonItemsRef = useRef(comparisonItems);

    // 同步 ref 和 state
    useEffect(() => {
      dragStateRef.current = dragState;
    }, [dragState]);

    useEffect(() => {
      comparisonItemsRef.current = comparisonItems;
    }, [comparisonItems]);

    // 添加横向滚动状态
    const [horizontalScrollState, setHorizontalScrollState] = useState({
      isDragging: false,
      startX: 0,
      scrollLeft: 0
    });

    // 自定义滚动条状态
    const [scrollbarState, setScrollbarState] = useState({
      scrollLeft: 0,        // 当前滚动位置（从左边开始的像素距离）
      scrollWidth: 0,       // 内容的总宽度（包括不可见部分）
      clientWidth: 0,       // 容器的可见宽度（不包括滚动条）
      isDragging: false,    // 是否正在拖拽滚动条滑块
      startX: 0,           // 开始拖拽时的鼠标X坐标
      startScrollLeft: 0   // 开始拖拽时的滚动位置
    });

    const zoomStateRef = useRef({
      isZooming: false,
      scrollLeftRatio: 0,
      zoomStart: 0
    })

    // 缩放指示器状态
    const [zoomIndicator, setZoomIndicator] = useState({
      show: false,
      type: 'in' as 'in' | 'out', // 'in' 表示放大，'out' 表示缩小
      exiting: false // 是否正在退出（淡出）
    })

    // 缩放指示器定时器引用
    const zoomIndicatorTimerRef = useRef<NodeJS.Timeout | null>(null)

    // 导出功能状态
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const exportButtonRef = useRef<HTMLDivElement>(null)

    // 分享功能状态
    const [showShareDropdown, setShowShareDropdown] = useState(false)
    const [isSharing, setIsSharing] = useState(false)
    const shareButtonRef = useRef<HTMLDivElement>(null)

    // 背景设置功能状态
    const [showBackgroundDropdown, setShowBackgroundDropdown] = useState(false)
    const [showBackgroundImageUploadModal, setShowBackgroundImageUploadModal] = useState(false)
    const backgroundButtonRef = useRef<HTMLDivElement>(null)

    // 保存项目相关状态
    const [showSaveProjectDialog, setShowSaveProjectDialog] = useState(false)
    const [saveProjectTitle, setSaveProjectTitle] = useState("")
    const [isSavingProject, setIsSavingProject] = useState(false)

    // 更多选项按钮状态
    const [showMoreOptionsDropdown, setShowMoreOptionsDropdown] = useState(false)
    const moreOptionsButtonRef = useRef<HTMLDivElement>(null)

    // 缓存相关
    const cacheTimerRef = useRef<NodeJS.Timeout | null>(null)

    const [isDeskTop, setIsDeskTop] = useState(false)

    useEffect(() => {
      if (typeof window == 'undefined') return;

      const mediaQueryList = window.matchMedia('(min-width: 768px)');

      // 初始状态
      setIsDeskTop(mediaQueryList.matches);

      // 监听器
      const listener = (event: MediaQueryListEvent) => {
        setIsDeskTop(event.matches);
      };

      mediaQueryList.addEventListener('change', listener);

      return () => {
        mediaQueryList.removeEventListener('change', listener);
      };
    }, [])

    // 计算图表显示区域的像素高度
    useEffect(() => {
      const chartArea = chartAreaRef.current;
      if (!chartArea) return;

      // 初始化高度 - 使用工具函数获取内容区域高度
      const chartAreaHeightPix = getContentRect(chartArea).height;
      requestAnimationFrame(() => {
        setChartAreaHeightPix(chartAreaHeightPix);
      })

      // 创建 ResizeObserver 实例
      const resizeObserver = new ResizeObserver(([entry]) => {
        if (entry) {
          requestAnimationFrame(() => {
            const chartAreaHeightPix = entry.contentRect.height;
            setChartAreaHeightPix(chartAreaHeightPix);
          }); // 延迟执行以等待浏览器完成布局变化
        }
      });

      // 开始监听元素
      resizeObserver.observe(chartArea);

      // 清理函数
      return () => {
        resizeObserver.disconnect();
      };
    }, [isFullscreen]);

    // 监听全屏状态变化和ESC键退出全屏
    useEffect(() => {
      const handleFullscreenChange = () => {
        const isCurrentlyFullscreen = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).msFullscreenElement
        );
        setIsFullscreen(isCurrentlyFullscreen);
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isFullscreen) {
          setIsFullscreen(false);
        }
      };

      // 添加全屏变化监听器
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('msfullscreenchange', handleFullscreenChange);

      // 添加键盘监听器
      document.addEventListener('keydown', handleKeyDown);

      // 添加窗口resize监听器
      // window.addEventListener('resize', handleResize);

      return () => {
        // 清理监听器
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        document.removeEventListener('keydown', handleKeyDown);
        // window.removeEventListener('resize', handleResize);
      };
    }, [isFullscreen]);

    const midAreaRef = useRef<HTMLDivElement>(null)

    const comparisonAreaRef = useRef<HTMLDivElement>(null);

    // 添加水印到canvas
    const addWatermark = (originalCanvas: HTMLCanvasElement): HTMLCanvasElement => {
      // 付费订阅用户跳过水印
      if (isPaidSubscriber) {
        console.log('Skipping watermark for paid subscriber');
        return originalCanvas;
      }

      console.log('Adding watermark to canvas:', originalCanvas.width, 'x', originalCanvas.height);

      // 创建新的canvas来合成图像和水印
      const newCanvas = document.createElement('canvas');
      const ctx = newCanvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context');
        return originalCanvas;
      }

      // 设置新canvas的尺寸与原canvas相同
      newCanvas.width = originalCanvas.width;
      newCanvas.height = originalCanvas.height;

      // 首先绘制原始图像
      ctx.drawImage(originalCanvas, 0, 0);

      // 设置水印样式
      const fontSize = Math.max(16, Math.min(36, originalCanvas.width / 25));
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center'; // 中心对齐
      ctx.textBaseline = 'bottom';

      // 水印文本
      const watermarkText = 'compareheights.org';

      // 计算水印位置 (底部中间)
      const padding = 15;
      const x = originalCanvas.width / 2; // 水平中心
      const y = originalCanvas.height - padding; // 底部留边距

      // 测量文本尺寸
      const textMetrics = ctx.measureText(watermarkText);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;

      // 绘制半透明白色背景 (中心对齐的矩形)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(x - textWidth / 2 - 10, y - textHeight - 5, textWidth + 20, textHeight + 10);

      // 绘制水印文字 - 黑色
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText(watermarkText, x, y);

      console.log('Watermark added successfully to new canvas');
      return newCanvas;
    };

    // 导出图表为图片
    const exportChart = useCallback(async (format: 'png' | 'jpg' | 'webp' = 'png') => {
      if (!chartAreaRef.current || comparisonItems.length === 0) {
        console.warn('Chart area not found or no character data');
        return;
      }

      setIsExporting(true);

      // 让React先更新UI显示加载状态，然后再执行耗时操作
      setTimeout(async () => {
        const element = chartAreaRef.current;
        if (!element) {
          setIsExporting(false);
          return;
        }

        try {
          // 使用html2canvas进行截图，手动扩展捕获区域
          const canvas = await html2canvas(element, {
            backgroundColor: styleSettings.backgroundColor,
            useCORS: true,
            // allowTaint: true,
            // foreignObjectRendering: true,
            scale: 2,
            windowWidth: element.offsetWidth,
            // windowHeight: element.offsetHeight + 100,
            // scrollX: -20,
            // scrollY: -60,
            // onclone: (document, element) => { element.style.width = width; element.style.height = height; },
            // x: -20,  // 向左扩展20px
            // width: element.offsetWidth + 40,   // 左右各扩展20px
            y: -60,  // 向上扩展60px（包含标题）
            height: element.offsetHeight + 100, // 上下扩展100px（上60px+下40px）
            // 忽略特定元素
            ignoreElements: (element) => {
              return element.id == 'zoom-controlls' ||
                element.id == 'characters-container-scrollbar';
            },
          });

          // 添加水印后下载图片
          const canvasWithWatermark = addWatermark(canvas);
          downloadCanvas(canvasWithWatermark, format, chartTitle);

        } catch (error) {
          console.error('Export failed:', error);

          // 错误处理：提供用户友好的提示
          const errorMessage = `Image export failed. Possible reasons:
• Image resource loading issues
• Browser security restrictions

Suggested solutions:
1. Refresh the page and try again
2. Use browser screenshot function:
   - Chrome: F12 → Ctrl+Shift+P → Type "screenshot"
   - Or use system screenshot tool (Win+Shift+S)`;

          alert(t('export.exportFailed'));
        } finally {
          setIsExporting(false);
          setShowExportDropdown(false);
        }
      }, 0); // 使用0延迟，让React先完成一次渲染循环
    }, [comparisonItems, styleSettings.backgroundColor, chartTitle]);

    // 将Canvas下载为图片
    const downloadCanvas = (canvas: HTMLCanvasElement, format: 'png' | 'jpg' | 'webp', title: string) => {
      try {
        const link = document.createElement('a');
        link.download = title;

        // 根据格式设置不同的质量参数
        let dataUrl: string;
        if (format === 'jpg') {
          dataUrl = canvas.toDataURL('image/jpeg', 0.92); // 高质量JPEG
        } else if (format === 'webp') {
          dataUrl = canvas.toDataURL('image/webp', 0.95); // 高质量WebP
        } else {
          dataUrl = canvas.toDataURL('image/png'); // PNG无损
        }

        link.href = dataUrl;

        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 显示成功消息
        console.log(`Image exported as ${format.toUpperCase()} format`);

      } catch (error) {
        console.error('Download failed:', error);
        alert(t('export.downloadFailed'));
      }
    };

    // 生成分享用的 PNG 图片
    const generateShareImage = useCallback(async (): Promise<Blob | null> => {
      if (comparisonItems.length === 0) return null;

      const element = chartAreaRef.current;
      if (!element) return null;

      try {
        setIsSharing(true);

        // 使用与导出相同的配置生成图片
        const canvas = await html2canvas(element, {
          backgroundColor: styleSettings.backgroundColor,
          useCORS: true,
          // allowTaint: true,
          // foreignObjectRendering: true,
          scale: 2,
          windowWidth: element.offsetWidth,
          // windowHeight: element.offsetHeight + 100,
          // scrollX: -20,
          // scrollY: -60,
          // onclone: (document, element) => { element.style.width = width; element.style.height = height; },
          // x: -20,  // 向左扩展20px
          // width: element.offsetWidth + 40,   // 左右各扩展20px
          y: -60,  // 向上扩展60px（包含标题）
          height: element.offsetHeight + 100, // 上下扩展100px（上60px+下40px）
          // 忽略特定元素
          ignoreElements: (element) => {
            return element.id == 'zoom-controlls' ||
              element.id == 'characters-container-scrollbar';
          },
        });

        // 添加水印
        const canvasWithWatermark = addWatermark(canvas);

        // 转换为 Blob
        return new Promise((resolve) => {
          canvasWithWatermark.toBlob((blob) => {
            resolve(blob);
          }, 'image/png', 1.0);
        });
      } catch (error) {
        console.error('Failed to generate share image:', error);
        return null;
      } finally {
        setIsSharing(false);
      }
    }, [comparisonItems, styleSettings.backgroundColor, chartTitle]);

    // 生成缩略图 - 支持返回 base64 或 Blob 格式
    const generateThumbnail = useCallback(async (
      options?: { format?: 'base64' | 'blob' }
    ): Promise<string | Blob | null> => {
      const format = options?.format || 'base64'; // 默认 base64 保持向后兼容

      if (comparisonItems.length === 0) {
        console.warn('No characters to generate thumbnail');
        return null;
      }

      const element = chartAreaRef.current;
      if (!element) {
        console.warn('Chart area ref not found');
        return null;
      }

      try {
        console.log('Generating thumbnail, format:', format);

        // 使用与导出相同的配置生成图片
        const canvas = await html2canvas(element, {
          backgroundColor: styleSettings.backgroundColor,
          useCORS: true,
          scale: 2, // 2倍分辨率
          windowWidth: element.offsetWidth,
          y: -60,  // 向上扩展60px（包含标题）
          height: element.offsetHeight + 100, // 上下扩展100px
          ignoreElements: (el) => {
            return el.id === 'zoom-controlls' ||
              el.id === 'characters-container-scrollbar';
          },
        });

        // 添加水印
        const canvasWithWatermark = addWatermark(canvas);

        // 根据格式返回不同类型
        if (format === 'blob') {
          return new Promise<Blob | null>((resolve) => {
            canvasWithWatermark.toBlob(
              (blob) => {
                if (blob) {
                  console.log('Thumbnail blob generated successfully, size:', blob.size);
                  resolve(blob);
                } else {
                  console.error('Failed to convert canvas to blob');
                  resolve(null);
                }
              },
              'image/webp',
              0.85
            );
          });
        } else {
          // 默认返回 base64
          const dataUrl = canvasWithWatermark.toDataURL('image/webp', 0.85);
          console.log('Thumbnail base64 generated successfully');
          return dataUrl;
        }
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
        return null;
      }
    }, [comparisonItems, styleSettings.backgroundColor]);

    // 通过 ref 暴露方法给父组件
    React.useImperativeHandle(ref, () => ({
      generateThumbnail
    }), [generateThumbnail]);

    // 社交媒体分享配置
    const socialPlatforms = [
      {
        name: t('socialPlatformNames.twitter'),
        icon: '🐦',
        color: '#1DA1F2',
        shareUrl: (text: string, url: string) =>
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
      },
      {
        name: t('socialPlatformNames.facebook'),
        icon: '📘',
        color: '#1877F2',
        shareUrl: (text: string, url: string) =>
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`
      },
      {
        name: t('socialPlatformNames.linkedin'),
        icon: '💼',
        color: '#0A66C2',
        shareUrl: (text: string, url: string) =>
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`
      },
      {
        name: t('socialPlatformNames.reddit'),
        icon: '🔶',
        color: '#FF4500',
        shareUrl: (text: string, url: string) =>
          `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`
      },
      {
        name: t('socialPlatformNames.telegram'),
        icon: '✈️',
        color: '#0088CC',
        shareUrl: (text: string, url: string) =>
          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
      },
      {
        name: t('socialPlatformNames.whatsapp'),
        icon: '💬',
        color: '#25D366',
        shareUrl: (text: string, url: string) =>
          `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
      }
    ];

    // 生成分享文案
    const generateShareText = useCallback(() => {
      const characterNames = comparisonItems
        .slice(0, 3) // 最多显示前3个角色
        .map(item => item.character.name)
        .join(', ');

      const moreText = comparisonItems.length > 3 ? ` and ${comparisonItems.length - 3} more` : '';

      const titles = [
        `🏗️ Amazing height comparison: ${characterNames}${moreText}! 📷 Image included! Check it out at compareheights.org`,
        `📏 Mind-blowing size comparison featuring ${characterNames}${moreText}! 🖼️ See the visual scale at compareheights.org`,
        `🎯 Visual height showdown: ${characterNames}${moreText}! 📈 Compare sizes with image at compareheights.org`,
        `⚡ Epic scale comparison with ${characterNames}${moreText}! 🎆 Explore with visual at compareheights.org`,
        `🔥 Height battle: ${characterNames}${moreText}! 🎭 Discover the differences (image attached) at compareheights.org`
      ];

      // 随机选择一个标题
      return titles[Math.floor(Math.random() * titles.length)];
    }, [comparisonItems]);

    // 复制图片到剪贴板的函数
    const copyImageToClipboard = useCallback(async (imageBlob: Blob): Promise<boolean> => {
      try {
        // 检查是否支持 ClipboardItem 和图片复制
        if ('ClipboardItem' in window && navigator.clipboard.write) {
          const clipboardItem = new ClipboardItem({
            'image/png': imageBlob
          });
          await navigator.clipboard.write([clipboardItem]);
          return true;
        }
      } catch (error) {
        console.log('Clipboard image copy not supported:', error);
      }
      return false;
    }, []);

    // 处理社交媒体分享
    const handleSocialShare = useCallback(async (platform: typeof socialPlatforms[0]) => {
      const shareText = generateShareText();
      const shareUrl = 'https://compareheights.org';

      try {
        // 使用 Web Share API (如果支持)
        if (navigator.share && platform.name === 'Native') {
          const imageBlob = await generateShareImage();
          const shareData: ShareData = {
            title: t('nativeShare.title'),
            text: shareText,
            url: shareUrl
          };

          // 如果支持文件分享，添加图片
          if (imageBlob && navigator.canShare) {
            const files = [new File([imageBlob], 'height-comparison.png', { type: 'image/png' })];
            try {
              if (navigator.canShare({ files })) {
                shareData.files = files;
              }
            } catch (e) {
              // 如果 canShare 不支持 files 参数，则跳过
            }
          }

          await navigator.share(shareData);
        } else {
          // 对于其他平台，尝试多种方式分享图片
          const imageBlob = await generateShareImage();
          let shareMethod = '';

          if (imageBlob) {
            // 方法1: 尝试复制图片到剪贴板
            const clipboardSuccess = await copyImageToClipboard(imageBlob);

            if (clipboardSuccess) {
              shareMethod = 'clipboard';
              // 复制文本到剪贴板
              try {
                await navigator.clipboard.writeText(shareText);
              } catch (e) {
                console.log('Text copy failed:', e);
              }
            } else {
              // 方法2: 下载图片作为备选
              shareMethod = 'download';
              const url = URL.createObjectURL(imageBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `height-comparison-${Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
          }

          // 延迟一下确保操作完成
          await new Promise(resolve => setTimeout(resolve, 300));

          // 打开社交媒体分享页面
          const platformUrl = platform.shareUrl(shareText, shareUrl);
          window.open(platformUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');

          // 根据分享方法显示不同的提示
          setTimeout(() => {
            if (shareMethod === 'clipboard') {
              alert(t('socialPlatforms.imageAndTextCopied', { platform: platform.name }));
            } else if (shareMethod === 'download') {
              alert(t('socialPlatforms.imageDownloaded', { platform: platform.name }));
            }
          }, 500);
        }

        setShowShareDropdown(false);
      } catch (error) {
        console.error('Share failed:', error);
        // 如果分享失败，至少复制链接到剪贴板
        try {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          alert(t('socialPlatforms.shareLinkCopied'));
        } catch (clipboardError) {
          console.error('Failed to copy to clipboard:', clipboardError);
          alert(t('socialPlatforms.shareFailed', { url: shareUrl }));
        }
      }
    }, [generateShareText, generateShareImage, copyImageToClipboard]);

    // 处理复制链接
    const handleCopyLink = useCallback(async () => {
      try {
        // 使用新的分享链接功能
        const shareLink = generateShareLink();
        await navigator.clipboard.writeText(shareLink);
        setShowShareSuccess(true);
        setShowShareDropdown(false);
        setTimeout(() => setShowShareSuccess(false), 2000);
      } catch (error) {
        console.error('Failed to copy share link:', error);
        // 创建临时文本区域作为备选方案
        try {
          const shareLink = generateShareLink();
          const textArea = document.createElement('textarea');
          textArea.value = shareLink;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setShowShareSuccess(true);
          setShowShareDropdown(false);
          setTimeout(() => setShowShareSuccess(false), 2000);
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError);
          alert(t('alerts.copyFailed'));
          setShowShareDropdown(false);
        }
      }
    }, [generateShareLink]);

    // 保存按钮点击处理
    const handleSaveClick = useCallback(async () => {
      // 检查是否有角色
      if (comparisonItems.length === 0) {
        toast.error(t('toast.addCharacterFirst'));
        return;
      }

      // 1. 未登录 - 弹出登录弹窗
      if (status === "unauthenticated") {
        toast.info(t('toast.signInRequired'));

        // 确保数据已缓存
        const dataToCache: SharedData = {
          characters: comparisonItems.map(item => ({
            id: item.character.id,
            name: item.character.name,
            height: item.character.height,
            color: item.character.color || undefined,
          })),
          settings: {
            unit: unit === Unit.CM ? 'cm' : 'ft-in',
            chartTitle: chartTitle,
            backgroundColor: styleSettings.backgroundColor,
            backgroundImage: styleSettings.backgroundImage,
            gridLines: styleSettings.gridLines,
            labels: styleSettings.labels,
            shadows: styleSettings.shadows,
            theme: styleSettings.theme,
            chartHeight: styleSettings.chartHeight,
            spacing: styleSettings.spacing,
          },
        };
        heightCompareCache.save(dataToCache);

        // 弹出登录弹窗
        setShowSignModal(true);
        return;
      }

      // 2. 项目编辑页 - 调用父组件保存函数
      if (isProjectEdit && onSave) {
        await onSave();
        return;
      }

      // 3. 已登录 + 非编辑页 - 显示创建项目弹窗
      setSaveProjectTitle(chartTitle || t('saveProject.projectNamePlaceholder'));
      setShowSaveProjectDialog(true);
    }, [
      status,
      isProjectEdit,
      onSave,
      comparisonItems,
      unit,
      chartTitle,
      styleSettings,
      router
    ]);

    // 创建项目（包含封面生成和上传）
    const handleCreateProject = useCallback(async () => {
      const trimmedTitle = saveProjectTitle.trim();

      if (!trimmedTitle) {
        toast.error(t('toast.enterProjectName'));
        return;
      }

      try {
        setIsSavingProject(true);

        console.log("Creating project with title:", trimmedTitle);

        // 1. 生成封面图（Blob 格式）
        let thumbnailUrl: string | null = null;

        console.log("Generating project thumbnail...");
        const thumbnailBlob = await generateThumbnail({ format: 'blob' });

        if (thumbnailBlob && thumbnailBlob instanceof Blob) {
          try {
            // 2. 上传封面到 R2
            const { uploadThumbnailToR2 } = await import('@/lib/thumbnail-upload');
            const uploadResult = await uploadThumbnailToR2(thumbnailBlob);
            thumbnailUrl = uploadResult.publicUrl;
            console.log("Thumbnail uploaded successfully:", thumbnailUrl);
          } catch (uploadError) {
            console.error("Failed to upload thumbnail:", uploadError);
            toast.error(t('toast.thumbnailUploadFailed'));
            // 继续创建项目，封面URL为null
          }
        } else {
          console.warn("Failed to generate thumbnail, continuing without it");
        }

        // 3. 构建项目数据（只存储必要的覆盖信息）
        const projectData = {
          characters: comparisonItems.map(item => ({
            id: item.character.id,
            name: item.character.name,      // 用户自定义名称
            height: item.character.height,  // 用户自定义身高
            color: item.character.color || undefined     // 用户自定义颜色
          })),
          settings: {
            unit: unit === Unit.CM ? 'cm' : 'ft-in',
            chartTitle: chartTitle,
            backgroundColor: styleSettings.backgroundColor,
            backgroundImage: styleSettings.backgroundImage,
            gridLines: styleSettings.gridLines,
            labels: styleSettings.labels,
            shadows: styleSettings.shadows,
            theme: styleSettings.theme,
            chartHeight: styleSettings.chartHeight,
            spacing: styleSettings.spacing,
          },
        };

        // 4. 调用创建项目API
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            project_data: projectData,
            thumbnail_url: thumbnailUrl, // 传入已上传的封面URL
          }),
        });

        const result = await response.json();

        if (result.success) {
          toast.success(t('toast.projectCreated'));

          // 清除缓存
          heightCompareCache.clear();

          // 关闭弹窗
          setShowSaveProjectDialog(false);
          setSaveProjectTitle("");

          // 跳转到项目管理页面
          router.push("/dashboard/projects");
        } else {
          toast.error(result.message || t('toast.createProjectFailed'));
        }
      } catch (error) {
        console.error("Create project error:", error);
        toast.error(t('toast.createProjectFailed'));
      } finally {
        setIsSavingProject(false);
      }
    }, [
      saveProjectTitle,
      comparisonItems,
      unit,
      chartTitle,
      styleSettings,
      router,
      ref
    ]);

    // 处理更多选项按钮点击
    const handleMoreOptionsClick = useCallback(() => {
      setShowMoreOptionsDropdown(!showMoreOptionsDropdown);
    }, [showMoreOptionsDropdown]);

    // 处理更多选项外部点击
    useEffect(() => {
      if (!showMoreOptionsDropdown) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (moreOptionsButtonRef.current && !moreOptionsButtonRef.current.contains(target)) {
          setShowMoreOptionsDropdown(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showMoreOptionsDropdown]);

    const [openFullScreenLeftPanel, setOpenFullScreenLeftPanel] = useState(false);

    // 处理下载分享图片
    const handleDownloadShareImage = useCallback(async () => {
      const imageBlob = await generateShareImage();
      if (!imageBlob) {
        alert(t('alerts.generateShareImageFailed'));
        return;
      }

      try {
        const url = URL.createObjectURL(imageBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `height-comparison-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setShowShareDropdown(false);
      } catch (error) {
        console.error('Failed to download share image:', error);
        alert(t('alerts.downloadImageFailed'));
      }
    }, [generateShareImage]);

    // 处理分享下拉菜单
    const handleShareClick = useCallback(() => {
      setShowShareDropdown(!showShareDropdown);
    }, [showShareDropdown]);

    // 处理导出下拉菜单
    const handleExportClick = useCallback(() => {
      setShowExportDropdown(!showExportDropdown);
    }, [showExportDropdown]);

    // 处理背景设置下拉菜单
    const handleBackgroundClick = useCallback(() => {
      setShowBackgroundDropdown(!showBackgroundDropdown);
    }, [showBackgroundDropdown]);

    // 处理背景颜色改变
    const handleBackgroundColorChange = useCallback((color: string) => {
      setStyleSettings(prev => ({ ...prev, backgroundColor: color, backgroundImage: undefined }));
      setShowBackgroundDropdown(false);
    }, []);

    // 处理背景图片上传
    const handleBackgroundImageSave = useCallback((imageData: {
      imageUrl: string;
      heightInM: number;
      widthInM?: number;
      aspectRatio: number;
    }) => {
      setStyleSettings(prev => ({
        ...prev,
        backgroundImage: imageData.imageUrl,
        backgroundColor: '#ffffff' // 设置白色背景以防图片透明
      }));
      setShowBackgroundImageUploadModal(false);
    }, []);

    // 处理主题切换
    const handleThemeToggle = useCallback(() => {
      setStyleSettings(prev => {
        const newTheme = prev.theme === 'light' ? 'dark' : 'light';
        const newBackgroundColor = newTheme === 'dark' ? '#1a1a1a' : '#ffffff';
        return {
          ...prev,
          theme: newTheme,
          backgroundColor: prev.backgroundImage ? prev.backgroundColor : newBackgroundColor
        };
      });
    }, []);

    // 处理导出下拉菜单的外部点击
    useEffect(() => {
      if (!showExportDropdown) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;

        // 如果点击导出按钮和下拉菜单外部，则关闭下拉菜单
        if (exportButtonRef.current && !exportButtonRef.current.contains(target)) {
          setShowExportDropdown(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showExportDropdown]);

    // 处理分享下拉菜单的外部点击
    useEffect(() => {
      if (!showShareDropdown) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;

        // 如果点击分享按钮和下拉菜单外部，则关闭下拉菜单
        if (shareButtonRef.current && !shareButtonRef.current.contains(target)) {
          setShowShareDropdown(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showShareDropdown]);

    // 处理背景设置下拉菜单的外部点击
    useEffect(() => {
      if (!showBackgroundDropdown) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (backgroundButtonRef.current && !backgroundButtonRef.current.contains(target)) {
          setShowBackgroundDropdown(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showBackgroundDropdown]);

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        setIsEditingTitle(false);
      }
    };

    // 当开始编辑标题时，自动聚焦输入框
    useEffect(() => {
      if (isEditingTitle && titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, [isEditingTitle]);

    // 处理标题编辑时的全局点击事件
    useEffect(() => {
      if (!isEditingTitle) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;

        // 如果点击的不是标题输入框，则保存并退出编辑
        if (titleInputRef.current && !titleInputRef.current.contains(target)) {
          setIsEditingTitle(false);
        }
      };

      // 添加全局点击监听器
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isEditingTitle]);

    // 处理点击事件 - 修复编辑面板交互问题
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (!showRightPanel) return;

        const target = event.target as HTMLElement;

        // 检查点击是否在右侧面板内
        const isClickInRightPanel = rightPanelRef.current?.contains(target);

        // 检查点击是否在角色项目上（包括左侧库中的角色和右侧比较区的角色）
        const isClickOnCharacterItem = target.closest('[data-character-item="true"]') ||
          target.closest('.character-card');

        // 检查是否点击了编辑按钮
        const isClickOnEditButton = target.closest('button[title="Edit character"]');

        // 检查是否点击了左侧面板（整个左侧面板区域）
        const isClickOnLeftPanel = target.closest('.left-panel') ||
          target.closest('.simple-library-panel') ||
          target.closest('[data-panel="left"]');

        // 只有在点击了完全不相关的区域时才关闭面板
        if (!isClickInRightPanel && !isClickOnCharacterItem && !isClickOnEditButton && !isClickOnLeftPanel) {
          setShowRightPanel(false);
          setSelectedCharacter(null);
          setSelectedComparisonItemId(null);
          setComparisonItems(items => items.map(item => ({ ...item, selected: false })));
        }
      };

      // 添加延迟以确保其他点击事件先处理
      const delayedHandleClickOutside = (event: MouseEvent) => {
        setTimeout(() => handleClickOutside(event), 0);
      };

      // 使用 click 而不是 mousedown，避免按下鼠标就触发
      document.addEventListener('click', delayedHandleClickOutside);
      return () => {
        document.removeEventListener('click', delayedHandleClickOutside);
      };
    }, [showRightPanel]);

    // 处理拖拽开始
    const handleDragStart = useCallback((itemId: string, e: React.MouseEvent | React.TouchEvent) => {
      // 立即阻止默认行为和事件冒泡，防止触发容器的滚动
      e.preventDefault();
      e.stopPropagation();

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const container = charactersContainerRef.current;
      if (!container) return;

      const itemElement = container.querySelector(`[data-item-id="${itemId}"]`) as HTMLElement;
      if (!itemElement) return;

      const rect = itemElement.getBoundingClientRect();

      setDragState({
        isDragging: true,
        draggedItemId: itemId,
        startMouseX: clientX,
        startMouseY: clientY,
        currentMouseX: clientX,
        currentMouseY: clientY,
        fixedElementX: rect.left,
        fixedElementY: rect.top,
        draggedElement: itemElement,
      });

      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }, []);

    // 处理拖拽移动
    const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
      const currentDragState = dragStateRef.current;
      const currentComparisonItems = comparisonItemsRef.current;

      if (!currentDragState.isDragging || !currentDragState.draggedItemId) return;

      e.preventDefault();
      e.stopPropagation();

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const container = charactersContainerRef.current;
      if (!container) return;

      // 使用 requestAnimationFrame 来优化性能
      requestAnimationFrame(() => {
        // 更新当前鼠标位置
        setDragState(prev => ({
          ...prev,
          currentMouseX: clientX,
          currentMouseY: clientY
        }));
      });

      // 计算fixed拖拽元素应该与哪个占位元素交换
      const items = Array.from(container.querySelectorAll('[data-item-id]')).filter(
        item => (item as HTMLElement).getAttribute('data-item-id') !== currentDragState.draggedItemId
      );

      const draggedIndex = currentComparisonItems.findIndex(item => item.id === currentDragState.draggedItemId);
      if (draggedIndex === -1) return;

      // 获取fixed元素的边缘位置
      const dragOffsetX = clientX - currentDragState.startMouseX;
      const fixedElementWidth = currentDragState.draggedElement?.offsetWidth || 0;
      const fixedLeftEdge = currentDragState.fixedElementX + dragOffsetX;
      const fixedRightEdge = fixedLeftEdge + fixedElementWidth;

      let targetIndex = draggedIndex;
      let closestDistance = Infinity;

      items.forEach((element, originalIndex) => {
        // 需要根据原始数组找到正确的索引
        const itemId = (element as HTMLElement).getAttribute('data-item-id');
        const actualIndex = currentComparisonItems.findIndex(item => item.id === itemId);
        if (actualIndex === -1) return;

        const rect = (element as HTMLElement).getBoundingClientRect();
        const elementCenterX = rect.left + rect.width / 2;

        // 计算距离用于选择最近的目标
        const distance = Math.abs((fixedLeftEdge + fixedRightEdge) / 2 - elementCenterX);

        // 当fixed元素边缘越过其他元素中心时判断交换
        if (actualIndex !== draggedIndex && distance < closestDistance) {
          // 向右拖动：被拖角色右边缘越过右边角色中心线
          // 向左拖动：被拖角色左边缘越过左边角色中心线
          if ((actualIndex > draggedIndex && fixedRightEdge > elementCenterX) ||
            (actualIndex < draggedIndex && fixedLeftEdge < elementCenterX)) {
            targetIndex = actualIndex;
            closestDistance = distance;
          }
        }
      });

      // 如果需要交换位置，只更新占位元素的顺序
      if (targetIndex !== draggedIndex) {
        const newItems = [...currentComparisonItems];
        const [draggedItem] = newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, draggedItem);

        const updatedItems = newItems.map((item, index) => ({
          ...item,
          order: index
        }));

        setComparisonItems(updatedItems);
      }
    }, []); // 移除所有依赖，使用 ref 代替

    // 处理拖拽结束
    const handleDragEnd = useCallback((e: any) => {
      e.preventDefault();
      e.stopPropagation();

      setDragState({
        isDragging: false,
        draggedItemId: null,
        startMouseX: 0,
        startMouseY: 0,
        currentMouseX: 0,
        currentMouseY: 0,
        fixedElementX: 0,
        fixedElementY: 0,
        draggedElement: null,
        preventNextClick: true
      });

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }, []);

    // 左侧角色列表拖拽处理函数 - 实现透明占位+fixed元素方案
    const handleLeftPanelDragStart = useCallback((itemId: string, e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const container = characterListRef.current;
      if (!container) return;

      const itemElement = container.querySelector(`[data-left-item-id="${itemId}"]`) as HTMLElement;
      if (!itemElement) return;

      const rect = itemElement.getBoundingClientRect();

      // 开始拖拽：设置状态让原位置元素变透明，创建fixed元素用于显示
      setLeftPanelDragState({
        isDragging: true,
        draggedItemId: itemId,
        startMouseX: clientX,
        startMouseY: clientY,
        currentMouseX: clientX,
        currentMouseY: clientY,
        fixedElementX: rect.left,
        fixedElementY: rect.top,
        draggedElement: itemElement,
      });

      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }, []);

    const handleLeftPanelDragMove = useCallback((e: MouseEvent | TouchEvent) => {
      if (!leftPanelDragState.isDragging || !leftPanelDragState.draggedItemId) return;

      e.preventDefault();
      e.stopPropagation();

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const container = characterListRef.current;
      if (!container) return;

      setLeftPanelDragState(prev => ({
        ...prev,
        currentMouseX: clientX,
        currentMouseY: clientY
      }));

      // 获取所有角色列表项（排除正在拖拽的透明占位元素）
      const items = Array.from(container.querySelectorAll('[data-left-item-id]')).filter(
        item => (item as HTMLElement).getAttribute('data-left-item-id') !== leftPanelDragState.draggedItemId
      );

      const draggedIndex = comparisonItems.findIndex(item => item.id === leftPanelDragState.draggedItemId);
      if (draggedIndex === -1) return;

      // 计算fixed拖拽元素的实时位置（基于鼠标移动偏移）
      const dragOffsetY = clientY - leftPanelDragState.startMouseY;
      const fixedElementHeight = leftPanelDragState.draggedElement?.offsetHeight || 0;
      const fixedTopEdge = leftPanelDragState.fixedElementY + dragOffsetY;
      const fixedBottomEdge = fixedTopEdge + fixedElementHeight;

      let targetIndex = draggedIndex;
      let closestDistance = Infinity;

      items.forEach((element) => {
        const itemId = (element as HTMLElement).getAttribute('data-left-item-id');
        const actualIndex = comparisonItems.findIndex(item => item.id === itemId);
        if (actualIndex === -1) return;

        const rect = (element as HTMLElement).getBoundingClientRect();
        const elementCenterY = rect.top + rect.height / 2;

        const distance = Math.abs((fixedTopEdge + fixedBottomEdge) / 2 - elementCenterY);

        // 基于fixed元素边缘位置判断是否需要交换透明占位元素的位置
        if (actualIndex !== draggedIndex && distance < closestDistance) {
          // 向下拖动：fixed元素下边缘越过下方元素中心线时交换
          // 向上拖动：fixed元素上边缘越过上方元素中心线时交换
          if ((actualIndex > draggedIndex && fixedBottomEdge > elementCenterY) ||
            (actualIndex < draggedIndex && fixedTopEdge < elementCenterY)) {
            targetIndex = actualIndex;
            closestDistance = distance;
          }
        }
      });

      // 在透明占位元素之间执行位置交换（用户看到的是fixed元素在移动）
      if (targetIndex !== draggedIndex) {
        const newItems = [...comparisonItems];
        const [draggedItem] = newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, draggedItem);

        const updatedItems = newItems.map((item, index) => ({
          ...item,
          order: index
        }));

        setComparisonItems(updatedItems);
      }
    }, [leftPanelDragState, comparisonItems]);

    const handleLeftPanelDragEnd = useCallback((e: any) => {
      e.preventDefault();
      e.stopPropagation();

      // 拖拽结束：恢复透明占位元素的不透明度，移除fixed元素
      setLeftPanelDragState({
        isDragging: false,
        draggedItemId: null,
        startMouseX: 0,
        startMouseY: 0,
        currentMouseX: 0,
        currentMouseY: 0,
        fixedElementX: 0,
        fixedElementY: 0,
        draggedElement: null,
        preventNextClick: true
      });

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }, []);

    // 添加全局事件监听
    useEffect(() => {
      if (dragState.isDragging) {
        const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
        const handleMouseUp = (e: MouseEvent) => handleDragEnd(e);
        const handleTouchMove = (e: TouchEvent) => handleDragMove(e);
        const handleTouchEnd = (e: TouchEvent) => handleDragEnd(e);

        document.addEventListener('mousemove', handleMouseMove, { passive: false });
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
        };
      }
    }, [dragState.isDragging, handleDragMove, handleDragEnd]);

    // 添加左侧角色列表拖拽的全局事件监听
    useEffect(() => {
      if (leftPanelDragState.isDragging) {
        const handleMouseMove = (e: MouseEvent) => handleLeftPanelDragMove(e);
        const handleMouseUp = (e: MouseEvent) => handleLeftPanelDragEnd(e);
        const handleTouchMove = (e: TouchEvent) => handleLeftPanelDragMove(e);
        const handleTouchEnd = (e: TouchEvent) => handleLeftPanelDragEnd(e);

        document.addEventListener('mousemove', handleMouseMove, { passive: false });
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
        };
      }
    }, [leftPanelDragState.isDragging, handleLeftPanelDragMove, handleLeftPanelDragEnd]);

    // 计算占位元素样式（拖拽时显示为透明占位符）
    const getItemStyle = useCallback((itemId: string, index: number): React.CSSProperties => {
      if (!dragState.isDragging || itemId !== dragState.draggedItemId) {
        return {};
      }

      // 被拖拽的元素在原位置显示为透明占位符
      return {
        opacity: 0,
        visibility: 'hidden'
      };
    }, [dragState]);

    // 计算左侧面板角色列表项样式 - 实现完全透明占位
    const getLeftPanelItemStyle = useCallback((itemId: string): React.CSSProperties => {
      if (!leftPanelDragState.isDragging || itemId !== leftPanelDragState.draggedItemId) {
        return {};
      }

      // 被拖拽的元素在原位置显示为完全透明占位符（仅用于占位）
      return {
        opacity: 0,
        pointerEvents: 'none'
      };
    }, [leftPanelDragState]);

    const addToComparison = (character: Character) => {
      const name = shouldGenerateRandomName(character.id) ? generateRandomName(character.id, character.name) : character.name
      // 计算相同原始角色的数量以生成序号
      let maxSimilarNameIndex: number = -1;
      for (let i = 0; i < comparisonItems.length; i++) {
        if (comparisonItems[i].character.name.length >= name.length &&
          comparisonItems[i].character.name.startsWith(name)) {
          const indexStr = comparisonItems[i].character.name.slice(name.length);
          if (indexStr == null || indexStr == '') {
            maxSimilarNameIndex = 0;
          } else {
            try {
              const index = parseInt(indexStr);
              if (index > maxSimilarNameIndex) {
                maxSimilarNameIndex = index;
              }
            } catch (e) {
              console.warn(' addToComparison, parse name index failed: ', e);
            }
          }
        }
      }

      // 创建角色的深拷贝以避免引用同一对象
      const newCharacter: Character = {
        ...character,
        //id: `custom-${character.id}-${Date.now()}-${Math.random()}`, // 确保具有自定义前缀的唯一ID
        name: maxSimilarNameIndex == -1 ? name : `${name}${maxSimilarNameIndex + 1}`
      };

      const newItemId = `comparison-${Date.now()}-${Math.random()}`;
      const newItem: ComparisonItem = {
        id: newItemId,
        character: newCharacter,
        visible: true,
        selected: false, // 不默认选中新添加的角色
        order: comparisonItems.length
      };

      // 保持现有角色的选中状态不变
      const updatedItems = [...comparisonItems];

      setComparisonItems([...updatedItems, newItem]);

      // 不自动选中新添加的角色，也不自动显示编辑面板
    };

    const removeFromComparison = (itemId: string) => {
      setComparisonItems(comparisonItems.filter(item => item.id !== itemId));
    };

    const clearAllCharacters = () => {
      setComparisonItems([]);
      setSelectedCharacter(null);
      setSelectedComparisonItemId(null);
      setShowRightPanel(false);
    };

    const selectComparisonItem = (item: ComparisonItem) => {
      setSelectedCharacter(item.character);
      setSelectedComparisonItemId(item.id);
      setShowRightPanel(true);
      setComparisonItems(comparisonItems.map(i => ({
        ...i,
        selected: i.id === item.id
      })));
    };

    const updateCharacter = (key: string, value: any) => {
      if (!selectedCharacter || !selectedComparisonItemId) return;

      // 在比较列表中更新角色
      setComparisonItems(comparisonItems.map(item =>
        item.id === selectedComparisonItemId
          ? { ...item, character: { ...item.character, [key]: value } }
          : item
      ));

      // 更新选中的角色
      setSelectedCharacter({ ...selectedCharacter, [key]: value });
    };

    // 处理图片上传并创建角色
    const handleImageUpload = (imageData: {
      imageUrl: string;
      heightInM: number;
      widthInM?: number;
      aspectRatio: number;
    }) => {
      const { imageUrl, heightInM, widthInM, aspectRatio } = imageData;

      // 创建新角色
      const newCharacter: Character = {
        id: `upload-${Date.now()}-${Math.random()}`,
        name: t('defaults.uploadedCharacterName'),
        height: heightInM,
        // width: calculatedWidthInM,
        cat_ids: [0],
        // 媒体相关字段 - 扁平化
        media_type: 'image',
        media_url: imageUrl,
        thumbnail_url: imageUrl,
        // 外观相关字段 - 扁平化
        color: '#10B981',
        color_customizable: false,
        color_property: null
      };

      // 添加到比较列表
      addToComparison(newCharacter);

      // 关闭上传模态框
      setShowImageUploadModal(false);
    };


    // 处理横向滚动拖拽开始 - 支持鼠标和触摸
    const handleHorizontalScrollStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      const target = e.target as HTMLElement;

      // 如果点击的是滚动条元素，不拦截
      if (target.closest('#characters-container-scrollbar')) {
        return;
      }

      // 只有在没有点击角色且没有进行角色拖拽时才允许横向滚动
      if (target.closest('[data-item-id]') || dragState.isDragging) {
        return;
      }

      const container = scrollContainerRef.current;
      if (!container) return;

      // 获取触摸或鼠标位置
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

      setHorizontalScrollState({
        isDragging: true,
        startX: clientX,
        scrollLeft: container.scrollLeft
      });

      e.preventDefault();
    }, [dragState.isDragging]);

    // 处理横向滚动拖拽移动 - 支持鼠标和触摸
    const handleHorizontalScrollMove = useCallback((e: MouseEvent | TouchEvent) => {
      if (!horizontalScrollState.isDragging) return;

      const container = scrollContainerRef.current;
      if (!container) return;

      // 获取触摸或鼠标位置
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - horizontalScrollState.startX;
      container.scrollLeft = horizontalScrollState.scrollLeft - deltaX;

      e.preventDefault();
    }, [horizontalScrollState]);

    // 处理横向滚动拖拽结束
    const handleHorizontalScrollEnd = useCallback(() => {
      if (horizontalScrollState.isDragging) {
        setHorizontalScrollState(prev => ({ ...prev, isDragging: false }));
      }
    }, [horizontalScrollState.isDragging]);

    // 添加横向滚动事件监听器 - 支持鼠标和触摸
    useEffect(() => {
      if (horizontalScrollState.isDragging) {
        // 鼠标事件
        document.addEventListener('mousemove', handleHorizontalScrollMove);
        document.addEventListener('mouseup', handleHorizontalScrollEnd);
        // 触摸事件
        document.addEventListener('touchmove', handleHorizontalScrollMove, { passive: false });
        document.addEventListener('touchend', handleHorizontalScrollEnd);
        document.addEventListener('touchcancel', handleHorizontalScrollEnd);

        return () => {
          // 清理鼠标事件
          document.removeEventListener('mousemove', handleHorizontalScrollMove);
          document.removeEventListener('mouseup', handleHorizontalScrollEnd);
          // 清理触摸事件
          document.removeEventListener('touchmove', handleHorizontalScrollMove);
          document.removeEventListener('touchend', handleHorizontalScrollEnd);
          document.removeEventListener('touchcancel', handleHorizontalScrollEnd);
        };
      }
    }, [horizontalScrollState.isDragging, handleHorizontalScrollMove, handleHorizontalScrollEnd]);


    // 更新滚动条状态
    const updateScrollbarState = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      let newState = {};
      if (zoomStateRef.current.isZooming) {
        const scrollLeft = Math.max(0, Math.min(
          container.scrollWidth * zoomStateRef.current.scrollLeftRatio - container.clientWidth / 2,
          container.scrollWidth - container.clientWidth
        ));

        container.scrollLeft = scrollLeft;

        newState = {
          scrollLeft,
          scrollWidth: container.scrollWidth,
          clientWidth: container.clientWidth
        };
        setScrollbarState(prev => {
          return {
            ...prev,
            ...newState
          }
        });
        zoomStateRef.current.isZooming = false;
      } else {
        newState = {
          scrollLeft: container.scrollLeft,
          scrollWidth: container.scrollWidth,
          clientWidth: container.clientWidth
        };
        setScrollbarState(prev => ({
          ...prev,
          ...newState
        }));
      }
    };

    // 监听容器滚动和大小变化
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // 初始更新
      updateScrollbarState();

      // 监听滚动事件
      const handleScroll = () => {
        updateScrollbarState();
      };

      container.addEventListener('scroll', handleScroll);

      let charactersContainerResizeObserver: ResizeObserver | null = null;

      if (charactersContainerRef.current) {
        charactersContainerResizeObserver = new ResizeObserver((entries) => {
          if (entries.length > 0) {
            updateScrollbarState();
          }
        });

        charactersContainerResizeObserver.observe(charactersContainerRef.current);
      }

      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (charactersContainerResizeObserver) {
          charactersContainerResizeObserver.disconnect();
        }
      };
    }, [comparisonItems.length]);

    // 处理自定义滚动条拖拽 - 支持鼠标和触摸
    const handleScrollbarDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      // 立即阻止默认行为和事件冒泡
      e.preventDefault();
      e.stopPropagation();

      // 获取触摸或鼠标位置
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

      setScrollbarState(prev => ({
        ...prev,
        isDragging: true,
        startX: clientX,
        startScrollLeft: prev.scrollLeft
      }));
    }, []);

    const handleScrollbarDragMove = useCallback((e: MouseEvent | TouchEvent) => {
      if (!scrollbarState.isDragging) return;

      const container = scrollContainerRef.current;
      if (!container) return;

      // 获取触摸或鼠标位置
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

      const deltaX = clientX - scrollbarState.startX;
      const scrollbarTrackWidth = container.clientWidth;
      const thumbWidth = Math.max(20, (scrollbarState.clientWidth / scrollbarState.scrollWidth) * scrollbarTrackWidth);
      const maxThumbPosition = scrollbarTrackWidth - thumbWidth;
      const scrollRatio = deltaX / maxThumbPosition;
      const maxScrollLeft = scrollbarState.scrollWidth - scrollbarState.clientWidth;

      const newScrollLeft = Math.max(0, Math.min(maxScrollLeft, scrollbarState.startScrollLeft + (scrollRatio * maxScrollLeft)));
      container.scrollLeft = newScrollLeft;

      e.preventDefault();
    }, [scrollbarState]);

    const handleScrollbarDragEnd = useCallback(() => {
      setScrollbarState(prev => ({ ...prev, isDragging: false }));
    }, []);

    // 监听滚动条拖拽事件 - 支持鼠标和触摸
    useEffect(() => {
      if (scrollbarState.isDragging) {
        // 鼠标事件
        document.addEventListener('mousemove', handleScrollbarDragMove);
        document.addEventListener('mouseup', handleScrollbarDragEnd);
        // 触摸事件
        document.addEventListener('touchmove', handleScrollbarDragMove, { passive: false });
        document.addEventListener('touchend', handleScrollbarDragEnd);
        document.addEventListener('touchcancel', handleScrollbarDragEnd);

        return () => {
          // 清理鼠标事件
          document.removeEventListener('mousemove', handleScrollbarDragMove);
          document.removeEventListener('mouseup', handleScrollbarDragEnd);
          // 清理触摸事件
          document.removeEventListener('touchmove', handleScrollbarDragMove);
          document.removeEventListener('touchend', handleScrollbarDragEnd);
          document.removeEventListener('touchcancel', handleScrollbarDragEnd);
        };
      }
    }, [scrollbarState.isDragging, handleScrollbarDragMove, handleScrollbarDragEnd]);

    // 计算滚动条滑块位置和大小
    const getScrollbarThumbStyle = useCallback(() => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollbarState;

      if (scrollWidth <= clientWidth) {
        return { display: 'none' };
      }

      const trackWidth = clientWidth;
      const thumbWidth = Math.max(20, (clientWidth / scrollWidth) * trackWidth);
      const maxScrollLeft = scrollWidth - clientWidth;
      const thumbPosition = maxScrollLeft > 0 ? (scrollLeft / maxScrollLeft) * (trackWidth - thumbWidth) : 0;

      return {
        width: `${thumbWidth}px`,
        transform: `translateX(${thumbPosition}px)`,
        display: 'block'
      };
    }, [scrollbarState]);

    // 组件卸载时清理定时器
    useEffect(() => {
      return () => {
        if (zoomIndicatorTimerRef.current) {
          clearTimeout(zoomIndicatorTimerRef.current);
        }
        if (cacheTimerRef.current) {
          clearTimeout(cacheTimerRef.current);
        }
      };
    }, []);

    return (
      <div id="height-compare-tool" className="w-full relative flex flex-col lg:flex-row bg-neutral-50 overflow-hidden">
        {/* 新的模块化左侧面板 - 分享模式下隐藏 */}
        {!shareMode && (
          <LeftPanel
            ref={characterListRef}
            unit={unit}
            onUnitChange={setUnit}
            comparisonItems={comparisonItems}
            onCharacterAdd={addToComparison}
            onImageUpload={() => setShowImageUploadModal(true)}
            onSelectItem={selectComparisonItem}
            onRemoveItem={removeFromComparison}
            onDragStart={handleLeftPanelDragStart}
            getItemStyle={getLeftPanelItemStyle}
            className={`order-2 lg:order-1 h-[700px] lg:h-auto lg:flex-1 w-full lg:!w-1/5 bg-white border-r border-neutral-200 flex flex-col left-panel`}
          />
        )}


        {/* 中间图表区域 */}
        < div ref={midAreaRef} className={`order-1 lg:order-2 py-0 px-0 lg:px-2 flex flex-col transition-all duration-300 ${shareMode ? 'w-full' : 'w-full lg:w-4/5'} h-full bg-pattern text-sm lg:text-base`}>
          <div id="top-ads" className="w-full h-[110px] m-0 py-[5px]"></div>
          <div ref={comparisonAreaRef} className='relative w-full flex'>

            {/* 全屏模式下的左侧面板 - 分享模式下隐藏 */}
            {!shareMode && isFullscreen && openFullScreenLeftPanel && (
              <LeftPanel
                ref={characterListRef}
                unit={unit}
                onUnitChange={setUnit}
                comparisonItems={comparisonItems}
                onCharacterAdd={addToComparison}
                onImageUpload={() => setShowImageUploadModal(true)}
                onSelectItem={selectComparisonItem}
                onRemoveItem={removeFromComparison}
                onDragStart={handleLeftPanelDragStart}
                getItemStyle={getLeftPanelItemStyle}
                className="fixed top-0 left-0 z-[1000] w-80 h-full py-2 bg-white border-r border-neutral-200 flex flex-col left-panel"
                withCollaspseButton={true}
                onCollapse={(e) => setOpenFullScreenLeftPanel(false)}
              />
            )}

            <div className={`flex-1 flex flex-col w-full relative`}>
              {/* 工具栏 */}
              <div ref={toolBarRef} className={`flex justify-between items-center px-1 md:px-2 py-2 md:py-4 toolbar-enhanced w-full ${themeClasses.bg.primary}`}>
                <button
                  title={t('toolbar.openFullScreenLeftPanel')}
                  className={`flex justify-start items-center ${isFullscreen && !openFullScreenLeftPanel ? '' : 'invisible'}`}
                  onClick={(e) => setOpenFullScreenLeftPanel(true)}
                >
                  <Menu size={20} {...(styleSettings.theme === 'dark' && { color: '#ffffff' })} />
                </button>
                <div className="flex items-center justify-end">
                  <div className="flex items-center gap-2">
                    {/* 保存按钮 - 分享模式下禁用 */}
                    <button
                      onClick={handleSaveClick}
                      className={`p-1 md:p-2 rounded transition-all duration-300 ${comparisonItems.length === 0 || shareMode
                        ? `${themeClasses.bg.secondary} ${themeClasses.text.muted} cursor-not-allowed`
                        : `pulse-on-hover cursor-pointer ${themeClasses.button.base} ${themeClasses.button.hover}`
                        }`}
                      title={shareMode ? t('toolbar.saveDisabledInShareMode') : t('toolbar.saveProject')}
                      disabled={comparisonItems.length === 0 || shareMode}
                    >
                      <Save className="w-4 h-4" />
                    </button>

                    {/* 单位切换按钮 */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setUnit(unit === Unit.CM ? Unit.FT_IN : Unit.CM)}
                        className={`flex items-center gap-1.5 p-1 md:p-2 ${themeClasses.button.base} ${themeClasses.button.hover} rounded-lg text-label-md transition-all duration-300 cursor-pointer`}
                        title={unit === Unit.CM ? t('toolbar.switchToFt') : t('toolbar.switchToCm')}
                      >
                        <span className={unit === Unit.CM ? 'text-green-theme-600 font-bold' : themeClasses.text.secondary}>cm</span>
                        <ArrowLeftRight className={`w-3.5 h-3.5 ${themeClasses.text.muted}`} />
                        <span className={unit === Unit.FT_IN ? 'text-green-theme-600 font-bold' : themeClasses.text.secondary}>ft</span>
                      </button>
                    </div>
                    <button
                      onClick={resetZoom}
                      className={`p-1 md:p-2 rounded transition-all duration-300 pulse-on-hover ${pixelsPerMState === 1
                        ? `${themeClasses.bg.secondary} ${themeClasses.text.muted} cursor-not-allowed`
                        : `${themeClasses.button.base} ${themeClasses.button.hover} cursor-pointer`
                        }`}
                      title={t('toolbar.resetZoom')}
                      disabled={pixelsPerMState === 1}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    {/* 清空按钮 - 分享模式下禁用 */}
                    <button
                      onClick={() => {
                        console.log('Clear button clicked, current character count:', comparisonItems.length);
                        clearAllCharacters();
                      }}
                      className={`p-1 md:p-2 rounded transition-all duration-300 ${comparisonItems.length === 0 || shareMode
                        ? `${themeClasses.bg.secondary} ${themeClasses.text.muted} cursor-not-allowed`
                        : `pulse-on-hover cursor-pointer ${themeClasses.button.base} ${themeClasses.button.hover}`
                        }`}
                      title={shareMode ? t('toolbar.clearDisabledInShareMode') : t('toolbar.clearAll')}
                      disabled={comparisonItems.length === 0 || shareMode}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* 主题切换按钮 */}
                    <button
                      onClick={handleThemeToggle}
                      className={`p-1 md:p-2 rounded cursor-pointer transition-all duration-300 pulse-on-hover ${themeClasses.button.base} ${themeClasses.button.hover}`}
                      title={styleSettings.theme === 'light' ? t('toolbar.darkTheme') : t('toolbar.lightTheme')}
                    >
                      {styleSettings.theme === 'light' ? (
                        <Moon className="w-4 h-4" />
                      ) : (
                        <Sun className="w-4 h-4" />
                      )}
                    </button>

                    {/* 全屏按钮 */}
                    <button
                      onClick={toggleFullscreen}
                      className={`p-1 md:p-2 rounded cursor-pointer transition-all duration-300 pulse-on-hover ${themeClasses.button.base} ${themeClasses.button.hover}`}
                      title={isFullscreen ? t('toolbar.exitFullscreen') : t('toolbar.enterFullscreen')}
                    >
                      {isFullscreen ? (
                        <Minimize className="w-4 h-4" />
                      ) : (
                        <Maximize className="w-4 h-4" />
                      )}
                    </button>

                    {/* 导出按钮 - 带下拉菜单 */}
                    <div className="relative" ref={exportButtonRef}>
                      <button
                        onClick={handleExportClick}
                        className={`p-1 md:p-2 rounded transition-all duration-300 cursor-pointer pulse-on-hover disabled:opacity-50 ${comparisonItems.length === 0
                          ? `${themeClasses.bg.secondary} ${themeClasses.text.muted} cursor-not-allowed`
                          : showExportDropdown
                            ? themeClasses.button.active
                            : `${themeClasses.button.base} ${themeClasses.button.hover}`
                          }`}
                        title={comparisonItems.length === 0 ? t('chartArea.addCharactersFirst') : t('toolbar.exportImage')}
                        disabled={comparisonItems.length === 0 || isExporting}
                      >
                        {isExporting ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>

                      {/* 导出格式下拉菜单 */}
                      {showExportDropdown && (
                        <div className={`absolute top-full right-0 mt-1 ${themeClasses.bg.primary} ${themeClasses.border.primary} border rounded-lg shadow-lg z-[99999]`}>
                          <div className="py-1">
                            <button
                              onClick={() => exportChart('png')}
                              disabled={isExporting}
                              className={`w-full px-4 py-2 text-left text-sm ${themeClasses.text.primary} hover:bg-green-theme-50 hover:text-green-theme-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-300`}
                              title='High quality, transparent background'
                            >
                              <span className="mr-3">🖼️</span>
                              <div className="font-medium">PNG</div>
                            </button>
                            <button
                              onClick={() => exportChart('jpg')}
                              disabled={isExporting}
                              className={`w-full px-4 py-2 text-left text-sm ${themeClasses.text.primary} hover:bg-green-theme-50 hover:text-green-theme-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-300`}
                              title='Smaller file size, easy to share'
                            >
                              <span className="mr-3">📷</span>
                              <div className="font-medium">JPG</div>
                            </button>
                            <button
                              onClick={() => exportChart('webp')}
                              disabled={isExporting}
                              className={`w-full px-4 py-2 text-left text-sm ${themeClasses.text.primary} hover:bg-green-theme-50 hover:text-green-theme-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-300`}
                              title='Modern format, high compression'
                            >
                              <span className="mr-3">🌐</span>
                              <div className="font-medium">WebP</div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 分享按钮和下拉菜单 */}
                    <div className="relative" ref={shareButtonRef}>
                      <button
                        onClick={handleShareClick}
                        disabled={comparisonItems.length === 0 || isSharing}
                        className={`p-1 md:p-2 rounded ${themeClasses.button.base} ${themeClasses.button.hover} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300`}
                        title={t('toolbar.shareComparison')}
                      //onMouseEnter={() => setShowShareDropdown(true)}
                      >
                        {isSharing ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>

                      {/* 分享下拉菜单 */}
                      {showShareDropdown && (
                        <div className={`absolute top-full right-0 mt-1 ${themeClasses.bg.primary} ${themeClasses.border.primary} border rounded-lg shadow-lg z-[99999] min-w-[200px]`}>
                          <div className="py-2">
                            {/* 新增: Share Project 选项 */}
                            {!shareMode && (
                              <>
                                <button
                                  onClick={async () => {
                                    if (projectUuid) {
                                      // 在项目中，生成分享链接并复制
                                      const shareUrl = `${window.location.origin}/share/project/${projectUuid}`;
                                      const success = await copyToClipboard(shareUrl);
                                      if (success) {
                                        toast.success(t('share.shareLinkCopied'));
                                      } else {
                                        toast.error(t('share.copyFailed'));
                                      }
                                    } else {
                                      // 不在项目中，提示先保存
                                      toast.info(t('toast.saveFirst'));
                                    }
                                    setShowShareDropdown(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm ${themeClasses.text.primary} hover:bg-blue-50 hover:text-blue-600 flex items-center transition-colors`}
                                  title={t('share.saveAndShare')}
                                >
                                  <span className="mr-3">💾</span>
                                  <div>
                                    <div className="font-medium">{t('share.shareProject')}</div>
                                    <div className={`text-xs ${themeClasses.text.muted}`}>{t('share.saveAndGetLink')}</div>
                                  </div>
                                </button>
                                <div className={`border-t ${themeClasses.border.primary} my-2`}></div>
                              </>
                            )}

                            {/* 社交媒体平台 */}
                            <div className={`px-3 py-1 text-xs font-medium ${themeClasses.text.muted} uppercase tracking-wide`}>{t('share.shareSnapshot')}</div>
                            {socialPlatforms.map((platform) => (
                              <button
                                key={platform.name}
                                onClick={() => handleSocialShare(platform)}
                                className={`w-full px-4 py-2 text-left text-sm ${themeClasses.text.primary} hover:bg-blue-50 hover:text-blue-600 flex items-center`}
                                title={`Share on ${platform.name}`}
                              >
                                <span className="mr-3 text-base" style={{ color: platform.color }}>{platform.icon}</span>
                                <div className="font-medium">{platform.name}</div>
                              </button>
                            ))}

                            <div className={`border-t ${themeClasses.border.primary} my-2`}></div>

                            {/* 其他分享选项 */}
                            <div className={`px-3 py-1 text-xs font-medium ${themeClasses.text.muted} uppercase tracking-wide`}>{t('share.otherOptions')}</div>

                            {/* 原生分享 API (如果支持) */}
                            <button
                              onClick={() => handleSocialShare({ name: 'Native', icon: '📱', color: '#666', shareUrl: () => '' })}
                              className={`w-full px-4 py-2 text-left text-sm ${themeClasses.text.primary} hover:bg-blue-50 hover:text-blue-600 flex items-center`}
                              title={t('share.nativeShare')}
                            >
                              <span className="mr-3">📱</span>
                              <div className="font-medium">{t('share.nativeShare')}</div>
                            </button>

                            <button
                              onClick={handleCopyLink}
                              className={`w-full px-4 py-2 text-left text-sm ${themeClasses.text.primary} hover:bg-blue-50 hover:text-blue-600 flex items-center`}
                              title={t('share.copyShareLink')}
                            >
                              <span className="mr-3">📎</span>
                              <div className="font-medium">
                                {showShareSuccess ? t('share.linkCopied') : t('share.copyShareLink')}
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 更多选项按钮 (网格和背景移到这里) - 移到最右侧 */}
                    <div className="relative" ref={moreOptionsButtonRef}>
                      <button
                        onClick={handleMoreOptionsClick}
                        className={`p-1 md:p-2 rounded transition-all duration-300 pulse-on-hover cursor-pointer ${showMoreOptionsDropdown
                          ? themeClasses.button.active
                          : `${themeClasses.button.base} ${themeClasses.button.hover}`
                          }`}
                        title={t('toolbar.moreOptions')}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* 更多选项下拉菜单 */}
                      {showMoreOptionsDropdown && (
                        <div className={`absolute top-full right-0 mt-1 ${themeClasses.bg.primary} ${themeClasses.border.primary} border rounded-lg shadow-lg z-[99999] min-w-[200px]`}>
                          <div className="py-2">
                            {/* 网格显隐 */}
                            <button
                              onClick={() => {
                                setStyleSettings({ ...styleSettings, gridLines: !styleSettings.gridLines });
                                setShowMoreOptionsDropdown(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm ${themeClasses.text.primary} hover:bg-green-theme-50 hover:text-green-theme-600 flex items-center justify-between transition-colors cursor-pointer`}
                            >
                              <div className="flex items-center">
                                <Grid className="w-4 h-4 mr-3" />
                                <span className="font-medium">{t('toolbar.gridLines')}</span>
                              </div>
                              {styleSettings.gridLines && <span className="text-green-theme-600">✓</span>}
                            </button>

                            {/* 背景设置 - 分享模式下隐藏 */}
                            {!shareMode && (
                              <button
                                onClick={() => {
                                  setShowBackgroundDropdown(true);
                                  setShowMoreOptionsDropdown(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-sm ${themeClasses.text.primary} hover:bg-green-theme-50 hover:text-green-theme-600 flex items-center transition-colors cursor-pointer`}
                              >
                                <Palette className="w-4 h-4 mr-3" />
                                <span className="font-medium">{t('toolbar.backgroundSettings')}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 背景设置下拉菜单（保持原有功能） - 分享模式下隐藏 */}
                      {!shareMode && showBackgroundDropdown && (
                        <div ref={backgroundButtonRef}
                          className="absolute top-full right-0 z-[99999]">
                          {/* 背景设置下拉菜单 */}
                          {showBackgroundDropdown && (
                            <div className={`absolute top-full right-0 mt-1 ${themeClasses.bg.primary} ${themeClasses.border.primary} border rounded-lg shadow-lg z-[99999] min-w-[180px]`}>
                              <div className="py-2">
                                {/* 纯色背景选项 */}
                                <div className={`px-3 py-1 text-xs font-medium ${themeClasses.text.muted} uppercase tracking-wide`}>{t('backgroundSettings.solidColors')}</div>
                                <div className="px-3 py-2 grid grid-cols-5 gap-2">
                                  {[
                                    '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#adb5bd',
                                    '#6c757d', '#495057', '#343a40', '#212529', '#000000',
                                    '#fff3cd', '#ffeaa7', '#fdcb6e', '#e17055', '#d63031',
                                    '#fd79a8', '#fdcb6e', '#00b894', '#00cec9', '#0984e3',
                                    '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e', '#55a3ff'
                                  ].map((color) => (
                                    <button
                                      key={color}
                                      onClick={() => handleBackgroundColorChange(color)}
                                      className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 transition-colors"
                                      style={{ backgroundColor: color }}
                                      title={t('backgroundSettings.setBackgroundTo', { color })}
                                    />
                                  ))}
                                </div>

                                <div className={`border-t ${themeClasses.border.primary} my-2`}></div>

                                {/* 图片上传选项 */}
                                <div className={`px-3 py-1 text-xs font-medium ${themeClasses.text.muted} uppercase tracking-wide`}>{t('backgroundSettings.backgroundImage')}</div>
                                <button
                                  onClick={() => {
                                    setShowBackgroundImageUploadModal(true);
                                    setShowBackgroundDropdown(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm ${themeClasses.text.primary} hover:bg-green-theme-50 hover:text-green-theme-600 flex items-center`}
                                  title={t('backgroundSettings.uploadImage')}
                                >
                                  <span className="mr-3">🖼️</span>
                                  <div className="font-medium">{t('backgroundSettings.uploadImage')}</div>
                                </button>

                                {/* 移除背景选项 */}
                                {styleSettings.backgroundImage && (
                                  <button
                                    onClick={() => handleBackgroundColorChange('#ffffff')}
                                    className={`w-full px-4 py-2 text-left text-sm ${themeClasses.text.primary} hover:bg-red-50 hover:text-red-600 flex items-center`}
                                    title="Remove background image"
                                  >
                                    <span className="mr-3">🗑️</span>
                                    <div className="font-medium">Remove Background</div>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 中间角色对比展示图表区 */}
              <div
                className="w-full flex-1 px-0 md:px-4 pb-4 md:pb-8 pt-12 thin-scrollbar relative"
                style={{
                  backgroundColor: styleSettings.backgroundColor,
                  backgroundImage: styleSettings.backgroundImage ? `url(${styleSettings.backgroundImage})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  height: `calc(100% - 16px)`
                }}
              >
                <div
                  ref={chartAreaRef}
                  className={`relative px-[55px] md:px-20 w-full ${isFullscreen ? "" : "aspect-[5/3] md:aspect-[5/2]"} flex items-end justify-center`}
                  // style={{ height: chartAreaHeightPix }}
                  {...(isFullscreen && toolBarRef.current && { style: { height: window.innerHeight - toolBarRef.current.offsetHeight - 100 } })}
                >
                  {/* 图表标题 - 可编辑 */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 cursor-text">
                    {isEditingTitle ? (
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={chartTitle}
                        onChange={(e) => setChartTitle(e.target.value)}
                        onBlur={() => setIsEditingTitle(false)}
                        onKeyDown={handleTitleKeyDown}
                        className={`text-base md:text-lg font-medium ${themeClasses.text.primary} bg-transparent border ${themeClasses.border.secondary} rounded px-3 py-1 text-center min-w-[300px] max-w-[50vw] focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-transparent`}
                        placeholder={t('chartArea.enterChartTitle')}
                      />
                    ) : (
                      <h2
                        onClick={() => setIsEditingTitle(true)}
                        className={`text-base md:text-lg font-medium ${themeClasses.text.primary} bg-transparent rounded px-3 py-1 transition-colors border border-transparent ${themeClasses.border.primary} hover:border-opacity-50 max-w-[50vw] break-words text-center`}
                        title={t('chartArea.clickToEditTitle')}
                      >
                        {chartTitle}
                      </h2>
                    )}
                  </div>

                  {/* 缩放控件 */}
                  <div id="zoom-controlls" className="absolute -top-2 right-[3.5rem] md:right-20 z-[11] flex flex-col gap-1">
                    <div className="relative group">
                      <button
                        onClick={() => handleZoom(0.2)}
                        className={`p-1 md:p-2 rounded ${themeClasses.bg.secondary} ${themeClasses.text.secondary} hover:text-green-theme-600 zoom-control-enhanced`}
                        title={t('chartArea.zoomIn')}
                      >
                        <ZoomIn className={`w-4 h-4`} />
                      </button>
                      {/* 自定义tooltip */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-full top-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[1003]">
                        <div className={`${themeClasses.bg.primary} ${themeClasses.text.primary} text-xs rounded py-1 px-2 whitespace-nowrap`}>
                          Zoom in (hold Ctrl + scroll for quick zoom)
                        </div>
                      </div>
                    </div>
                    <div className="relative group">
                      <button
                        onClick={() => handleZoom(-0.2)}
                        className={`p-1 md:p-2 rounded ${themeClasses.bg.secondary} ${themeClasses.text.secondary} hover:text-green-theme-600 zoom-control-enhanced`}
                        title={t('chartArea.zoomOut')}
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      {/* 自定义tooltip */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 translate-y-full bottom-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[1003]">
                        <div className={`${themeClasses.bg.primary} ${themeClasses.text.primary} text-xs rounded py-1 px-2 whitespace-nowrap`}>
                          Zoom out (hold Ctrl + scroll for quick zoom)
                          <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent ${styleSettings.theme === 'dark' ? 'border-t-gray-200' : 'border-t-gray-800'}`}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 缩放指示器 - 显示在图表中心 */}
                  {zoomIndicator.show && (
                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-[1004] transition-opacity duration-200 ${zoomIndicator.exiting ? 'opacity-0' : 'opacity-100'
                      }`}>
                      <div className={`${styleSettings.theme === 'dark' ? 'bg-gray-800/80 text-gray-200 border-gray-600' : 'bg-white/80 text-gray-700 border-gray-200'} rounded-full p-2 shadow-lg border`}>
                        {zoomIndicator.type === 'in' ? (
                          <ZoomIn className="w-6 h-6" />
                        ) : (
                          <ZoomOut className="w-6 h-6" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* 网格线 */}
                  {styleSettings.gridLines && (() => {
                    // 计算最大高度用于确定统一的单位制
                    const maxHeightInComparison = getMaxHeightInComparison(comparisonItems);
                    const unifiedMetricUnit = getBestUnit(maxHeightInComparison, true);

                    return (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* 动态单位标签 */}
                        <div className="absolute top-0 left-0 w-full">
                          <span className={`absolute left-2 -top-9 text-sm font-bold ${themeClasses.text.primary}`}>
                            Metric ({unifiedMetricUnit})
                          </span>
                          <span className={`absolute right-2 -top-9 text-sm font-bold ${themeClasses.text.primary}`}>
                            Imperial ({getImperialGridUnitLabel(maxHeightInComparison)})
                          </span>
                        </div>

                        {Array.from({ length: chartAreaHeightPix > 500 ? 21 : 11 }, (_, i) => {
                          const heightPercentage = i / (chartAreaHeightPix > 500 ? 20 : 10);
                          const pixHeight = chartAreaHeightPix * heightPercentage;

                          // 使用高精度计算
                          const pixHeightPrecision = Precision.from(pixHeight);
                          const pixelsPerMPrecision = Precision.from(pixelsPerM);
                          const mHeight = pixHeightPrecision.divide(pixelsPerMPrecision).toNumber();

                          // 使用统一的单位制进行转换
                          const metricResult = convertHeightPrecision(mHeight, unifiedMetricUnit);
                          const imperialDisplay = convertHeightForGridImperial(mHeight, maxHeightInComparison);

                          return (
                            <div
                              key={i}
                              className={`absolute left-0 w-full border-t ${themeClasses.border.secondary}`}
                              style={{ bottom: `${heightPercentage * 100}%` }}
                            >
                              {styleSettings.labels && (
                                <>
                                  <span className={`absolute left-2 top-0 -translate-y-1/2 text-xs ${themeClasses.text.secondary}`}>
                                    {metricResult.formatted}
                                  </span>
                                  <span className={`absolute right-2 top-0 -translate-y-1/2 text-xs ${themeClasses.text.secondary}`}>
                                    {imperialDisplay}
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* 角色展示 */}
                  <div className="relative w-full h-full p-0 m-0">
                    {/* 角色展示区域 */}
                    <div ref={scrollContainerRef}
                      className="w-full overflow-auto custom-scrollbar h-full"
                      // 这里使用数值来设置容器高度，是为了防止内部内容变大时把容器撑大。h-full（即height: 100%;）会自动撑大容器。
                      // style={{ height: chartAreaHeightPix }}
                      onMouseDown={handleHorizontalScrollStart}
                      onTouchStart={handleHorizontalScrollStart}
                    >
                      {isLoadingShareData ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-theme-600 mb-4"></div>
                          <p className="text-lg text-center px-2">{t('chartArea.loadingData')}</p>
                        </div>
                      ) : comparisonItems.length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-end text-gray-500">
                          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg text-center px-2">{t('chartArea.emptyState')}</p>
                        </div>
                      ) : (
                        <div
                          ref={charactersContainerRef}
                          className="w-fit h-full flex items-end justify-start mx-auto"
                          onMouseEnter={(e) => {
                            const target = e.target as HTMLElement;
                            if (!target.closest('[data-item-id]')) {
                              target.style.cursor = horizontalScrollState.isDragging ? 'grabbing' : 'grab';
                            }
                          }}
                          onMouseLeave={(e) => {
                            const target = e.target as HTMLElement;
                            target.style.cursor = '';
                          }}
                          onMouseMove={(e) => {
                            const target = e.target as HTMLElement;
                            if (!target.closest('[data-item-id]')) {
                              target.style.cursor = horizontalScrollState.isDragging ? 'grabbing' : 'grab';
                            } else {
                              target.style.cursor = '';
                            }
                          }}
                        >
                          {comparisonItems
                            .filter(item => item.visible)
                            .sort((a, b) => a.order - b.order)
                            .map((item, index) => (
                              <div
                                key={item.id}
                                data-item-id={item.id}
                                className={`flex flex-col items-center px-3 relative ${dragState.draggedItemId === item.id ? 'dragging-item' : ''}`}
                                style={getItemStyle(item.id, index)}
                                onClick={(e) => {
                                  // 如果是拖拽后的点击，阻止事件
                                  if (dragState.preventNextClick) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDragState(prev => ({ ...prev, preventNextClick: false }));
                                    return;
                                  }
                                  if (!dragState.isDragging) {
                                    selectComparisonItem(item);
                                  }
                                }}
                              >
                                <CharacterDisplay
                                  character={item.character}
                                  pixelsPerM={pixelsPerM}
                                  isSelected={item.selected}
                                  unit={unit}
                                  isDragging={dragState.draggedItemId === item.id}
                                  theme={styleSettings.theme}
                                  onEdit={() => !dragState.isDragging && selectComparisonItem(item)}
                                  onMove={(e) => handleDragStart(item.id, e)}
                                  onDelete={() => !dragState.isDragging && removeFromComparison(item.id)}
                                />
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* 自定义横向滚动条 */}
                    {comparisonItems.length > 0 && scrollbarState.scrollWidth > scrollbarState.clientWidth && (
                      <div id='characters-container-scrollbar' className="absolute bottom-[-16px] md:bottom-[-11px] left-0 h-[15px] md:h-[10px] bg-gray-100 rounded-full mx-2 mt-2" 
                        style={{ 
                          touchAction: 'none' 
                          }}
                      >
                        {/* 滚动条轨道 */}
                        <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                        {/* 滚动条滑块 */}
                        <div
                          className={`absolute top-0 h-full bg-gray-400 rounded-full transition-colors cursor-pointer ${scrollbarState.isDragging ? 'bg-gray-600' : 'hover:bg-gray-500'
                            }`}
                          style={{
                            ...getScrollbarThumbStyle(),
                            touchAction: 'none'
                          }}
                          onMouseDown={handleScrollbarDragStart}
                          onTouchStart={handleScrollbarDragStart}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
                {/* 网站水印 */}
                {/* <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-between bg-transparent border-none opacity-50 z-[10] ${themeClasses.text.primary}`}>CompareHeights.org</div> */}
              </div>
            </div>
            {/* 右侧编辑面板 - 固定在最右侧 */}
            {showRightPanel && selectedCharacter && (
              <div ref={rightPanelRef} className={`absolute right-0 top-0 h-full w-[300px] bg-white shadow-xl z-[1003] overflow-y-auto border-l border-gray-200 thin-scrollbar transition-transform duration-300`}>
                <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t('characterPanel.characterDetails')}</h3>
                    <button
                      onClick={() => {
                        setShowRightPanel(false)
                        setSelectedCharacter(null)
                        setSelectedComparisonItemId(null)
                        setComparisonItems(prev => prev.map(item => ({ ...item, selected: false })))
                      }}
                      className="text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                    >
                      <span className="text-xl">×</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label htmlFor="character-name" className="block text-label-md text-gray-700 mb-1">{t('characterPanel.name')}</label>
                    <input
                      id="character-name"
                      type="text"
                      value={selectedCharacter.name}
                      onChange={(e) => updateCharacter('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('characterPanel.namePlaceholder')}
                    />
                  </div>

                  <div>
                    <HeightInput
                      value={selectedCharacter.height}
                      unit={unit}
                      onChange={(newValue) => updateCharacter('height', newValue)}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {unit === Unit.CM ? convertHeightSmart(selectedCharacter.height, true) : convertHeightSmartImperial(selectedCharacter.height)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {t('characterPanel.applyChanges')}
                    </div>
                  </div>

                  <div>
                    <label className="block text-label-md text-gray-700 mb-1">{t('characterPanel.color')}</label>
                    <div className="flex gap-2 flex-wrap">
                      {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#000000'].map(color => (
                        <button
                          key={color}
                          onClick={() => updateCharacter('color', color)}
                          className={`w-8 h-8 rounded-full border-2 ${selectedCharacter.color === color ? 'border-gray-800' : 'border-gray-300'}`}
                          style={{ backgroundColor: color }}
                          title={t('characterPanel.selectColor', { color })}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Fixed拖拽元素 */}
            {dragState.isDragging && dragState.draggedItemId && dragState.draggedElement && (
              <div
                style={{
                  position: 'fixed',
                  left: dragState.fixedElementX + (dragState.currentMouseX - dragState.startMouseX),
                  top: dragState.fixedElementY + (dragState.currentMouseY - dragState.startMouseY),
                  zIndex: 99999999,
                  pointerEvents: 'none',
                  opacity: 0.8,
                  filter: 'brightness(0.9)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                  transform: 'scale(1.02)',
                }}
              >
                {(() => {
                  const draggedItem = comparisonItems.find(item => item.id === dragState.draggedItemId);
                  if (!draggedItem) return null;

                  return (
                    <div className="flex flex-col items-center px-3">
                      <CharacterDisplay
                        character={draggedItem.character}
                        pixelsPerM={pixelsPerM}
                        isSelected={false}
                        unit={unit}
                        isDragging={true}
                        theme={styleSettings.theme}
                        onEdit={() => { }}
                        onMove={() => { }}
                        onDelete={() => { }}
                      />
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div >


        {/* 左侧角色列表Fixed拖拽元素 - 跟随鼠标移动用于直观交互 */}
        {leftPanelDragState.isDragging && leftPanelDragState.draggedItemId && (() => {
          const draggedItem = comparisonItems.find(item => item.id === leftPanelDragState.draggedItemId);
          if (!draggedItem) return null;

          return (
            <div
              style={{
                position: 'fixed',
                left: leftPanelDragState.fixedElementX + (leftPanelDragState.currentMouseX - leftPanelDragState.startMouseX),
                top: leftPanelDragState.fixedElementY + (leftPanelDragState.currentMouseY - leftPanelDragState.startMouseY),
                zIndex: 1000,
                pointerEvents: 'none',
                opacity: 0.8,
                filter: 'brightness(0.8)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                transform: 'scale(1.02)',
                width: leftPanelDragState.draggedElement?.offsetWidth || 'auto',
                minWidth: '200px',
                backgroundColor: 'transparent' // 透明背景色
              }}
            >
              <div className="flex items-center justify-between p-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{draggedItem.character.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">
                    {unit === Unit.CM
                      ? convertHeightSmart(draggedItem.character.height, true)
                      : convertHeightSmartImperial(draggedItem.character.height)
                    }
                  </span>
                  <GripVertical className="w-3 h-3 text-gray-400" />
                </div>
              </div>
            </div>
          );
        })()}

        {/* 图片上传弹窗 */}
        <ImageUploadModal
          isOpen={showImageUploadModal}
          onClose={() => setShowImageUploadModal(false)}
          onSave={handleImageUpload}
        />

        {/* 背景图片上传弹窗 */}
        <ImageUploadModal
          isOpen={showBackgroundImageUploadModal}
          onClose={() => setShowBackgroundImageUploadModal(false)}
          onSave={handleBackgroundImageSave}
        />

        {/* 保存项目弹窗 */}
        <Dialog
          open={showSaveProjectDialog}
          onOpenChange={(open) => {
            setShowSaveProjectDialog(open);
            if (!open) {
              setSaveProjectTitle("");
              setIsSavingProject(false);
            }
          }}
        >
          <DialogContent className={themeClasses.bg.primary}>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!isSavingProject) {
                handleCreateProject();
              }
            }}>
              <DialogHeader>
                <DialogTitle className={themeClasses.text.primary}>{t('saveProject.dialogTitle')}</DialogTitle>
                <DialogDescription className={themeClasses.text.secondary}>
                  {t('saveProject.dialogDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label htmlFor="save-project-title" className={themeClasses.text.primary}>
                  {t('saveProject.projectNameLabel')}
                </Label>
                <Input
                  id="save-project-title"
                  placeholder={t('saveProject.projectNamePlaceholder')}
                  value={saveProjectTitle}
                  onChange={(e) => setSaveProjectTitle(e.target.value)}
                  autoFocus
                  disabled={isSavingProject}
                  className={`${themeClasses.bg.primary} ${themeClasses.text.primary} ${themeClasses.border.primary}`}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSaveProjectDialog(false)}
                  disabled={isSavingProject}
                >
                  {t('saveProject.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingProject || !saveProjectTitle.trim()}
                  className="min-w-[100px]"
                >
                  {isSavingProject ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      {t('saveProject.saving')}
                    </>
                  ) : (
                    t('saveProject.save')
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div >
    );
  });

// 设置 displayName 用于调试
HeightCompareTool.displayName = 'HeightCompareTool';

export { HeightCompareTool };
export type { HeightCompareToolProps, HeightCompareToolRef };

