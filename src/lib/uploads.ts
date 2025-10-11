export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  key: string;
  url?: string;
  publicUrl: string;
  temporary?: boolean;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  folder?: string;
  temporary?: boolean;
  route?: string;
}

const DEFAULT_UPLOAD_ROUTE = '/api/upload';
const DIRECT_UPLOAD_THRESHOLD = 3 * 1024 * 1024; // 3MB

const DEFAULT_ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const DEFAULT_ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/avi',
  'video/quicktime',
  'video/x-msvideo',
]);

function getRoute(options?: UploadOptions): string {
  return options?.route ?? DEFAULT_UPLOAD_ROUTE;
}

function resolveTemporary(options?: UploadOptions): boolean {
  return options?.temporary ?? true;
}

function resolveFolder(options?: UploadOptions): string | undefined {
  return options?.folder?.trim() || undefined;
}

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallback);
}

export async function uploadFileDirectly(file: File, options?: UploadOptions): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const route = getRoute(options);
        const temporary = resolveTemporary(options);
        const response = await fetch(route, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: 'direct-upload',
            file: base64Data,
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
            folder: resolveFolder(options),
            temporary,
          }),
          signal: options?.signal,
        });

        const result = await response.json();
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Upload failed');
        }

        resolve({
          key: result.key,
          url: result.url,
          publicUrl: result.publicUrl,
          temporary: typeof result.temporary === 'boolean' ? result.temporary : temporary,
        });
      } catch (error) {
        reject(toError(error, 'Upload failed'));
      }
    };

    reader.onerror = () => {
      reject(toError(reader.error, 'Failed to read file'));
    };

    reader.onprogress = (event) => {
      if (options?.onProgress && event.lengthComputable) {
        options.onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    };

    reader.readAsDataURL(file);
  });
}

export async function uploadFileWithPresignedUrl(file: File, options?: UploadOptions): Promise<UploadResult> {
  try {
    const route = getRoute(options);
    const response = await fetch(route, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'presigned-url',
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        folder: resolveFolder(options),
        temporary: resolveTemporary(options),
      }),
      signal: options?.signal,
    });

    const data = await response.json();
    if (!response.ok || !data?.success || !data.uploadUrl || !data.key) {
      throw new Error(data?.error || 'Failed to get upload URL');
    }

    const uploadResponse = await fetch(data.uploadUrl as string, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
      signal: options?.signal,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status: ${uploadResponse.status}`);
    }

    if (options?.onProgress) {
      options.onProgress({
        loaded: file.size,
        total: file.size,
        percentage: 100,
      });
    }

    return {
      key: data.key as string,
      url: (data.uploadUrl as string)?.split('?')[0],
      publicUrl: data.publicUrl as string,
      temporary: resolveTemporary(options),
    };
  } catch (error) {
    throw toError(error, 'Upload failed');
  }
}

export async function uploadFileWithProgress(file: File, options?: UploadOptions): Promise<UploadResult> {
  const route = getRoute(options);
  const temporary = resolveTemporary(options);

  const presignedResponse = await fetch(route, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method: 'presigned-url',
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      folder: resolveFolder(options),
      temporary,
    }),
  });

  const data = await presignedResponse.json();
  if (!presignedResponse.ok || !data?.success || !data.uploadUrl || !data.key || !data.publicUrl) {
    throw new Error(data?.error || 'Failed to get upload URL');
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

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

    xhr.upload.onprogress = (event) => {
      if (options?.onProgress && event.lengthComputable) {
        options.onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          key: data.key as string,
          url: (data.uploadUrl as string).split('?')[0],
          publicUrl: data.publicUrl as string,
          temporary,
        });
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error('Upload failed due to network error'));
    };

    xhr.open('PUT', data.uploadUrl as string);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

export function uploadFileViaServerProxy(file: File, options?: UploadOptions): Promise<UploadResult> {
  const route = getRoute(options);
  const temporary = resolveTemporary(options);

  return new Promise((resolve, reject) => {
    let settled = false;

    const resolveOnce = (result: UploadResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(toError(error, 'Upload failed'));
    };

    const xhr = new XMLHttpRequest();

    const abortHandler = () => {
      xhr.abort();
      rejectOnce(new Error('Upload aborted'));
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

    xhr.upload.onprogress = (event) => {
      if (options?.onProgress && event.lengthComputable) {
        options.onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = xhr.responseType === 'json' && xhr.response
            ? xhr.response
            : JSON.parse(xhr.responseText || '{}');

          if (!response || response.error || !response.success) {
            rejectOnce(new Error(response?.error || 'Upload failed'));
            return;
          }

          resolveOnce({
            key: response.key,
            url: response.url,
            publicUrl: response.publicUrl,
            temporary: typeof response.temporary === 'boolean' ? response.temporary : temporary,
          });
        } catch (error) {
          rejectOnce(error);
        }
      } else {
        rejectOnce(new Error(`Upload failed with status: ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      cleanup();
      rejectOnce(new Error('Upload failed due to network error'));
    };

    xhr.open('POST', route);
    xhr.responseType = 'json';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('contentType', file.type);
    formData.append('fileSize', String(file.size));
    if (options?.folder) {
      formData.append('folder', options.folder);
    }
    formData.append('temporary', temporary ? 'true' : 'false');

    xhr.send(formData);
  });
}

