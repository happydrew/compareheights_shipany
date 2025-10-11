/**
 * Custom character image upload utilities
 */

export interface UploadResult {
  key: string;
  publicUrl: string;
}

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

/**
 * Get user subscription info to determine file size limits
 */
export async function getUserUploadLimits(): Promise<{
  maxImageSizeMB: number;
  maxImageSizeBytes: number;
  isFreePlan: boolean;
}> {
  try {
    const response = await fetch('/api/subscription/info');
    const data = await response.json();

    const isFreePlan = data.data?.status === 'free';
    const maxImageSizeMB = isFreePlan ? 5 : 10;

    return {
      maxImageSizeMB,
      maxImageSizeBytes: maxImageSizeMB * 1024 * 1024,
      isFreePlan,
    };
  } catch (error) {
    console.warn('Failed to get upload limits, using free tier defaults:', error);
    return {
      maxImageSizeMB: 5,
      maxImageSizeBytes: 5 * 1024 * 1024,
      isFreePlan: true,
    };
  }
}

/**
 * Validate image file before upload
 */
export function validateImageFile(
  file: File,
  maxSizeBytes: number
): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload JPG, PNG, or WebP images.',
    };
  }

  if (file.size > maxSizeBytes) {
    const maxSizeMB = Math.floor(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `Image size exceeds ${maxSizeMB}MB. Please compress the image.`,
    };
  }

  return { valid: true };
}

/**
 * Validate base64 data URL size
 */
export function validateBase64Size(
  dataUrl: string,
  maxSizeBytes: number
): { valid: boolean; error?: string; sizeBytes?: number } {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const sizeBytes = Math.ceil((base64.length * 3) / 4) - padding;

  if (sizeBytes > maxSizeBytes) {
    const maxSizeMB = Math.floor(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `Image size exceeds ${maxSizeMB}MB. Please adjust the crop area or use a smaller image.`,
      sizeBytes,
    };
  }

  return { valid: true, sizeBytes };
}

/**
 * Convert data URL to File object
 */
export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
}

/**
 * Upload custom character image using presigned URL
 */
export async function uploadCustomCharacterImage(
  imageData: string,
  fileName: string,
  options?: UploadOptions
): Promise<UploadResult> {
  try {
    // Convert data URL to File
    const file = dataUrlToFile(imageData, fileName);

    // Get presigned URL from backend
    const presignedResponse = await fetch('/api/custom-characters/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
      signal: options?.signal,
    });

    const presignedData = await presignedResponse.json();

    if (!presignedResponse.ok || !presignedData.success) {
      throw new Error(presignedData.message || 'Failed to get upload URL');
    }

    const { uploadUrl, key, publicUrl } = presignedData.data;

    // Upload file to R2 using presigned URL
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Handle abort signal
      const abortHandler = () => {
        xhr.abort();
        reject(new Error('Upload aborted'));
      };

      if (options?.signal) {
        if (options.signal.aborted) {
          abortHandler();
          return;
        }
        options.signal.addEventListener('abort', abortHandler, { once: true });
      }

      const cleanup = () => {
        if (options?.signal) {
          options.signal.removeEventListener('abort', abortHandler);
        }
      };

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (options?.onProgress && event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          options.onProgress(percentage);
        }
      };

      xhr.onload = () => {
        cleanup();
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ key, publicUrl });
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        cleanup();
        reject(new Error('Upload failed due to network error'));
      };

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error('Upload failed');
  }
}
