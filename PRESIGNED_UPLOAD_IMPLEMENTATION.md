# Presigned URL Upload Implementation Summary

## Overview
Migrated all image uploads to use presigned URL method with client-side validation based on subscription tier.

## Changes Made

### 1. Backend API Updates

#### New API Endpoints
- **`/api/custom-characters/presigned-url`**: Generate presigned URL for custom character image uploads
  - Validates file type (JPG, PNG, WebP)
  - Checks file size based on user subscription (5MB for free, 10MB for paid)
  - Returns presigned upload URL and public URL

- **`/api/subscription/info`**: Get user subscription information
  - Returns plan status and quotas
  - Used by frontend to determine file size limits

#### Updated API Routes
- **`/api/custom-characters` (POST)**:
  - Now accepts presigned upload results via `image.key` and `image.publicUrl`
  - Fallback support for base64 direct upload (backward compatibility)
  - Updated to use UUID for file naming instead of character ID

- **`/api/custom-characters/[id]` (PATCH)**:
  - Now accepts presigned upload results
  - Updated to use UUID for file naming
  - Maintains backward compatibility with base64 uploads

- **`/api/projects/[uuid]/thumbnail` (PATCH)**:
  - Updated to use UUID for file naming
  - Changed from `${uuid}-${Date.now()}.webp` to `${randomUUID()}.webp`

### 2. Client Library Updates

#### New Utility Library: `src/lib/custom-character-upload.ts`
Provides client-side utilities for custom character image uploads:

```typescript
// Get upload limits based on subscription
getUserUploadLimits(): Promise<{
  maxImageSizeMB: number;
  maxImageSizeBytes: number;
  isFreePlan: boolean;
}>

// Validate image file before upload
validateImageFile(file: File, maxSizeBytes: number): {
  valid: boolean;
  error?: string;
}

// Validate base64 data URL size
validateBase64Size(dataUrl: string, maxSizeBytes: number): {
  valid: boolean;
  error?: string;
  sizeBytes?: number;
}

// Upload custom character image using presigned URL
uploadCustomCharacterImage(
  imageData: string,
  fileName: string,
  options?: UploadOptions
): Promise<UploadResult>
```

### 3. Frontend Updates

#### Custom Characters Page (`src/app/[locale]/dashboard/custom-characters/page.tsx`)
- Added subscription-based file size limits (loaded on mount)
- Updated `handleImageModalSave` to validate using subscription limits
- Updated `handleSubmitCharacter` to use presigned URL upload
- Removed dependency on old upload threshold logic
- Shows max file size in UI based on user's subscription

**Key Changes:**
```typescript
// Before (old approach)
if (imageSizeBytes > PRESIGNED_UPLOAD_THRESHOLD) {
  // Use presigned URL for large files
} else {
  // Use base64 for small files
}

// After (new approach)
// Always use presigned URL method
const uploadResult = await uploadCustomCharacterImage(croppedImageData, fileName);
```

### 4. File Naming Strategy

**Old Approach:**
- Custom characters: `${characterId}.png` or `${characterId}-${Date.now()}.png`
- Project thumbnails: `${uuid}-${Date.now()}.webp`

**New Approach (UUID Only):**
- Custom characters: `${randomUUID()}.png`
- Project thumbnails: `${randomUUID()}.webp`

**Benefits:**
- Better privacy (no exposure of internal IDs)
- Cleaner file naming
- Prevents filename conflicts
- More secure

## Subscription-Based Limits

### Free Plan
- Max image size: 5MB
- Max projects: 5
- Max custom characters: 10

### Paid Plan
- Max image size: 10MB
- Higher project and character limits (configured in pricing)

## Upload Flow

### New Upload Process

1. **Client-Side Validation**
   - User crops image in ImageUploadModal
   - Frontend validates image size based on subscription tier
   - Shows error if exceeds limit

2. **Get Presigned URL**
   ```typescript
   POST /api/custom-characters/presigned-url
   Body: {
     fileName: "character-123456789.png",
     contentType: "image/png",
     fileSize: 1234567
   }
   ```

3. **Upload to R2**
   - Client uploads directly to R2 using presigned URL
   - Progress tracking via XMLHttpRequest
   - No server proxy required

4. **Create/Update Character**
   ```typescript
   POST /api/custom-characters
   Body: {
     name: "My Character",
     height: 1.75,
     image: {
       key: "custom-characters/abc-123-uuid.png",
       publicUrl: "https://domain.com/bucket/custom-characters/abc-123-uuid.png"
     }
   }
   ```

### Backward Compatibility

The system still supports base64 direct upload for:
- Existing code that hasn't been updated
- Fallback in case presigned URL fails
- Testing and development

## Benefits of This Implementation

1. **Better Performance**
   - Direct upload to R2 without server proxy
   - Reduced server load
   - Faster upload speeds

2. **Client-Side Validation**
   - Immediate feedback on file size
   - No wasted server requests for oversized files
   - Better UX with subscription-aware limits

3. **Security**
   - UUID-based file naming prevents ID exposure
   - Presigned URLs have expiration (1 hour)
   - Server still validates all uploads

4. **Scalability**
   - Server doesn't process large file uploads
   - R2 handles all upload traffic
   - Easy to adjust quotas per subscription tier

## Testing Checklist

- [ ] Create custom character with image < 5MB (free user)
- [ ] Try to upload image > 5MB (free user) - should show error
- [ ] Create custom character with image < 10MB (paid user)
- [ ] Edit custom character and change image
- [ ] Verify old character image is deleted from R2
- [ ] Create project and verify thumbnail generation
- [ ] Edit project with character changes - thumbnail updates
- [ ] Check R2 storage - verify UUID file naming
- [ ] Test with slow network - progress indicator works

## Migration Notes

### For Existing Users
- No migration required
- Old images remain accessible
- New uploads use new UUID naming
- Old images deleted when character updated

### For Developers
- Use `uploadCustomCharacterImage()` for new character uploads
- Backend automatically handles both presigned and base64 uploads
- All new files use UUID naming strategy

## Future Improvements

1. **Project Creation Upload**
   - Migrate project initial thumbnail upload to presigned URL
   - Currently only exit-time thumbnail update uses base64

2. **Cleanup Old Files**
   - Add cron job to remove orphaned R2 files
   - Track file references in database

3. **CDN Integration**
   - Add CloudFlare CDN for faster image delivery
   - Cache headers optimization

4. **Image Optimization**
   - Auto-resize images to optimal dimensions
   - Convert to WebP for better compression
   - Generate multiple sizes for responsive images
