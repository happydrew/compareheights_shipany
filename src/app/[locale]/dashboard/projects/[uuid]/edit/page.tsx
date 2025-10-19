"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoSaveIndicator } from "@/components/dashboard/auto-save-indicator";
import { HeightCompareTool, type HeightCompareToolRef } from "@/components/compareheights/HeightCompareTool";
import { toast } from "sonner";
import {
  RiArrowLeftLine
} from "react-icons/ri";
import type { Project, ProjectData } from "@/types/project";
import { compareProjectData, compareCharactersArray } from "@/lib/projectDataCompare";
import { SharedCharacterData } from "@/lib/shareUtils";
import { uploadThumbnailToR2 } from "@/lib/thumbnail-upload";

interface ProjectEditPageProps {
  params: Promise<{ uuid: string }>;
}

export default function ProjectEditPage({ params }: ProjectEditPageProps) {
  const t = useTranslations("project_edit");
  const router = useRouter();
  const [uuid, setUuid] = useState<string>("");
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [saveError, setSaveError] = useState<string>();

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const originalTitleRef = useRef<string>("");
  const lastSavedProjectDataRef = useRef<ProjectData | null>(null);
  const isInitialLoadRef = useRef<boolean>(true); // Track if this is the first data load

  // Thumbnail update
  const [isUpdatingThumbnail, setIsUpdatingThumbnail] = useState(false);
  const originalCharactersRef = useRef<SharedCharacterData[]>([]);
  const heightCompareToolRef = useRef<HeightCompareToolRef>(null);
  const hasStoredOriginalCharacters = useRef<boolean>(false); // Track if we've stored the post-load characters

  // Resolve params
  useEffect(() => {
    params.then((p) => setUuid(p.uuid));
  }, [params]);

  // Load project
  useEffect(() => {
    if (!uuid) return;

    const loadProject = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects/${uuid}`);
        const data = await response.json();

        console.log("项目编辑页加载Project data:", JSON.stringify(data));

        if (data.success) {
          setProject(data.data);
          setTitle(data.data.title);
          // Store original values for comparison
          originalTitleRef.current = data.data.title;
          lastSavedProjectDataRef.current = data.data.project_data;
          // Note: originalCharactersRef will be set after HeightCompareTool processes the data
          setHasUnsavedChanges(false);
        } else {
          toast.error(data.message || t("toast.load_failed"));
          router.push("/dashboard/projects");
        }
      } catch (error) {
        console.error("Load project error:", error);
        toast.error(t("toast.load_failed"));
        router.push("/dashboard/projects");
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [uuid, router]);

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    const hasChanges =
      newTitle !== originalTitleRef.current ||
      !compareProjectData(project?.project_data || null, lastSavedProjectDataRef.current);
    setHasUnsavedChanges(hasChanges);
    setSaveStatus(hasChanges ? "unsaved" : "saved");
  };

  // Handle project data change
  const handleProjectDataChange = useCallback(
    (newData: ProjectData) => {
      console.log("=== handleProjectDataChange 被调用 ===");
      console.log("isInitialLoadRef.current:", isInitialLoadRef.current);
      console.log("hasStoredOriginalCharacters.current:", hasStoredOriginalCharacters.current);

      setProject((prev) => (prev ? { ...prev, project_data: newData } : prev));

      // Store the characters data on first onChange (after HeightCompareTool has processed the data)
      if (!hasStoredOriginalCharacters.current) {
        const charactersJson = JSON.stringify(newData.characters || []);
        originalCharactersRef.current = newData.characters || [];
        hasStoredOriginalCharacters.current = true;
        console.log("存储了初始角色数据用于封面更新检测, 长度:", charactersJson.length);
        console.log("存储的数据:", charactersJson.substring(0, 200) + "...");
      }

      // Skip change detection during initial load, but update the original ref
      if (isInitialLoadRef.current) {
        console.log("初始加载中，跳过变更检测，但更新原始数据引用");
        isInitialLoadRef.current = false;
        return;
      }

      const hasChanges =
        title !== originalTitleRef.current ||
        !compareProjectData(newData, lastSavedProjectDataRef.current);
      setHasUnsavedChanges(hasChanges);
      setSaveStatus(hasChanges ? "unsaved" : "saved");
      console.log("检测到数据变化:", hasChanges);
    }, [title]);

  // Manual save
  const handleSave = async () => {
    if (!uuid || !project) return;

    try {
      setSaveStatus("saving");
      const response = await fetch(`/api/projects/${uuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          project_data: project.project_data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update original values after successful save
        originalTitleRef.current = title;
        lastSavedProjectDataRef.current = project.project_data;
        setHasUnsavedChanges(false);
        setSaveStatus("saved");
        setSaveError(undefined);
        toast.success(t("toast.save_success"));
      } else {
        setSaveStatus("error");
        setSaveError(result.message || t("toast.save_failed"));
        toast.error(result.message || t("toast.save_failed"));
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("error");
      setSaveError(t("toast.network_error"));
      toast.error(t("toast.save_failed"));
    }
  };

  // Update project thumbnail using presigned upload
  const updateProjectThumbnail = async (): Promise<boolean> => {
    if (!heightCompareToolRef.current || !uuid) {
      console.warn("Cannot update thumbnail: missing ref or uuid");
      return false;
    }

    try {
      setIsUpdatingThumbnail(true);
      setSaveStatus("saving");

      console.log("Generating thumbnail blob...");

      // 1. Generate thumbnail as Blob
      const thumbnailBlob = await heightCompareToolRef.current.generateThumbnail({ format: 'blob' });
      if (!thumbnailBlob || !(thumbnailBlob instanceof Blob)) {
        throw new Error("Failed to generate thumbnail");
      }

      console.log("Uploading thumbnail to R2...");

      // 2. Upload to R2 using presigned URL
      const uploadResult = await uploadThumbnailToR2(thumbnailBlob);

      console.log("Thumbnail uploaded successfully:", uploadResult.publicUrl);

      // 3. Update project with new thumbnail URL
      const response = await fetch(`/api/projects/${uuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thumbnail_url: uploadResult.publicUrl
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update project");
      }

      console.log("Project thumbnail URL updated successfully");

      // Update originalCharactersRef to prevent duplicate updates
      originalCharactersRef.current = project?.project_data?.characters || [];

      return true;
    } catch (error) {
      console.error("Update thumbnail error:", error);
      toast.error(t("toast.thumbnail_update_failed"));
      return false;
    } finally {
      setIsUpdatingThumbnail(false);
      setSaveStatus("saved");
    }
  };

  // Handle exit with unsaved changes check and thumbnail update
  const handleExit = useCallback(async () => {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      const confirmExit = confirm(t("dialogs.unsaved_changes"));
      if (!confirmExit) {
        return
      } else {
        router.push("/dashboard/projects");
        return;
      };
    }

    // Check if characters changed (for thumbnail update)
    const currentCharacters = project?.project_data?.characters || [];
    const charactersChanged = !compareCharactersArray(currentCharacters, originalCharactersRef.current);

    // console.log("=== 退出时角色变化检测 ===");
    // console.log("原始角色数据:", originalCharactersRef.current);
    // console.log("当前角色数据:", currentCharacters);
    // console.log("是否有变化:", charactersChanged);

    if (charactersChanged &&
      project?.project_data?.characters?.length &&
      project.project_data.characters.length > 0) {
      console.log("Characters changed, updating thumbnail...");

      // Characters changed, update thumbnail
      const success = await updateProjectThumbnail();
      if (!success) {
        // Thumbnail update failed, ask if still want to exit
        const stillExit = confirm(t("dialogs.thumbnail_update_failed"));
        if (!stillExit) return;
      }
    }

    // Exit to projects list
    router.push("/dashboard/projects");
  }, [hasUnsavedChanges, project, router, t]);

  // Warn before closing page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-theme-600 mx-auto mb-4" />
          <p className="text-gray-600">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="flex flex-col w-screen overflow-hidden bg-gray-50 mb-1 border-b border-gray-200">
      {/* Top Bar - 简化版，只保留返回按钮和标题 */}
      <div className="bg-white px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Left: Back button & Breadcrumb & Title */}
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>

          <div className="flex min-w-0 items-center gap-2 text-sm text-gray-500">
            <Link
              href="/dashboard/projects"
              className="hover:text-gray-900 transition-colors whitespace-nowrap"
            >
              {t("breadcrumb.my_projects")}
            </Link>
            <span>/</span>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="h-9 w-full max-w-full border border-transparent px-3 font-medium text-gray-900 focus:border-green-theme-500 focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-7 sm:max-w-xs sm:px-2"
              placeholder={t("breadcrumb.project_title_placeholder")}
            />
          </div>

          {/* Right: Auto-save indicator */}
          <div className="ml-auto px-2">
            <AutoSaveIndicator
              status={isUpdatingThumbnail ? "saving" : saveStatus}
              error={saveError}
              customMessage={isUpdatingThumbnail ? t("auto_save.updating_thumbnail") : undefined}
            />
          </div>
        </div>
      </div>

      {/* Main Content - HeightCompareTool */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <HeightCompareTool
          ref={heightCompareToolRef}
          presetData={project.project_data}
          onChange={handleProjectDataChange}
          onSave={handleSave}
          isProjectEdit={true}
          projectUuid={uuid}
        />
      </div>
    </div>
  );
}
