'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, Download, Sliders, Eye, EyeOff, RotateCcw, Palette } from 'lucide-react'
import { useTranslations } from 'next-intl'

// 类型定义
interface RGB {
  r: number
  g: number
  b: number
}

interface DuotoneSettings {
  darkColor: RGB
  lightColor: RGB
  intensity: number
  contrast: number
  brightness: number
  curve: 'linear' | 'smooth' | 'dramatic'
}

// 默认配色方案
const PRESETS = {
  'brave-pink-hero-green': {
    name: 'Brave Pink Hero Green',
    darkColor: { r: 0, g: 153, b: 102 },   // Hero Green
    lightColor: { r: 253, g: 33, b: 143 },  // Brave Pink
    intensity: 55,
    contrast: 100,
    brightness: 0,
    curve: 'smooth' as const
  },
  'vintage': {
    name: 'Vintage',
    darkColor: { r: 139, g: 69, b: 19 },
    lightColor: { r: 244, g: 164, b: 96 },
    intensity: 80,
    contrast: 130,
    brightness: 15,
    curve: 'smooth' as const
  },
  'dramatic': {
    name: 'Dramatic',
    darkColor: { r: 31, g: 41, b: 55 },
    lightColor: { r: 245, g: 158, b: 11 },
    intensity: 90,
    contrast: 160,
    brightness: 5,
    curve: 'dramatic' as const
  }
}

// 颜色工具函数
const rgbToHex = (rgb: RGB): string => {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

const hexToRgb = (hex: string): RGB | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

// 优化的双色调算法
const applyDuotone = (imageData: ImageData, settings: DuotoneSettings): ImageData => {
  const { data, width, height } = imageData
  const newImageData = new ImageData(width, height)
  const newData = newImageData.data

  const intensityFactor = settings.intensity / 100

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    // 使用更精准的灰度转换公式 (Rec. 709)
    const grayscale = 0.2126 * r + 0.7152 * g + 0.0722 * b

    // 增强对比度和亮度处理
    const contrastFactor = settings.contrast / 100
    const brightnessFactor = settings.brightness * 2.55 // 更精确的亮度调整
    let adjusted = (grayscale - 128) * contrastFactor + 128 + brightnessFactor
    adjusted = Math.max(0, Math.min(255, adjusted))

    // 归一化到0-1范围
    let t = adjusted / 255

    // 应用更强烈的色调曲线
    switch (settings.curve) {
      case 'smooth':
        // S形曲线，增强中间调对比
        t = t * t * (3 - 2 * t)
        // 额外增强对比度
        t = Math.pow(t, 0.9)
        break
      case 'dramatic':
        // 更戏剧性的曲线
        t = Math.pow(t, 0.6)
        break
      case 'linear':
      default:
        // 线性但增加一点对比度
        t = Math.pow(t, 0.85)
        break
    }

    // 确保颜色映射更明显
    // 将0-1的范围稍微压缩到0.1-0.9，避免纯黑纯白
    t = 0.1 + t * 0.8

    // 颜色插值 - 使用更鲜艳的色彩
    const finalColor = {
      r: Math.round(settings.darkColor.r + (settings.lightColor.r - settings.darkColor.r) * t),
      g: Math.round(settings.darkColor.g + (settings.lightColor.g - settings.darkColor.g) * t),
      b: Math.round(settings.darkColor.b + (settings.lightColor.b - settings.darkColor.b) * t)
    }

    // 应用强度时保持更多双色调效果
    if (intensityFactor < 1) {
      const originalWeight = (1 - intensityFactor) * 0.7 // 减少原始图像的影响
      const duotoneWeight = intensityFactor + (1 - intensityFactor) * 0.3

      newData[i] = Math.round(r * originalWeight + finalColor.r * duotoneWeight)
      newData[i + 1] = Math.round(g * originalWeight + finalColor.g * duotoneWeight)
      newData[i + 2] = Math.round(b * originalWeight + finalColor.b * duotoneWeight)
    } else {
      newData[i] = finalColor.r
      newData[i + 1] = finalColor.g
      newData[i + 2] = finalColor.b
    }

    newData[i + 3] = a
  }

  return newImageData
}

