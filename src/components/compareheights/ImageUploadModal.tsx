import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, Crop, Check, ZoomIn, ZoomOut } from 'lucide-react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { UnitSystem, UNIT_CONVERSIONS } from './HeightCalculates';
import { validateFile } from '@/lib/uploads';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageData: {
    imageUrl: string;
    heightInM: number;
    widthInM?: number;
    aspectRatio: number;
  }) => void;
  isFreePlan?: boolean;
}

const HEADER_HEIGHT = 60;
const SCALE_CONTROL_HEIGHT = 64;
const LAYOUT_PADDING = 32;

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

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ isOpen, onClose, onSave, isFreePlan = true }) => {
  const t = useTranslations('image_upload_modal');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [height, setHeight] = useState<string>('1.8');
  const [width, setWidth] = useState<string>('');
  const [heightUnit, setHeightUnit] = useState<UnitSystem>(UnitSystem.METER);
  const [widthUnit, setWidthUnit] = useState<UnitSystem>(UnitSystem.METER);
  const [validationError, setValidationError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<any>(null);

  const clearImagePreview = useCallback(() => {
    setSelectedFile(null);
    setImageUrl((previousUrl) => {
      if (previousUrl && previousUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl);
      }
      return '';
    });
    setZoom(1);
    setValidationError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const resetModalState = useCallback(() => {
    clearImagePreview();
    setHeight('1.8');
    setWidth('');
    setHeightUnit(UnitSystem.METER);
    setWidthUnit(UnitSystem.METER);
  }, [clearImagePreview]);

  useEffect(() => {
    if (!isOpen) {
      resetModalState();
    }
  }, [isOpen, resetModalState]);

  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleFileSelect = useCallback((file: File) => {
    // 验证文件
    const validation = validateFile(file, { isFreePlan });
    if (!validation.valid) {
      setValidationError(validation.error || t('errors.invalidFile'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setValidationError(t('errors.uploadImageFile'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setImageUrl((previousUrl) => {
      if (previousUrl && previousUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl);
      }
      return objectUrl;
    });
    setZoom(1);
    setValidationError('');
  }, [isFreePlan]);

  const handleZoomChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextZoom = Number(event.target.value);
    setZoom(nextZoom);
    if (cropperRef.current?.cropper) {
      cropperRef.current.cropper.zoomTo(nextZoom);
    }
  }, []);

  const convertToMeters = (value: number, unit: UnitSystem): number => {
    return value / UNIT_CONVERSIONS[unit];
  };

  const handleSave = useCallback(async () => {
    if (!selectedFile || !imageUrl || !cropperRef.current) {
      console.info('Missing required data when saving image upload modal');
      return;
    }

    try {
      const cropper = cropperRef.current.cropper;
      if (!cropper) {
        throw new Error('Cropper not initialized');
      }

      const croppedImageUrl = getCroppedImg(cropper);
      const cropData = cropper.getCropBoxData();
      if (!cropData?.width || !cropData?.height) {
        throw new Error('Failed to read crop box data');
      }

      const aspectRatio = cropData.width / cropData.height;
      const heightInM = convertToMeters(parseFloat(height), heightUnit);
      const widthInM = width ? convertToMeters(parseFloat(width), widthUnit) : undefined;

      onSave({
        imageUrl: croppedImageUrl,
        heightInM,
        widthInM,
        aspectRatio,
      });

      resetModalState();
    } catch (error) {
      console.error('Error cropping image:', error);
      alert(t('errors.cropFailed'));
    }
  }, [selectedFile, imageUrl, height, width, heightUnit, widthUnit, onSave, resetModalState, t]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleClose = useCallback(() => {
    resetModalState();
    onClose();
  }, [resetModalState, onClose]);

  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const availableHeight = Math.max(viewportHeight * 0.95 - HEADER_HEIGHT - LAYOUT_PADDING, 320);
  const isMobile = screenWidth < 1024;

  let cropContainerSize;
  if (isMobile) {
    const availableWidth = screenWidth * 0.9 - 32;
    const maxHeightBasedSize = availableHeight - SCALE_CONTROL_HEIGHT;
    cropContainerSize = Math.max(Math.min(availableWidth, maxHeightBasedSize), 250);
  } else {
    const availableWidth = screenWidth * 0.9 - 320 - 48;
    const maxHeightBasedSize = availableHeight - SCALE_CONTROL_HEIGHT;
    cropContainerSize = Math.max(Math.min(maxHeightBasedSize, availableWidth), 280);
  }

  const cropContainerHeight = cropContainerSize;
  const cropContainerWidth = cropContainerSize;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent className="max-w-[min(95vw,1200px)] w-full max-h-[95vh] overflow-hidden border-none p-0 sm:rounded-2xl">
        <div className="flex h-[95vh] min-h-[600px] flex-col bg-white">
          <div
            className="flex items-center border-b border-gray-200 px-4"
            style={{ height: HEADER_HEIGHT }}
          >
            <h2 className="text-xl font-semibold text-gray-900">{t('title')}</h2>
          </div>

          <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-auto p-4 lg:flex-row">
            <div
              className="flex flex-col flex-shrink-0"
              style={{
                width: cropContainerWidth,
                height: cropContainerHeight + SCALE_CONTROL_HEIGHT + 16,
              }}
            >
              {!imageUrl ? (
                <div
                  className="flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-gray-400"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={48} className="mb-4 text-gray-400" />
                  <p className="mb-2 text-lg text-gray-600">{t('uploadArea.dragDrop')}</p>
                  <p className="text-sm text-gray-400">
                    {isFreePlan ? t('uploadArea.maxSizeFree') : t('uploadArea.maxSizePaid')}
                  </p>
                  {validationError && (
                    <p className="mt-2 text-sm text-red-600">{validationError}</p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleFileSelect(file);
                      }
                      event.target.value = '';
                    }}
                  />
                </div>
              ) : (
                <>
                  <div
                    className="relative overflow-hidden rounded-lg bg-gray-100"
                    style={{
                      width: cropContainerWidth,
                      height: cropContainerHeight,
                    }}
                  >
                    <Cropper
                      ref={cropperRef}
                      src={imageUrl}
                      style={{ width: '100%', height: '100%' }}
                      initialAspectRatio={1}
                      aspectRatio={NaN}
                      viewMode={1}
                      dragMode="move"
                      autoCropArea={0.8}
                      restore={false}
                      guides
                      center
                      highlight={false}
                      cropBoxMovable
                      cropBoxResizable
                      toggleDragModeOnDblclick={false}
                      zoomable
                      zoomOnTouch
                      zoomOnWheel
                      wheelZoomRatio={0.1}
                      background={false}
                      modal
                      ready={() => {
                        if (cropperRef.current?.cropper) {
                          cropperRef.current.cropper.zoomTo(zoom);
                        }
                      }}
                      zoom={(event: any) => {
                        setZoom(event.detail.ratio);
                      }}
                    />
                  </div>

                  <div
                    className="mt-4 flex-shrink-0 rounded-lg border bg-white p-3"
                    style={{ height: SCALE_CONTROL_HEIGHT }}
                  >
                    <div className="flex h-full items-center gap-3">
                      <ZoomOut size={16} className="text-gray-600" />
                      <span className="whitespace-nowrap text-sm text-gray-600">{t('cropSection.zoomLabel')}:</span>
                      <input
                        type="range"
                        min="0.1"
                        max="10"
                        step="0.01"
                        value={zoom}
                        onChange={handleZoomChange}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
                      <ZoomIn size={16} className="text-gray-600" />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col border-t border-gray-200 pt-6 lg:max-w-85 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
              <div className="flex-1">
                <h3 className="mb-4 font-semibold">{t('heightSection.title')}</h3>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">{t('heightSection.heightLabel')} *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={height}
                      onChange={(event) => setHeight(event.target.value)}
                      className="flex-1 rounded-xl border border-gray-300 px-3 py-2 transition-all duration-300 focus:outline-none"
                      step="0.01"
                      min="0.001"
                      placeholder={t('heightSection.heightPlaceholder')}
                    />
                    <select
                      value={heightUnit}
                      onChange={(event) => setHeightUnit(event.target.value as UnitSystem)}
                      className="cursor-pointer rounded-xl border border-gray-300 px-3 py-2 transition-all duration-300 focus:outline-none"
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

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">{t('heightSection.widthLabel')}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={width}
                      onChange={(event) => setWidth(event.target.value)}
                      className="flex-1 rounded-xl border border-gray-300 px-3 py-2 transition-all duration-300 focus:outline-none"
                      step="0.01"
                      min="0"
                      placeholder={t('heightSection.widthPlaceholder')}
                    />
                    <select
                      value={widthUnit}
                      onChange={(event) => setWidthUnit(event.target.value as UnitSystem)}
                      className="rounded-xl border border-gray-300 px-3 py-2 transition-all duration-300 focus:outline-none"
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
                  <p className="mt-1 text-xs text-gray-500">
                    {t('heightSection.autoCalculateTip')}
                  </p>
                </div>

                {imageUrl && (
                  <div className="mb-4 rounded-xl bg-blue-50 p-4">
                    <h4 className="mb-2 flex items-center font-medium text-blue-900">
                      <Crop size={16} className="mr-2" />
                      {t('cropSection.tipsTitle')}
                    </h4>
                    <ul className="space-y-1 text-sm text-blue-700">
                      <li>{t('cropSection.tips.dragCropBox')}</li>
                      <li>{t('cropSection.tips.useZoom')}</li>
                      <li>{t('cropSection.tips.dragImage')}</li>
                      <li>{t('cropSection.tips.savedResult')}</li>
                    </ul>
                  </div>
                )}

                {imageUrl && (
                  <div className="mb-4">
                    <button
                      onClick={clearImagePreview}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm transition-all duration-300 hover:border-gray-400 hover:bg-gray-50"
                    >
                      {t('buttons.reselectImage')}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 border-t border-gray-200 py-4">
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2 transition-all duration-300 hover:border-gray-400 hover:bg-gray-50"
                >
                  {t('buttons.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!imageUrl || !height}
                  className="flex flex-1 items-center justify-center rounded-xl bg-green-theme-500 px-4 py-2 text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-green-theme-600 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                >
                  <Check size={16} className="mr-2" />
                  {t('buttons.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { ImageUploadModal };
