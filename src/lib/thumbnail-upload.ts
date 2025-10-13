/**
 * Thumbnail upload utilities using presigned URLs
 */

export interface ThumbnailUploadResult {
  key: string;
  publicUrl: string;
}

/**
 * Upload thumbnail blob to R2 using presigned URL
 * @param blob - The thumbnail image blob
 * @returns Upload result with public URL
 */
export async function uploadThumbnailToR2(blob: Blob): Promise<ThumbnailUploadResult> {
  try {
    console.log('Starting thumbnail upload, blob size:', blob.size);

    // 1. Get presigned URL from backend
    const presignedResponse = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'presigned-url',
        fileName: `thumbnail-${Date.now()}.webp`,
        contentType: 'image/webp',
        fileSize: blob.size,
        folder: 'projects',
      }),
    });

    if (!presignedResponse.ok) {
      const errorData = await presignedResponse.json();
      throw new Error(errorData.error || errorData.message || 'Failed to get presigned URL');
    }

    const presignedData = await presignedResponse.json();

    if (!presignedData.success) {
      throw new Error(presignedData.error || presignedData.message || 'Failed to get presigned URL');
    }

    const { uploadUrl, key, publicUrl } = presignedData;

    if (!uploadUrl || !publicUrl) {
      throw new Error('Invalid response: missing uploadUrl or publicUrl');
    }

    console.log('Got presigned URL, uploading to R2...');

    // 2. Upload blob to R2 using presigned URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'image/webp',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status: ${uploadResponse.status}`);
    }

    console.log('Thumbnail uploaded successfully:', publicUrl);

    return { key, publicUrl };
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    throw error instanceof Error ? error : new Error('Thumbnail upload failed');
  }
}

/**
 * Upload thumbnail blob with progress tracking (optional enhancement)
 * @param blob - The thumbnail image blob
 * @param onProgress - Progress callback (0-100)
 * @returns Upload result with public URL
 */
export async function uploadThumbnailWithProgress(
  blob: Blob,
  onProgress?: (progress: number) => void
): Promise<ThumbnailUploadResult> {
  try {
    console.log('Starting thumbnail upload with progress tracking, blob size:', blob.size);

    // 1. Get presigned URL from backend
    const presignedResponse = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'presigned-url',
        fileName: `thumbnail-${Date.now()}.webp`,
        contentType: 'image/webp',
        fileSize: blob.size,
        folder: 'projects',
      }),
    });

    if (!presignedResponse.ok) {
      const errorData = await presignedResponse.json();
      throw new Error(errorData.error || errorData.message || 'Failed to get presigned URL');
    }

    const presignedData = await presignedResponse.json();

    if (!presignedData.success) {
      throw new Error(presignedData.error || presignedData.message || 'Failed to get presigned URL');
    }

    const { uploadUrl, key, publicUrl } = presignedData;

    if (!uploadUrl || !publicUrl) {
      throw new Error('Invalid response: missing uploadUrl or publicUrl');
    }

    console.log('Got presigned URL, uploading to R2 with progress...');

    // 2. Upload using XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (onProgress && event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress(percentage);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('Thumbnail uploaded successfully:', publicUrl);
          resolve({ key, publicUrl });
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Upload failed due to network error'));
      };

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', 'image/webp');
      xhr.send(blob);
    });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    throw error instanceof Error ? error : new Error('Thumbnail upload failed');
  }
}