export default function BravePinkGreenTool({ className = '' }: { className?: string }) {
  const t = useTranslations('brave_pink_green_tool');
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [settings, setSettings] = useState<DuotoneSettings>(PRESETS['brave-pink-hero-green'])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载图片
  const loadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      setError(t('errors.file_too_large'))
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      const img = new Image()
      img.onload = () => {
        setOriginalImage(img)

        // 使用setTimeout确保DOM已更新
        setTimeout(() => {
          if (!canvasRef.current) {
            setError(t('errors.canvas_not_ready'))
            setIsProcessing(false)
            URL.revokeObjectURL(img.src)
            return
          }

          drawToCanvas(img, canvasRef.current)
          processImage(img)
          setIsProcessing(false)
          URL.revokeObjectURL(img.src)
        }, 100)
      }
      img.onerror = () => {
        setError(t('errors.load_failed'))
        setIsProcessing(false)
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    } catch (err) {
      setError(t('errors.load_failed'))
      setIsProcessing(false)
    }
  }, [t])

  // 优化的Canvas绘制函数
  const drawToCanvas = (img: HTMLImageElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Cannot get canvas context')
      return
    }

    // 提高最大尺寸以保持清晰度
    const maxSize = 1200

    let { width, height } = img
    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height)
      width *= ratio
      height *= ratio
    }

    canvas.width = width
    canvas.height = height

    // 优化图像渲染质量
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // 使用高质量的图像插值
    ctx.drawImage(img, 0, 0, width, height)
  }

  // 处理图片
  const processImage = useCallback((img?: HTMLImageElement) => {
    const image = img || originalImage
    if (!image || !canvasRef.current || !previewCanvasRef.current) return

    setIsProcessing(true)

    setTimeout(() => {
      const canvas = canvasRef.current
      const previewCanvas = previewCanvasRef.current

      if (!canvas || !previewCanvas) {
        console.error('Canvas elements not available')
        setIsProcessing(false)
        return
      }

      const ctx = canvas.getContext('2d')
      const previewCtx = previewCanvas.getContext('2d')

      if (!ctx || !previewCtx) {
        console.error('Cannot get canvas contexts')
        setIsProcessing(false)
        return
      }

      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // 应用双色调效果
      const processedData = applyDuotone(imageData, settings)

      // 绘制到预览Canvas
      previewCanvas.width = canvas.width
      previewCanvas.height = canvas.height
      previewCtx.putImageData(processedData, 0, 0)

      setIsProcessing(false)
    }, 50)
  }, [originalImage, settings])

  // 更新设置并重新处理
  const updateSettings = useCallback((newSettings: Partial<DuotoneSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  // 重新处理图片
  React.useEffect(() => {
    if (originalImage) {
      processImage()
    }
  }, [settings, processImage, originalImage])

  // 应用预设
  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    setSettings(PRESETS[presetKey])
  }

  // 导出图片
  const exportImage = (format: 'png' | 'jpg' | 'webp' = 'png') => {
    if (!previewCanvasRef.current) {
      console.error('Preview canvas not available for export')
      return
    }

    const canvas = previewCanvasRef.current
    let dataUrl: string

    if (format === 'jpg') {
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')

      if (!tempCtx) {
        console.error('Cannot create temporary canvas context')
        return
      }

      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      tempCtx.fillStyle = 'white'
      tempCtx.fillRect(0, 0, canvas.width, canvas.height)
      tempCtx.drawImage(canvas, 0, 0)
      dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9)
    } else {
      dataUrl = canvas.toDataURL(`image/${format}`, 0.9)
    }

    const link = document.createElement('a')
    link.download = `brave-pink-green-duotone.${format}`
    link.href = dataUrl
    link.click()
  }

  // 重置
  const reset = () => {
    setOriginalImage(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`w-full max-w-7xl mx-auto ${className}`}>
      {/* 标题 */}
      <div className="text-center my-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-green-600 bg-clip-text text-transparent mb-2">
          {t('title')}
        </h1>
        <p className="text-gray-600 text-lg mb-4">
          {t('subtitle')}
        </p>

        {/* 特色标签 */}
        <div className="flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t('badges.free')}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-pink-100 text-pink-800 border border-pink-200">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('badges.fast')}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            {t('badges.customizable')}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {t('badges.quality')}
          </span>
        </div>
      </div>

      {/* 主要布局容器 */}
      <div id="tool" className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full min-h-0">

          {/* 左侧区域 */}
          <div className="flex-1 flex flex-col p-6 lg:p-8">

            {/* 上传区域 - 自动占满剩余空间 */}
            <div className="flex-1 flex flex-col justify-center mb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && loadImage(e.target.files[0])}
                className="hidden"
              />

              {!originalImage ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50/50 transition-all duration-200 flex flex-col justify-center min-h-[300px]"
                >
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('upload.title')}</h3>
                  <p className="text-gray-500 mb-4">{t('upload.description')}</p>
                  <p className="text-sm text-gray-400">{t('upload.formats')}</p>
                </div>
              ) : (
                <div className="flex-1 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 flex flex-col justify-center">
                  {/* 上传的图片预览 */}
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full max-h-[200px] object-contain rounded-lg shadow-sm"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>

                  {/* 重新上传按钮 */}
                  <div className="bg-white/80 backdrop-blur-sm border-t px-4 py-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <button
                        onClick={reset}
                        className="flex justify-center items-center gap-2 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-lg border shadow-sm transition-all"
                        title={t('upload.upload_new')}
                      >
                        <Upload className="w-5 h-5" />
                        {t('upload.upload_new')}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  </div>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* 控制面板 - 底部对齐 */}
            {originalImage && (
              <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/80 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Sliders className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-900">{t('controls.title')}</h3>
                  <div className={`ml-auto w-2 h-2 rounded-full ${isProcessing ? 'bg-orange-400 animate-pulse' : 'bg-green-400'}`}></div>
                </div>

                {/* 预设 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t('controls.quick_presets')}
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => applyPreset(key as keyof typeof PRESETS)}
                        className="flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-white/80 transition-all duration-150 group"
                      >
                        <span className="font-medium text-gray-900 group-hover:text-gray-700">{preset.name}</span>
                        <div className="flex gap-1.5">
                          <div
                            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: rgbToHex(preset.darkColor) }}
                          />
                          <div
                            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: rgbToHex(preset.lightColor) }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 颜色选择 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('controls.dark_color')}</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={rgbToHex(settings.darkColor)}
                        onChange={(e) => {
                          const rgb = hexToRgb(e.target.value)
                          if (rgb) updateSettings({ darkColor: rgb })
                        }}
                        className="w-12 h-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
                      />
                      <input
                        type="text"
                        value={rgbToHex(settings.darkColor)}
                        onChange={(e) => {
                          const rgb = hexToRgb(e.target.value)
                          if (rgb) updateSettings({ darkColor: rgb })
                        }}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-200 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('controls.light_color')}</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={rgbToHex(settings.lightColor)}
                        onChange={(e) => {
                          const rgb = hexToRgb(e.target.value)
                          if (rgb) updateSettings({ lightColor: rgb })
                        }}
                        className="w-12 h-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
                      />
                      <input
                        type="text"
                        value={rgbToHex(settings.lightColor)}
                        onChange={(e) => {
                          const rgb = hexToRgb(e.target.value)
                          if (rgb) updateSettings({ lightColor: rgb })
                        }}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-200 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* 滑块控制 */}
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">{t('controls.intensity')}</label>
                      <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{settings.intensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.intensity}
                      onChange={(e) => updateSettings({ intensity: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-pink-500 [&::-webkit-slider-thumb]:to-green-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">{t('controls.contrast')}</label>
                      <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{settings.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={settings.contrast}
                      onChange={(e) => updateSettings({ contrast: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-pink-500 [&::-webkit-slider-thumb]:to-green-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">{t('controls.brightness')}</label>
                      <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{settings.brightness > 0 ? '+' : ''}{settings.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={settings.brightness}
                      onChange={(e) => updateSettings({ brightness: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-pink-500 [&::-webkit-slider-thumb]:to-green-500"
                    />
                  </div>
                </div>

                {/* 曲线选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('controls.mapping_curve')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['linear', 'smooth', 'dramatic'] as const).map((curve) => (
                      <button
                        key={curve}
                        onClick={() => updateSettings({ curve })}
                        className={`px-3 py-2 text-sm rounded-lg border-2 transition-all duration-150 capitalize font-medium ${settings.curve === curve
                          ? 'bg-gradient-to-r from-pink-50 to-green-50 border-gray-300 text-gray-900 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                      >
                        {t(`controls.curve_${curve}`)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {settings.curve === 'linear' && t('controls.curve_desc_linear')}
                    {settings.curve === 'smooth' && t('controls.curve_desc_smooth')}
                    {settings.curve === 'dramatic' && t('controls.curve_desc_dramatic')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 分隔线 - 仅桌面端显示 */}
          <div className="hidden lg:block w-px bg-gray-200"></div>

          {/* 右侧区域 */}
          <div className="flex-1 p-6 lg:p-8 flex flex-col min-h-0">

            {/* 预览区域标题 */}
            <div className="flex items-center justify-start mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{t('preview.title')}</h3>
            </div>

            {/* 预览区域 - 占据剩余空间并居中显示 */}
            <div className="flex-1 flex items-center justify-center min-h-0">
              <div className="w-full max-w-lg">
                <div className="relative w-full aspect-square bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                  {!originalImage ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">{t('preview.no_image')}</p>
                        <p className="text-sm">{t('preview.upload_prompt')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 p-4">
                      <div className="relative h-full">
                        <canvas
                          ref={previewCanvasRef}
                          className={`w-full h-full object-contain rounded-lg transition-opacity duration-200 ${isProcessing ? 'opacity-50' : ''}`}
                          style={{ objectFit: 'contain' }}
                        />
                      </div>

                      {isProcessing && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                          <div className="text-center">
                            <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-sm font-medium text-gray-700">{t('preview.processing')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 导出按钮区域 - 固定在底部 */}
            {originalImage && !isProcessing && (
              <div className="mt-6 pt-6 border-t border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('export.title')}</h3>

                <div className="space-y-3">
                  <button
                    onClick={() => exportImage('png')}
                    className="w-full bg-gradient-to-r from-pink-500 to-green-500 hover:from-pink-600 hover:to-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-3 shadow-md"
                  >
                    <Download className="w-5 h-5" />
                    {t('export.download_png')}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => exportImage('jpg')}
                      className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-all duration-150 hover:shadow-sm"
                    >
                      {t('export.jpg')}
                    </button>
                    <button
                      onClick={() => exportImage('webp')}
                      className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-all duration-150 hover:shadow-sm"
                    >
                      {t('export.webp')}
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs">🔒</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">{t('export.privacy_title')}</p>
                      <p className="text-xs text-blue-700">{t('export.privacy_description')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Content Display Area */}
      <div className="mt-20 space-y-16">

        {/* Hero Introduction - The Movement */}
        <section className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-pink-50 via-white to-green-50 rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-green-500 rounded-2xl mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                The <span className="bg-gradient-to-r from-pink-600 to-green-600 bg-clip-text text-transparent">Brave Pink Hero Green</span> Movement
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                In late August 2025, a powerful visual movement swept across Indonesian social media. <strong>Brave pink hero green</strong> emerged as more than just colors—they became symbols of resistance, solidarity, and hope that captured the world's attention through the simple act of changing profile pictures.
              </p>
            </div>
          </div>
        </section>

        {/* Breaking Down the Event */}
        <section className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold mb-4">
                🚨 Breaking Event Analysis
              </span>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                What Sparked the <span className="text-pink-600">Brave Pink Hero Green</span> Phenomenon
              </h3>
              <div className="space-y-4 text-gray-700">
                <p>
                  The <strong>brave pink hero green</strong> movement originated from two tragic yet inspiring events during Indonesia's August 2025 demonstrations. On August 28, 2025, a courageous woman named Ana, wearing a distinctive pink hijab, became an icon when she fearlessly confronted police barricades with nothing but a bamboo pole bearing the Indonesian flag.
                </p>
                <p>
                  Simultaneously, the death of Affan Kurniawan, an online motorcycle taxi driver killed by a police tactical vehicle, sparked the adoption of Hero Green—representing the solidarity with Indonesia's working class. The <strong>1312</strong> code, often accompanying these colors, adds another layer of resistance symbolism to this digital movement.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-pink-100 to-green-100 rounded-2xl p-8">
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-pink-500 rounded-lg mr-3"></div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Brave Pink (#EC4899)</h4>
                        <p className="text-sm text-gray-600">Symbol of courage & defiance</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Inspired by Ana's pink hijab during confrontation</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-green-500 rounded-lg mr-3"></div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Hero Green (#10B981)</h4>
                        <p className="text-sm text-gray-600">Symbol of working-class solidarity</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Honoring Affan Kurniawan and ojol drivers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline of Events */}
        <section className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
              📅 Event Timeline
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              How <span className="text-pink-600">Brave Pink Hero Green</span> Went Viral
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From street protests to digital solidarity: a chronological breakdown of the movement that generated over 3.3 million interactions in 3 days.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-pink-300 to-green-300 rounded-full"></div>

            <div className="space-y-12">
              <div className="flex items-center">
                <div className="flex-1 text-right pr-8">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-pink-200">
                    <h4 className="font-semibold text-gray-900 mb-2">August 28, 2025</h4>
                    <p className="text-gray-600 text-sm">Ana's brave confrontation during mass demonstrations. Her pink hijau becomes an instant symbol of resistance as videos circulate across social media.</p>
                  </div>
                </div>
                <div className="w-4 h-4 bg-pink-500 rounded-full border-4 border-white shadow-lg z-10"></div>
                <div className="flex-1 pl-8"></div>
              </div>

              <div className="flex items-center">
                <div className="flex-1 pr-8"></div>
                <div className="w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-lg z-10"></div>
                <div className="flex-1 text-left pl-8">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-green-200">
                    <h4 className="font-semibold text-gray-900 mb-2">August 29, 2025</h4>
                    <p className="text-gray-600 text-sm">Affan Kurniawan incident occurs. The green color of ojol uniforms becomes associated with working-class solidarity and the <strong>brave pink hero green</strong> combination begins forming.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="flex-1 text-right pr-8">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-200">
                    <h4 className="font-semibold text-gray-900 mb-2">September 1, 2025</h4>
                    <p className="text-gray-600 text-sm">First <strong>brave pink hero green</strong> generators launched. The <strong>1312</strong> code becomes widely adopted alongside the pink hijau color scheme.</p>
                  </div>
                </div>
                <div className="w-4 h-4 bg-purple-500 rounded-full border-4 border-white shadow-lg z-10"></div>
                <div className="flex-1 pl-8"></div>
              </div>

              <div className="flex items-center">
                <div className="flex-1 pr-8"></div>
                <div className="w-4 h-4 bg-orange-500 rounded-full border-4 border-white shadow-lg z-10"></div>
                <div className="flex-1 text-left pl-8">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-orange-200">
                    <h4 className="font-semibold text-gray-900 mb-2">September 1-3, 2025</h4>
                    <p className="text-gray-600 text-sm">Viral explosion: 3.3M+ visits to <strong>foto brave pink hero green</strong> generators. Social media profiles across Indonesia transform to show solidarity.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Impact Analysis */}
        <section className="max-w-6xl mx-auto">
          <div className="bg-gray-50 rounded-3xl p-8 md:p-12">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <span className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-4">
                  📊 Social Impact
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                  The Cultural Power of <span className="text-pink-600">Brave Pink Hero Green 1312</span>
                </h3>
                <div className="space-y-4 text-gray-700">
                  <p>
                    According to sociology lecturer Hubertus Ubur, the <strong>brave pink hero green</strong> campaign demonstrates how sensitive Indonesian netizens are to their country's political situation. The movement serves as an alternative voice for those who cannot directly participate in physical demonstrations.
                  </p>
                  <p>
                    The <strong>pink hijau</strong> combination transcends simple color choices—it represents a sophisticated form of digital resistance. The integration of <strong>1312</strong> numeric codes adds layers of meaning that resonate with resistance movements globally, making <strong>foto brave pink hero green</strong> images powerful statements of solidarity.
                  </p>
                  <p>
                    Within 72 hours of the first generators going live, the movement had generated unprecedented engagement across Instagram, TikTok, X (Twitter), and WhatsApp, demonstrating how color symbolism can unite diverse voices in the digital age.
                  </p>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-pink-100 via-white to-green-100 rounded-2xl p-6 h-full flex flex-col justify-center">
                  <div className="text-center space-y-6">
                    <div>
                      <div className="text-4xl font-bold text-gray-900 mb-2">3.3M+</div>
                      <div className="text-sm text-gray-600">Generator visits (72 hours)</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-pink-600 mb-2">1312</div>
                      <div className="text-xs text-gray-500">Resistance code integration</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600 mb-2">∞</div>
                      <div className="text-xs text-gray-500">Ongoing cultural impact</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Generator Tools Comparison */}
        <section className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-4">
              🛠️ Digital Tools Analysis
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Comparing <span className="text-purple-600">Brave Pink Hero Green App Lovable App</span> Solutions
            </h3>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              As the movement exploded, numerous tools emerged to help users create <strong>foto brave pink hero green</strong> images. Here's how different generators compare, including the popular <strong>lovable brave pink hero green</strong> platforms.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                <h4 className="font-semibold text-gray-900">Other Popular Generators</h4>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 text-sm"><strong>Brave pink hero green app lovable app:</strong> Basic pink hijau filter with limited customization options</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 text-sm">Standard foto brave pink hero green processors: May require app downloads or account registration</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 text-sm">Generic pink hijau generators: Limited color accuracy, standard export quality</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 text-sm">Single-function tools: No 1312 integration or advanced duotone controls</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-pink-50 rounded-2xl p-6 border-2 border-green-200">
              <div className="flex items-center mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <h4 className="font-semibold text-gray-900">Our Generator Advantages</h4>
                <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Recommended</span>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 text-sm font-medium">Authentic color codes: Exact Brave Pink (#EC4899) and Hero Green (#10B981) specifications</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 text-sm font-medium">Advanced parameters: Intensity, contrast, brightness, and curve mapping controls</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 text-sm font-medium">100% free and fast: Browser-based processing, no downloads or registrations required</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 text-sm font-medium">Premium quality: High-resolution outputs with multiple export formats (PNG, JPG, WebP)</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Global Spread and Recognition */}
        <section className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8">
                <h4 className="font-semibold text-gray-900 mb-4">International Media Coverage</h4>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-sm font-medium text-gray-800">ANTARA News</p>
                    <p className="text-xs text-gray-600">"Brave pink, heroic green become symbols of solidarity, hope"</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-sm font-medium text-gray-800">Tempo.co English</p>
                    <p className="text-xs text-gray-600">"Trending Campaign on Indonesian Social Media"</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-sm font-medium text-gray-800">Social Expat</p>
                    <p className="text-xs text-gray-600">"How Two Colours Became Symbols of Protest"</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
                🌍 Global Recognition
              </span>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                How <span className="text-pink-600">Brave Pink Hero Green</span> Gained International Attention
              </h3>
              <div className="space-y-4 text-gray-700">
                <p>
                  The <strong>brave pink hero green</strong> movement quickly transcended Indonesian borders, gaining coverage from international news outlets and social media platforms. The simple yet powerful visual symbolism resonated with global audiences interested in digital resistance movements.
                </p>
                <p>
                  The phenomenon demonstrated how modern protest movements can leverage color psychology, social media virality, and user-generated content tools to create lasting impact. The <strong>foto brave pink hero green</strong> trend became a case study in digital activism across multiple continents.
                </p>
                <p>
                  International observers noted how the <strong>pink hijau</strong> combination effectively bypassed traditional media censorship while creating a unified visual language that transcended linguistic barriers—a testament to the power of symbolic communication in the digital age.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How to Create Your Own */}
        <section className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 text-white">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Join the <span className="text-yellow-300">Brave Pink Hero Green</span> Movement
              </h3>
              <p className="text-blue-100 text-lg max-w-2xl mx-auto">
                Create your own authentic <strong>foto brave pink hero green</strong> with historical accuracy and professional quality in three simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">1</span>
                </div>
                <h4 className="text-lg font-semibold mb-2">Upload Your Photo</h4>
                <p className="text-blue-100 text-sm">Drag & drop or select your image (PNG, JPG, WebP up to 10MB supported)</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">2</span>
                </div>
                <h4 className="text-lg font-semibold mb-2">Customize Settings</h4>
                <p className="text-blue-100 text-sm">Adjust intensity, contrast, brightness, and choose curve mapping for perfect <strong>pink hijau</strong> effects</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">3</span>
                </div>
                <h4 className="text-lg font-semibold mb-2">Export & Share</h4>
                <p className="text-blue-100 text-sm">Download high-quality results and share your solidarity across social media platforms</p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy and Ethics */}
        <section className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">🔒 Privacy-First Movement Support</h3>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              Unlike many <strong>brave pink hero green app lovable app</strong> solutions that may require data uploads, our generator respects the privacy principles central to resistance movements. All <strong>foto brave pink hero green</strong> processing happens locally in your browser, ensuring your digital activism remains completely private.
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              100% Local Processing • Zero Data Upload • Maximum Privacy
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-pink-500 to-green-500 rounded-3xl p-8 md:p-12 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Honor the Legacy of <span className="text-yellow-300">Brave Pink Hero Green</span>
            </h3>
            <p className="text-pink-100 text-lg mb-8 max-w-2xl mx-auto">
              Whether creating <strong>foto brave pink hero green</strong> for historical documentation, social media solidarity, or artistic expression, you're participating in a movement that represents courage, hope, and digital unity. Every <strong>pink hijau</strong> image carries forward the legacy of Ana's bravery and Affan's sacrifice.
            </p>
            <a href="#tool" className="inline-flex items-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-2xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Start Creating Now
            </a>
          </div>
        </section>
      </div>

    </div>
  )
}