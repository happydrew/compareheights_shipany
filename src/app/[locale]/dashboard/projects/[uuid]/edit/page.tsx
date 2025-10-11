"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoSaveIndicator } from "@/components/dashboard/auto-save-indicator";
import { HeightCompareTool, type HeightCompareToolRef } from "@/components/compareheights/HeightCompareTool";
import { toast } from "sonner";
import {
  RiArrowLeftLine,
  RiSaveLine,
  RiEyeLine,
  RiShareLine,
  RiDownloadLine,
} from "react-icons/ri";
import type { Project, ProjectData } from "@/types/project";

interface ProjectEditPageProps {
  params: Promise<{ uuid: string }>;
}

export default function ProjectEditPage({ params }: ProjectEditPageProps) {
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
  const originalProjectDataRef = useRef<ProjectData | null>(null);
  const isInitialLoadRef = useRef<boolean>(true); // Track if this is the first data load

  // Thumbnail update
  const [isUpdatingThumbnail, setIsUpdatingThumbnail] = useState(false);
  const originalCharactersRef = useRef<string>("");
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
          originalProjectDataRef.current = data.data.project_data;
          // Note: originalCharactersRef will be set after HeightCompareTool processes the data
          setHasUnsavedChanges(false);
        } else {
          toast.error(data.message || "Failed to load project");
          router.push("/dashboard/projects");
        }
      } catch (error) {
        console.error("Load project error:", error);
        toast.error("Failed to load project");
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
      JSON.stringify(project?.project_data) !== JSON.stringify(originalProjectDataRef.current);
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
        originalCharactersRef.current = charactersJson;
        hasStoredOriginalCharacters.current = true;
        console.log("存储了初始角色数据用于封面更新检测, 长度:", charactersJson.length);
        console.log("存储的数据:", charactersJson.substring(0, 200) + "...");
      }

      // Skip change detection during initial load
      if (isInitialLoadRef.current) {
        console.log("初始加载中，跳过变更检测");
        isInitialLoadRef.current = false;
        return;
      }

      const hasChanges =
        title !== originalTitleRef.current ||
        JSON.stringify(newData) !== JSON.stringify(originalProjectDataRef.current);
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
        originalProjectDataRef.current = project.project_data;
        originalCharactersRef.current = JSON.stringify(project.project_data.characters || []);
        setHasUnsavedChanges(false);
        setSaveStatus("saved");
        setSaveError(undefined);
        toast.success("Project saved successfully");
      } else {
        setSaveStatus("error");
        setSaveError(result.message || "Save failed");
        toast.error(result.message || "Failed to save project");
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("error");
      setSaveError("Network error");
      toast.error("Failed to save project");
    }
  };

  // Preview (open share page in new tab)
  const handlePreview = () => {
    if (!project?.is_public) {
      toast.error("Please make the project public first to preview");
      return;
    }
    window.open(`/share/${uuid}`, "_blank");
  };

  // Share
  const handleShare = async () => {
    if (!project?.is_public) {
      // Ask to make public first
      const makePublic = confirm(
        "This project is private. Make it public to share?"
      );
      if (!makePublic) return;

      try {
        const response = await fetch(`/api/projects/${uuid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_public: true }),
        });

        const result = await response.json();
        if (!result.success) {
          toast.error("Failed to make project public");
          return;
        }

        setProject((prev) => (prev ? { ...prev, is_public: true } : prev));
      } catch (error) {
        toast.error("Failed to make project public");
        return;
      }
    }

    const shareUrl = `${window.location.origin}/share/${uuid}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  // Update project thumbnail
  const updateProjectThumbnail = async (): Promise<boolean> => {
    if (!heightCompareToolRef.current || !uuid) {
      console.warn("Cannot update thumbnail: missing ref or uuid");
      return false;
    }

    try {
      setIsUpdatingThumbnail(true);
      setSaveStatus("saving");

      console.log("Generating thumbnail...");

      // Generate thumbnail
      const thumbnailData = await heightCompareToolRef.current.generateThumbnail();
      if (!thumbnailData) {
        throw new Error("Failed to generate thumbnail");
      }

      console.log("Uploading thumbnail...");

      // Upload and update
      const response = await fetch(`/api/projects/${uuid}/thumbnail`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailData }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update thumbnail");
      }

      console.log("Thumbnail updated successfully:", result.data.thumbnail_url);

      // Update originalCharactersRef to prevent duplicate updates
      originalCharactersRef.current = JSON.stringify(project?.project_data?.characters || []);

      return true;
    } catch (error) {
      console.error("Update thumbnail error:", error);
      toast.error("Failed to update project thumbnail");
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
      const confirmExit = confirm(
        "You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      );
      if (!confirmExit) return;
    }

    // Check if characters changed (for thumbnail update)
    const currentCharacters = JSON.stringify(project?.project_data?.characters || []);
    const charactersChanged = currentCharacters !== originalCharactersRef.current;

    console.log("=== 退出时角色变化检测 ===");
    console.log("原始角色数据:", originalCharactersRef.current);
    console.log("当前角色数据:", currentCharacters);
    console.log("是否有变化:", charactersChanged);

    if (charactersChanged &&
      project?.project_data?.characters?.length &&
      project.project_data.characters.length > 0) {
      console.log("Characters changed, updating thumbnail...");

      // Characters changed, update thumbnail
      const success = await updateProjectThumbnail();
      if (!success) {
        // Thumbnail update failed, ask if still want to exit
        const stillExit = confirm(
          "Failed to update project thumbnail. Do you still want to exit?"
        );
        if (!stillExit) return;
      }
    }

    // Exit to projects list
    router.push("/dashboard/projects");
  }, [hasUnsavedChanges, project, router]);

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
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="flex flex-col w-screen overflow-hidden bg-gray-50 mb-1 border-b border-gray-200">
      {/* Top Bar */}
      <div className="bg-white px-4 py-2 flex-shrink-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Breadcrumb & Title */}
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-2 lg:flex-1">
            <Button variant="ghost" size="sm" onClick={handleExit}>
              <RiArrowLeftLine className="h-5 w-5" />
            </Button>

            <div className="flex min-w-0 items-center gap-2 text-sm text-gray-500">
              <Link
                href="/dashboard/projects"
                className="hover:text-gray-900 transition-colors whitespace-nowrap"
              >
                My Projects
              </Link>
              <span>/</span>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="h-9 w-full max-w-full border border-transparent px-3 font-medium text-gray-900 focus:border-green-theme-500 focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-7 sm:max-w-xs sm:px-2"
                placeholder="Project title"
              />
            </div>
          </div>

          {/* Right: Auto-save indicator & Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <AutoSaveIndicator
              status={isUpdatingThumbnail ? "saving" : saveStatus}
              error={saveError}
              customMessage={isUpdatingThumbnail ? "Updating project thumbnail..." : undefined}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" size="sm" onClick={handleSave} className="w-full sm:w-auto">
                <RiSaveLine className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handlePreview} className="w-full sm:w-auto">
                <RiEyeLine className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare} className="w-full sm:w-auto">
                <RiShareLine className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - HeightCompareTool */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <HeightCompareTool
          ref={heightCompareToolRef}
          presetData={project.project_data}
          onChange={handleProjectDataChange}
        />
      </div>
    </div>
  );
}
