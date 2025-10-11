"use client";

import { useParams } from "next/navigation";

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
        toast.error(data.message || "Failed to load custom characters");
      }
    } catch (error) {
      if (controller.signal.aborted || requestId !== latestRequestRef.current) {
        return;
      }
      console.error("Load custom characters error:", error);
      toast.error("Failed to load custom characters");
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
      listAbortControllerRef.current?.abort();
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

      if (Number.isFinite(imageData.heightInM) && imageData.heightInM > 0) {
        setNewHeight(formatHeightValue(imageData.heightInM));
      }

      setIsImageModalOpen(false);
    },
    [maxImageSizeBytes]
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
      toast.error("Name cannot be empty");
      return;
    }

    if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) {
      toast.error("Please enter a valid height in meters");
      return;
    }

    if (!hasAnyImage || (!isEditing && !hasNewImage)) {
      toast.error("Please upload and crop a character image");
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
        throw new Error(data?.message || (isEditing ? "Failed to update custom character" : "Failed to create custom character"));
      }

      toast.success(isEditing ? "Custom character updated" : "Custom character created");
      setIsCreateDialogOpen(false);
      resetFormState();
      await loadCharacters();
    } catch (error) {
      console.error(isEditing ? "Update custom character error:" : "Create custom character error:", error);
      toast.error(error instanceof Error ? error.message : isEditing ? "Failed to update custom character" : "Failed to create custom character");
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
        throw new Error(data?.message || "Failed to delete character");
      }
      toast.success("Character deleted");
      setCharacters((prev) => prev.filter((item) => item.id !== target.id));
      setIsDeleteDialogOpen(false);
      setCharacterToDelete(null);
    } catch (error) {
      console.error("Delete custom character error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete character");
    } finally {
      setDeletingId(null);
    }
  };

  const isEditing = Boolean(editingCharacter);

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">My Characters</h1>
          <p className="text-sm text-gray-500 max-w-2xl sm:text-base">
            Manage the custom characters you have created. Upload images, define their heights, and keep everything organised for quick access inside the comparison tool.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm sm:flex-1">
            <Input
              value={search}
              placeholder="Search characters..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button className="w-full sm:w-auto sm:ml-auto" onClick={handleOpenCreateDialog}>
            Create Character
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
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">No custom characters yet</h2>
            <p className="mt-2 max-w-md text-sm text-gray-500 sm:text-base">
              Create your first custom character to quickly reuse it in any height comparison project.
            </p>
            <Button className="mt-6 w-full sm:w-auto" onClick={handleOpenCreateDialog}>
              Create Character
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
            <DialogTitle>{isEditing ? "Edit Custom Character" : "Create Custom Character"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the character details or upload a new image."
                : "Provide the character details and upload an image. All fields are required."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="character-name">Name</Label>
              <Input
                id="character-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Give your character a name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="character-height">Height (meters)</Label>
              <Input
                id="character-height"
                type="number"
                min="0"
                step="0.01"
                value={newHeight}
                onChange={(event) => setNewHeight(event.target.value)}
                placeholder="e.g. 1.75"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="character-image">Character image</Label>
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
                    <span>Click to upload</span>
                    <span className="text-xs text-gray-400">Crop and adjust before saving</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                We recommend transparent PNGs or JPGs. You can crop and resize the image before saving. Maximum size: {maxImageSizeMB}MB.
              </p>
              {imageError && <p className="text-sm text-red-500">{imageError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSubmitCharacter} disabled={isSaving}>
              {isSaving ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save changes" : "Create"}
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
            <DialogTitle>Delete custom character</DialogTitle>
            <DialogDescription>
              {characterToDelete
                ? `Are you sure you want to delete "${characterToDelete.name}"? This action cannot be undone.`
                : "Are you sure you want to delete this character?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={Boolean(deletingId)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? "Deleting..." : "Delete"}
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
