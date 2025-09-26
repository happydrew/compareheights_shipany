import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, Crop, Check, ZoomIn, ZoomOut } from 'lucide-react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { UnitSystem, UNIT_CONVERSIONS } from './HeightCalculates';

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
}

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageData: {
    imageUrl: string;
    heightInM: number;
    widthInM?: number;
    aspectRatio: number;
  }) => void;
}

// Get cropped image from cropper instance
const getCroppedImg = (cropper: any): string => {
  const canvas = cropper.getCroppedCanvas({
    minWidth: 256,
    minHeight: 256,
    maxWidth: 4096,
    maxHeight: 4096,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  });

  if (!canvas) {
    throw new Error('Failed to get cropped canvas');
  }

  return canvas.toDataURL('image/png');
};

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ isOpen, onClose, onSave }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [height, setHeight] = useState<string>('1.8');
  const [width, setWidth] = useState<string>('');
  const [heightUnit, setHeightUnit] = useState<UnitSystem>(UnitSystem.METER);
  const [widthUnit, setWidthUnit] = useState<UnitSystem>(UnitSystem.METER);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<any>(null);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      // Reset state
      setZoom(1);
    }
  }, []);

  // Handle zoom change
  const handleZoomChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = Number(event.target.value);
    setZoom(newZoom);
    if (cropperRef.current && cropperRef.current.cropper) {
      cropperRef.current.cropper.zoomTo(newZoom);
    }
  }, []);

  // Convert units to meters
  const convertToMeters = (value: number, unit: UnitSystem): number => {
    return value / UNIT_CONVERSIONS[unit];
  };

  // Handle save
  const handleSave = useCallback(async () => {
    if (!selectedFile || !imageUrl || !cropperRef.current) {
      console.log('Missing required data:', { selectedFile: !!selectedFile, imageUrl: !!imageUrl, cropper: !!cropperRef.current });
      return;
    }

    try {
      // 等待cropper完全初始化
      const cropper = cropperRef.current.cropper;
      if (!cropper) {
        throw new Error('Cropper not initialized');
      }

      // Generate cropped image
      const croppedImageUrl = getCroppedImg(cropper);

      // Get crop data for aspect ratio
      const cropData = cropper.getCropBoxData();
      if (!cropData || !cropData.width || !cropData.height) {
        throw new Error('Failed to get crop box data');
      }

      const aspectRatio = cropData.width / cropData.height;

      // Calculate dimensions
      const heightInM = convertToMeters(parseFloat(height), heightUnit);
      const widthInM = width ? convertToMeters(parseFloat(width), widthUnit) : undefined;

      onSave({
        imageUrl: croppedImageUrl,
        heightInM,
        widthInM,
        aspectRatio
      });

      // Reset state
      setSelectedFile(null);
      setImageUrl('');
      setHeight('1.8');
      setWidth('');
      setZoom(1);

    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Image cropping failed, please try again');
    }
  }, [selectedFile, imageUrl, height, width, heightUnit, widthUnit, onSave]);

  // Handle drag upload
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle close
  const handleClose = useCallback(() => {
    // Clean up URL objects
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    // 重置状态
    setSelectedFile(null);
    setImageUrl('');
    setHeight('1.8');
    setWidth('');
    setZoom(1);

    onClose();
  }, [imageUrl, onClose]);

  if (!isOpen) return null;

  // Calculate modal dimensions
  const headerHeight = 60; // Fixed header height
  const scaleControlHeight = 64; // Fixed scale control height 
  const padding = 32; // Total padding (16px * 2)
  const availableHeight = typeof window !== 'undefined' ? window.innerHeight * 0.95 - headerHeight - padding : 600;
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
  const isMobile = screenWidth < 1024; // lg breakpoint

  // 移动端和桌面端不同的计算逻辑
  let cropContainerSize;

  if (isMobile) {
    // 移动端：宽度占满剩余空间，保持正方形
    const availableWidth = screenWidth * 0.9 - 32; // 屏幕宽度 - padding
    const maxWidthBasedSize = availableWidth;
    const maxHeightBasedSize = availableHeight - scaleControlHeight;
    cropContainerSize = Math.min(maxWidthBasedSize, maxHeightBasedSize);
    cropContainerSize = Math.max(cropContainerSize, 250); // 最小尺寸
  } else {
    // 桌面端：高度占满剩余空间，保持正方形
    const availableWidth = screenWidth * 0.9 - 320 - 48; // 屏幕宽度 - 面板宽度 - 间距
    const maxHeightBasedSize = availableHeight - scaleControlHeight;
    const maxWidthBasedSize = availableWidth;
    cropContainerSize = Math.min(maxHeightBasedSize, maxWidthBasedSize);
    cropContainerSize = Math.max(cropContainerSize, 280); // 最小尺寸
  }

  const cropContainerHeight = cropContainerSize;
  const cropContainerWidth = cropContainerSize;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999] p-4">
      <div
        className="bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{
          width: isMobile ? '95vw' : `min(95vw, ${cropContainerWidth + 320 + 48}px)`,
          height: '95vh',
          minWidth: '320px'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0" style={{ height: headerHeight }}>
          <h2 className="text-xl font-semibold">Upload Image</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-all duration-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-auto">
          {/* Crop area */}
          <div
            className="flex flex-col flex-shrink-0"
            style={{
              width: `${cropContainerWidth}px`,
              height: `${cropContainerHeight + scaleControlHeight + 16}px` // 包含缩放控制和间距
            }}
          >
            {!imageUrl ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                style={{
                  width: `${cropContainerWidth}px`,
                  height: `${cropContainerHeight}px`
                }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={48} className="text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg mb-2">Click or drag to upload image</p>
                <p className="text-gray-400 text-sm">Supports JPG, PNG, GIF formats</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
              </div>
            ) : (
              <>
                {/* Image crop container */}
                <div
                  className="bg-gray-100 rounded-lg overflow-hidden relative"
                  style={{
                    width: `${cropContainerWidth}px`,
                    height: `${cropContainerHeight}px`
                  }}
                >
                  <Cropper
                    ref={cropperRef}
                    src={imageUrl}
                    style={{
                      width: '100%',
                      height: '100%'
                    }}
                    // 裁剪框配置
                    initialAspectRatio={1}
                    aspectRatio={NaN} // 强制1:1正方形裁剪
                    viewMode={1} // 裁剪框不能超出图片
                    dragMode="move"
                    autoCropArea={0.8} // 初始裁剪区域占图片的80%
                    restore={false}
                    guides={true}
                    center={true}
                    highlight={false}
                    cropBoxMovable={true}
                    cropBoxResizable={true}
                    toggleDragModeOnDblclick={false}
                    // 缩放配置
                    zoomable={true}
                    zoomOnTouch={true}
                    zoomOnWheel={true}
                    wheelZoomRatio={0.1}
                    // minZoom={0.1}
                    // maxZoom={10}
                    // 样式配置
                    background={false}
                    modal={true}
                    // 事件处理
                    ready={() => {
                      if (cropperRef.current && cropperRef.current.cropper) {
                        cropperRef.current.cropper.zoomTo(zoom);
                      }
                    }}
                    zoom={(event: any) => {
                      const newZoom = event.detail.ratio;
                      setZoom(newZoom);
                    }}
                  />
                </div>

                {/* Zoom control */}
                <div
                  className="mt-4 bg-white rounded-lg p-3 border flex-shrink-0"
                  style={{ height: `${scaleControlHeight}px` }}
                >
                  <div className="flex items-center gap-3 h-full">
                    <ZoomOut size={16} className="text-gray-600" />
                    <span className="text-sm text-gray-600 whitespace-nowrap">Zoom:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="10"
                      step="0.01"
                      value={zoom}
                      onChange={handleZoomChange}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-600 w-12">{Math.round(zoom * 100)}%</span>
                    <ZoomIn size={16} className="text-gray-600" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Settings panel */}
          <div className="w-full lg:w-80 lg:border-l lg:pl-6 border-t pt-6 lg:border-t-0 lg:pt-0 flex flex-col min-h-0">
            <div className="flex-1">
              <h3 className="font-semibold mb-4">Size Settings</h3>

              {/* Height settings */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Height *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-green-theme-500 transition-all duration-300 focus:ring-green-theme-500"
                    step="0.01"
                    min="0.001"
                  />
                  <select
                    value={heightUnit}
                    onChange={(e) => setHeightUnit(e.target.value as UnitSystem)}
                    className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-green-theme-500 transition-all duration-300 focus:ring-green-theme-500"
                  >
                    <option value={UnitSystem.NANOMETER}>nm</option>
                    <option value={UnitSystem.MICROMETER}>μm</option>
                    <option value={UnitSystem.MILLIMETER}>mm</option>
                    <option value={UnitSystem.CENTIMETER}>cm</option>
                    <option value={UnitSystem.METER}>m</option>
                    <option value={UnitSystem.KILOMETER}>km</option>
                    <option value={UnitSystem.INCH}>in</option>
                    <option value={UnitSystem.FOOT}>ft</option>
                    <option value={UnitSystem.MILE}>mi</option>
                  </select>
                </div>
              </div>

              {/* Width settings */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Width (optional)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-green-theme-500 transition-all duration-300 focus:ring-green-theme-500"
                    step="0.01"
                    min="0"
                    placeholder="Auto calculate"
                  />
                  <select
                    value={widthUnit}
                    onChange={(e) => setWidthUnit(e.target.value as UnitSystem)}
                    className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-green-theme-500 transition-all duration-300 focus:ring-green-theme-500"
                    disabled={!width}
                  >
                    <option value={UnitSystem.NANOMETER}>nm</option>
                    <option value={UnitSystem.MICROMETER}>μm</option>
                    <option value={UnitSystem.MILLIMETER}>mm</option>
                    <option value={UnitSystem.CENTIMETER}>cm</option>
                    <option value={UnitSystem.METER}>m</option>
                    <option value={UnitSystem.KILOMETER}>km</option>
                    <option value={UnitSystem.INCH}>in</option>
                    <option value={UnitSystem.FOOT}>ft</option>
                    <option value={UnitSystem.MILE}>mi</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  If width is not set, it will be automatically calculated based on the aspect ratio of the cropped image
                </p>
              </div>

              {/* Crop instructions */}
              {imageUrl && (
                <div className="mb-4 p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                    <Crop size={16} className="mr-2" />
                    Instructions
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Drag crop box to move position, drag corners to resize</li>
                    <li>• Use zoom slider or mouse wheel to scale image</li>
                    <li>• Drag image to adjust position within crop area</li>
                    <li>• Crop result will match exactly what you see</li>
                  </ul>
                </div>
              )}

              {/* Reselect image */}
              {imageUrl && (
                <div className="mb-4">
                  <button
                    onClick={() => {
                      if (imageUrl) {
                        URL.revokeObjectURL(imageUrl);
                      }
                      setSelectedFile(null);
                      setImageUrl('');
                      setZoom(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 text-sm"
                  >
                    Reselect Image
                  </button>
                </div>
              )}
            </div>

            {/* Bottom buttons */}
            <div className="flex gap-3 pt-4 pb-4 border-t">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!imageUrl || !height}
                className="flex-1 px-4 py-2 bg-green-theme-500 text-white rounded-xl hover:bg-green-theme-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center ripple-effect"
              >
                <Check size={16} className="mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ImageUploadModal };