export async function uploadFile(file: File, options?: UploadOptions): Promise<UploadResult> {
  if (file.size < DIRECT_UPLOAD_THRESHOLD) {
    return uploadFileDirectly(file, options);
  }

  try {
    return await uploadFileWithProgress(file, options);
  } catch (error) {
    const aborted = options?.signal?.aborted || (error instanceof Error && error.message === 'Upload aborted');

    if (aborted) {
      throw error instanceof Error ? error : new Error('Upload aborted');
    }

    console.warn('Presigned upload failed, falling back to proxy upload:', error);
    return uploadFileViaServerProxy(file, options);
  }
}

export function validateFile(file: File, opts?: { allowVideos?: boolean; maxImageSizeMB?: number; maxVideoSizeMB?: number; isFreePlan?: boolean; }): { valid: boolean; error?: string } {
  const allowVideos = opts?.allowVideos ?? false;

  // 根据订阅状态设置图片大小限制
  let maxImageSize: number;
  if (opts?.maxImageSizeMB !== undefined) {
    maxImageSize = opts.maxImageSizeMB * 1024 * 1024;
  } else if (opts?.isFreePlan !== undefined) {
    maxImageSize = opts.isFreePlan ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  } else {
    maxImageSize = 10 * 1024 * 1024; // 默认10MB
  }

  const maxVideoSize = (opts?.maxVideoSizeMB ?? 100) * 1024 * 1024;

  const allowedTypes = new Set([...DEFAULT_ALLOWED_IMAGE_TYPES, ...(allowVideos ? Array.from(DEFAULT_ALLOWED_VIDEO_TYPES) : [])]);

  if (!allowedTypes.has(file.type)) {
    return {
      valid: false,
      error: allowVideos
        ? 'Unsupported file type. Please upload JPG, PNG, WebP images or MP4, AVI, MOV videos.'
        : 'Unsupported file type. Please upload JPG, PNG, or WebP images.',
    };
  }

  const maxSize = file.type.startsWith('video/') ? maxVideoSize : maxImageSize;
  if (file.size > maxSize) {
    const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
    const fileType = file.type.startsWith('video/') ? 'videos' : 'images';
    const planType = opts?.isFreePlan === true ? ' (free plan)' : opts?.isFreePlan === false ? ' (paid plan)' : '';
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB for ${fileType}${planType}.`,
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getFileCategory(file: File): 'image' | 'video' | 'unknown' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'unknown';
}
