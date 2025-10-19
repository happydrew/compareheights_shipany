"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectCard } from "@/components/dashboard/project-card";
import { toast } from "sonner";
import { RiAddLine, RiSearchLine, RiFilter3Line } from "react-icons/ri";
import type { ProjectListItem } from "@/types/project";
import { copyToClipboard } from "@/lib/utils";
import { Link as I18nLink } from '@/i18n/navigation';

export default function ProjectsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = useTranslations('projects');
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "views">("recent");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<
    Pick<ProjectListItem, "uuid" | "title"> | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const latestRequestRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load projects
  const loadProjects = useCallback(async () => {
    const requestId = (latestRequestRef.current += 1);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        sort,
        ...(search && { search }),
      });

      const response = await fetch(`/api/projects?${params}`, {
        signal: controller.signal,
      });
      const data = await response.json();

      if (controller.signal.aborted || requestId !== latestRequestRef.current) {
        return;
      }

      if (data.success) {
        setProjects(data.data.projects);
        setTotal(data.data.total);
      } else {
        toast.error(data.message || t('toast.load_failed'));
      }
    } catch (error) {
      if (controller.signal.aborted || requestId !== latestRequestRef.current) {
        return;
      }

      console.error("Load projects error:", error);
      toast.error(t('toast.load_failed'));
    } finally {
      if (
        requestId === latestRequestRef.current &&
        !controller.signal.aborted
      ) {
        setIsLoading(false);
      }
    }
  }, [search, sort]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Create new project
  const handleOpenCreateDialog = () => {
    setNewProjectTitle("");
    setIsCreateDialogOpen(true);
  };

  const handleSubmitCreateProject = async () => {
    const trimmedTitle = newProjectTitle.trim();

    if (!trimmedTitle) {
      toast.error(t('toast.name_required'));
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          project_data: {
            characters: [],
            settings: {
              unit: "cm",
              chartTitle: "Height Comparison",
              backgroundColor: "#ffffff",
              gridLines: true,
              labels: true,
              shadows: true,
              theme: "light",
              chartHeight: 600,
              spacing: 100,
            },
            metadata: {
              version: "1.0",
              characterCount: 0,
            },
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsCreateDialogOpen(false);
        setNewProjectTitle("");
        router.push(`${locale != 'en' ? '/' + locale : ''}/dashboard/projects/${data.data.uuid}/edit`);
      } else {
        toast.error(data.message || t('toast.create_failed'));
      }
    } catch (error) {
      console.error("Create project error:", error);
      toast.error(t('toast.create_failed'));
    } finally {
      setIsCreating(false);
    }
  };

  // Edit project
  const handleEdit = (uuid: string) => {
    router.push(`${locale != 'en' ? '/' + locale : ''}/dashboard/projects/${uuid}/edit`);
  };

  // Share project
  const handleShare = async (uuid: string) => {
    const shareUrl = `${window.location.origin}${locale != 'en' ? '/' + locale : ''}/share/project/${uuid}`;

    const success = await copyToClipboard(shareUrl);
    if (success) {
      toast.success(t('toast.share_copied'));
    } else {
      toast.error(t('toast.share_failed'));
    }
  };

  // Duplicate project
  const handleDuplicate = async (uuid: string) => {
    try {
      const response = await fetch(`/api/projects/${uuid}/duplicate`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('toast.duplicate_success'));
        loadProjects();
      } else {
        toast.error(data.message || t('toast.duplicate_failed'));
      }
    } catch (error) {
      console.error("Duplicate project error:", error);
      toast.error(t('toast.duplicate_failed'));
    }
  };

  // Toggle public/private
  const handleTogglePublic = async (uuid: string, isPublic: boolean) => {
    // If trying to make project public, show coming soon message
    if (isPublic) {
      toast.info(t('toast.coming_soon'));
      return;
    }

    // Allow making project private
    try {
      const response = await fetch(`/api/projects/${uuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: isPublic }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('toast.now_private'));
        loadProjects();
      } else {
        toast.error(data.message || t('toast.update_failed'));
      }
    } catch (error) {
      console.error("Toggle public error:", error);
      toast.error(t('toast.update_failed'));
    }
  };

  // Delete project
  const handleDeleteRequest = (uuid: string) => {
    const project = projects.find((item) => item.uuid === uuid);

    if (!project) {
      toast.error(t('toast.unable_to_find'));
      return;
    }

    setProjectToDelete({ uuid: project.uuid, title: project.title });
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/projects/${projectToDelete.uuid}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('toast.delete_success'));
        setIsDeleteDialogOpen(false);
        setProjectToDelete(null);
        loadProjects();
      } else {
        toast.error(data.message || t('toast.delete_failed'));
      }
    } catch (error) {
      console.error("Delete project error:", error);
      toast.error(t('toast.delete_failed'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 sm:mt-2">
            {total === 1 ? t('projects_count_single', { count: total }) : t('projects_count_plural', { count: total })}
          </p>
        </div>
        <Button
          onClick={handleOpenCreateDialog}
          size="lg"
          className="w-full sm:w-auto bg-gradient-to-r from-green-theme-600 to-green-theme-700 hover:from-green-theme-700 hover:to-green-theme-800 shadow-md hover:shadow-lg transition-all"
        >
          <RiAddLine className="mr-2 h-5 w-5" />
          {t('new_project')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl bg-white md:flex-row md:items-center md:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder={t('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-gray-200 focus:border-green-theme-500 focus:ring-green-theme-500"
          />
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 sm:justify-end">
            <RiFilter3Line className="h-5 w-5 text-gray-400" />
            <span className="sm:hidden">{t('sort_projects')}</span>
          </div>
          <Select value={sort} onValueChange={(value: any) => setSort(value)}>
            <SelectTrigger className="w-full border-gray-200 sm:w-48">
              <SelectValue placeholder={t('sort_by')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{t('sort_recent')}</SelectItem>
              <SelectItem value="name">{t('sort_name')}</SelectItem>
              <SelectItem value="views">{t('sort_views')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="w-full aspect-[4/3] bg-gray-100 animate-pulse" />
              <div className="space-y-3 p-4 sm:p-5">
                <div className="h-5 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center shadow-sm sm:py-16 lg:py-20">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 sm:h-24 sm:w-24">
            <svg
              className="h-12 w-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 sm:text-xl">
            {t('no_projects_yet')}
          </h3>
          <p className="mx-auto mb-8 max-w-sm text-sm text-gray-500 sm:text-base">
            {t('no_projects_description')}
          </p>
          <Button
            onClick={handleOpenCreateDialog}
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-green-theme-600 to-green-theme-700 hover:from-green-theme-700 hover:to-green-theme-800"
          >
            <RiAddLine className="mr-2 h-5 w-5" />
            {t('create_first_project')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.uuid}
              project={project}
              onEdit={handleEdit}
              onShare={handleShare}
              onDuplicate={handleDuplicate}
              onTogglePublic={handleTogglePublic}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setProjectToDelete(null);
            setIsDeleting(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete_dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('delete_dialog.description')}{" "}
              <span className="font-semibold text-gray-900">
                {projectToDelete?.title || "this project"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('delete_dialog.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              className="min-w-[120px]"
              disabled={isDeleting}
            >
              {isDeleting ? t('delete_dialog.deleting') : t('delete_dialog.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setNewProjectTitle("");
            setIsCreating(false);
          }
        }}
      >
        <DialogContent>
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isCreating) {
                handleSubmitCreateProject();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('dialog.create_title')}</DialogTitle>
              <DialogDescription>
                {t('dialog.create_description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="project-name">{t('dialog.project_name_label')}</Label>
              <Input
                id="project-name"
                placeholder={t('dialog.project_name_placeholder')}
                value={newProjectTitle}
                onChange={(event) => setNewProjectTitle(event.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
              >
                {t('dialog.cancel')}
              </Button>
              <Button
                type="submit"
                className="min-w-[120px]"
                disabled={isCreating || !newProjectTitle.trim()}
              >
                {isCreating ? t('dialog.saving') : t('dialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}






