"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RiEyeLine } from "react-icons/ri";
import type { ProjectListItem } from "@/types/project";

export default function GalleryPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<"recent" | "popular">("popular");

  // Load public projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ sort });

        const response = await fetch(`/api/projects/public?${params}`);
        const data = await response.json();

        if (data.success) {
          setProjects(data.data);
        } else {
          toast.error(data.message || "Failed to load gallery");
        }
      } catch (error) {
        console.error("Load gallery error:", error);
        toast.error("Failed to load gallery");
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [sort]);

  // View project
  const handleView = (uuid: string) => {
    window.open(`/share/${uuid}`, "_blank");
  };

  // Use as template (duplicate to user's projects)
  const handleUseTemplate = async (uuid: string) => {
    try {
      const response = await fetch(`/api/projects/${uuid}/duplicate`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Template copied to your projects!");
        router.push(`/dashboard/projects/${data.data.uuid}/edit`);
      } else {
        if (response.status === 401) {
          toast.error("Please sign in to use templates");
          router.push("/auth/signin");
        } else {
          toast.error(data.message || "Failed to copy template");
        }
      }
    } catch (error) {
      console.error("Use template error:", error);
      toast.error("Failed to copy template");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Public Gallery</h1>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">
            Explore amazing height comparisons created by others
          </p>
        </div>

        <Select value={sort} onValueChange={(value: any) => setSort(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="recent">Recently Added</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div className="w-full aspect-[4/3] bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center sm:py-16">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-24 w-24"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 sm:text-xl">
            No public projects yet
          </h3>
          <p className="mx-auto max-w-md text-sm text-gray-500 sm:text-base">
            Be the first to share a project with the community!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.uuid}
              className="group bg-white rounded-lg border border-gray-200 hover:border-green-theme-300 hover:shadow-md transition-all overflow-hidden"
            >
              {/* Thumbnail */}
              <div
                className="relative w-full aspect-[4/3] bg-gray-100 cursor-pointer"
                onClick={() => handleView(project.uuid)}
              >
                {project.thumbnail_url ? (
                  <Image
                    src={project.thumbnail_url}
                    alt={project.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <svg
                      className="w-16 h-16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}

                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
              </div>

              {/* Content */}
              <div className="p-4">
                <h3
                  className="font-semibold text-gray-900 truncate mb-2 cursor-pointer hover:text-green-theme-600"
                  onClick={() => handleView(project.uuid)}
                  title={project.title}
                >
                  {project.title}
                </h3>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{project.character_count} characters</span>
                  <span className="flex items-center gap-1">
                    <RiEyeLine className="h-4 w-4" />
                    {project.view_count}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleView(project.uuid)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUseTemplate(project.uuid)}
                  >
                    Use Template
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
