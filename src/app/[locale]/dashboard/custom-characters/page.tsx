"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CustomCharacterCard } from "@/components/dashboard/custom-character-card";
import { ImageUploadModal } from "@/components/compareheights/ImageUploadModal";
import { type Character } from "@/lib/types/characters";
import {
  getUserUploadLimits,
  validateBase64Size,
  uploadCustomCharacterImage,
} from "@/lib/custom-character-upload";

interface CustomCharacterResponse {
  success: boolean;
  data?: Character[];
  message?: string;
}

const formatHeightValue = (value: number): string => {
  return value.toFixed(3).replace(/\.?0+$/, "");
};

export default function CustomCharactersPage() {
  const t = useTranslations('custom_characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [newName, setNewName] = useState("");
  const [newHeight, setNewHeight] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [croppedImageData, setCroppedImageData] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload limits based on subscription
  const [maxImageSizeBytes, setMaxImageSizeBytes] = useState(5 * 1024 * 1024);
  const [maxImageSizeMB, setMaxImageSizeMB] = useState(5);

  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "en";

  const latestRequestRef = useRef(0);
  const listAbortControllerRef = useRef<AbortController | null>(null);

  const revokePreview = useCallback((url: string | null) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const resetFormState = useCallback(() => {
    setImagePreview((current) => {
      revokePreview(current);
      return null;
    });
    setCroppedImageData(null);
    setNewName("");
    setNewHeight("");
    setImageError(null);
    setIsImageModalOpen(false);
    setEditingCharacter(null);
    setIsSaving(false);
  }, [revokePreview]);

  const loadCharacters = useCallback(async () => {
    const requestId = (latestRequestRef.current += 1);

    listAbortControllerRef.current?.abort();
    const controller = new AbortController();
    listAbortControllerRef.current = controller;

    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (search.trim()) {
        queryParams.append("search", search.trim());
      }

      const response = await fetch(`/api/custom-characters?${queryParams.toString()}`, {
        signal: controller.signal,
      });
      const data = (await response.json()) as CustomCharacterResponse;

      if (controller.signal.aborted || requestId !== latestRequestRef.current) {
        return;
      }

      if (response.ok && data.success && Array.isArray(data.data)) {
        setCharacters(data.data);
      } else {
        toast.error(data.message || t('toast.load_failed'));
      }
    } catch (error) {
      if (controller.signal.aborted || requestId !== latestRequestRef.current) {
        return;
      }
      console.error("Load custom characters error:", error);
      toast.error(t('toast.load_failed'));
    } finally {
      if (requestId === latestRequestRef.current && !controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [search]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  // Load upload limits on mount
  useEffect(() => {
    const loadLimits = async () => {
      try {
        const limits = await getUserUploadLimits();
        setMaxImageSizeBytes(limits.maxImageSizeBytes);
        setMaxImageSizeMB(limits.maxImageSizeMB);
      } catch (error) {
        console.warn('Failed to load upload limits:', error);
      }
    };
    loadLimits();
  }, []);

  useEffect(() => {
    return () => {
      revokePreview(imagePreview);
    };
  }, [imagePreview, revokePreview]);

  const openImageModal = useCallback(() => {
    setImageError(null);
    setIsImageModalOpen(true);
  }, []);

  const handleImageModalClose = useCallback(() => {
    setIsImageModalOpen(false);
  }, []);

  const handleImageModalSave = useCallback(
    (imageData: { imageUrl: string; heightInM: number; widthInM?: number; aspectRatio: number }) => {
      setImageError(null);

      // Validate size using subscription-based limits
      const validation = validateBase64Size(imageData.imageUrl, maxImageSizeBytes);
      if (!validation.valid) {
        setImageError(validation.error || 'Image too large');
        toast.error(validation.error || 'Image too large');
        return;
      }

      setCroppedImageData(imageData.imageUrl);
      setImagePreview(imageData.imageUrl);

      // Only set height if the height input is empty (don't overwrite user's manual input)
      if (!newHeight && Number.isFinite(imageData.heightInM) && imageData.heightInM > 0) {
        setNewHeight(formatHeightValue(imageData.heightInM));
      }

      setIsImageModalOpen(false);
    },
    [maxImageSizeBytes, newHeight]
  );

  const handleOpenCreateDialog = () => {
    resetFormState();
    setIsCreateDialogOpen(true);
  };

  const handleEditCharacter = (character: Character) => {
    resetFormState();
    setEditingCharacter(character);
    setNewName(character.name ?? "");
    setNewHeight(formatHeightValue(character.height));
    setImagePreview(character.thumbnail_url ?? character.media_url ?? null);
    setIsCreateDialogOpen(true);
  };

  const handleSubmitCharacter = async () => {
    const trimmedName = newName.trim();
    const parsedHeight = Number(newHeight);
    const isEditing = Boolean(editingCharacter);
    const hasNewImage = Boolean(croppedImageData);
    const hasAnyImage = hasNewImage || Boolean(imagePreview || editingCharacter?.thumbnail_url || editingCharacter?.media_url);

    if (!trimmedName) {
      toast.error(t('toast.name_required'));
      return;
    }

    if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) {
      toast.error(t('toast.invalid_height'));
      return;
    }

    if (!hasAnyImage || (!isEditing && !hasNewImage)) {
      toast.error(t('toast.image_required'));
      return;
    }

    try {
      setIsSaving(true);

      if (isEditing && !editingCharacter) {
        throw new Error("Missing character data");
      }

      const endpoint = isEditing
        ? `/api/custom-characters/${editingCharacter!.id}`
        : "/api/custom-characters";
      const method = isEditing ? "PATCH" : "POST";

      const payload: Record<string, unknown> = {
        name: trimmedName,
        height: parsedHeight,
      };

      // Handle image upload - always use presigned URL method
      if (!isEditing || hasNewImage) {
        if (!croppedImageData) {
          throw new Error('Missing image data');
        }

        // Upload image using presigned URL
        const fileName = `character-${Date.now()}.png`;
        const uploadResult = await uploadCustomCharacterImage(croppedImageData, fileName);

        payload.image = {
          key: uploadResult.key,
          publicUrl: uploadResult.publicUrl,
        };
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || (isEditing ? t('toast.update_failed') : t('toast.create_failed')));
      }

      toast.success(isEditing ? t('toast.updated') : t('toast.created'));
      setIsCreateDialogOpen(false);
      resetFormState();
      await loadCharacters();
    } catch (error) {
      console.error(isEditing ? "Update custom character error:" : "Create custom character error:", error);
      toast.error(error instanceof Error ? error.message : isEditing ? t('toast.update_failed') : t('toast.create_failed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDelete = (character: Character) => {
    setCharacterToDelete(character);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!characterToDelete) {
      return;
    }

    const target = characterToDelete;

    try {
      setDeletingId(target.id);
      const response = await fetch(`/api/custom-characters/${target.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || t('toast.delete_failed'));
      }
      toast.success(t('toast.deleted'));
      setCharacters((prev) => prev.filter((item) => item.id !== target.id));
      setIsDeleteDialogOpen(false);
      setCharacterToDelete(null);
    } catch (error) {
      console.error("Delete custom character error:", error);
      toast.error(error instanceof Error ? error.message : t('toast.delete_failed'));
    } finally {
      setDeletingId(null);
    }
  };

  const isEditing = Boolean(editingCharacter);

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">{t('title')}</h1>
          <p className="text-sm text-gray-500 max-w-2xl sm:text-base">
            {t('description')}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm sm:flex-1">
            <Input
              value={search}
              placeholder={t('search_placeholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button className="w-full sm:w-auto sm:ml-auto" onClick={handleOpenCreateDialog}>
            {t('create_character')}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[260px] w-full rounded-xl sm:h-[320px]" />
            ))}
          </div>
        ) : characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center sm:py-16">
            <div className="mb-4 text-4xl">:)</div>
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">{t('no_characters_yet')}</h2>
            <p className="mt-2 max-w-md text-sm text-gray-500 sm:text-base">
              {t('no_characters_description')}
            </p>
            <Button className="mt-6 w-full sm:w-auto" onClick={handleOpenCreateDialog}>
              {t('create_character')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {characters.map((character) => (
              <CustomCharacterCard
                key={character.id}
                character={character}
                locale={locale}
                isDeleting={deletingId === character.id}
                onEdit={handleEditCharacter}
                onDelete={handleRequestDelete}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            resetFormState();
          }
        }}
      >
        <DialogContent
          onInteractOutside={(event) => {
            if (isImageModalOpen) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{isEditing ? t('dialog.edit_title') : t('dialog.create_title')}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? t('dialog.edit_description')
                : t('dialog.create_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="character-name">{t('dialog.name_label')}</Label>
              <Input
                id="character-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={t('dialog.name_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="character-height">{t('dialog.height_label')}</Label>
              <Input
                id="character-height"
                type="number"
                min="0"
                step="0.01"
                value={newHeight}
                onChange={(event) => setNewHeight(event.target.value)}
                placeholder={t('dialog.height_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="character-image">{t('dialog.image_label')}</Label>
              <div
                id="character-image"
                role="button"
                tabIndex={0}
                aria-label="Upload character image"
                onClick={openImageModal}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " " || event.key === "Space") {
                    event.preventDefault();
                    openImageModal();
                  }
                }}
                className={`group relative flex h-48 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 ${imagePreview ? "border-gray-200 bg-white" : "border-dashed border-gray-300 bg-gray-50"} transition-colors hover:border-green-theme-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-theme-500 focus-visible:ring-offset-2`}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Character preview" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-sm text-gray-500">
                    <span>{t('dialog.click_to_upload')}</span>
                    <span className="text-xs text-gray-400">{t('dialog.crop_and_adjust')}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {t('dialog.image_recommendation', { maxSize: maxImageSizeMB })}
              </p>
              {imageError && <p className="text-sm text-red-500">{imageError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSaving}>
              {t('dialog.cancel')}
            </Button>
            <Button onClick={handleSubmitCharacter} disabled={isSaving}>
              {isSaving ? (isEditing ? t('dialog.saving') : t('dialog.creating')) : isEditing ? t('dialog.save_changes') : t('dialog.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && deletingId) {
            return;
          }
          setIsDeleteDialogOpen(open);
          if (!open) {
            setCharacterToDelete(null);
          }
        }}
      >
        <DialogContent
          onInteractOutside={(event) => {
            if (deletingId) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('delete_dialog.title')}</DialogTitle>
            <DialogDescription>
              {characterToDelete
                ? t('delete_dialog.description', { name: characterToDelete.name })
                : t('delete_dialog.description_fallback')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={Boolean(deletingId)}
            >
              {t('delete_dialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? t('delete_dialog.deleting') : t('delete_dialog.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={handleImageModalClose}
        onSave={handleImageModalSave}
      />
    </div>
  );
}
