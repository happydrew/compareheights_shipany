"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeightCompareTool } from "@/components/compareheights/HeightCompareTool";
import { toast } from "sonner";
import { RiShareLine, RiDownloadLine } from "react-icons/ri";
import { formatDistanceToNow } from "date-fns";
import type { ProjectData } from "@/types/project";

interface SharePageProps {
  params: Promise<{ uuid: string }>;
}

export default function SharePage({ params }: SharePageProps) {
  const router = useRouter();
  const [uuid, setUuid] = useState<string>("");
  const [projectData, setProjectData] = useState<{
    title: string;
    project_data: ProjectData;
    view_count: number;
    updated_at: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Resolve params
  useEffect(() => {
    params.then((p) => setUuid(p.uuid));
  }, [params]);

  // Load shared project
  useEffect(() => {
    if (!uuid) return;

    const loadProject = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/share/${uuid}`);
        const data = await response.json();

        if (data.success) {
          setProjectData(data.data);
        } else {
          toast.error(data.message || "Project not found");
          router.push("/");
        }
      } catch (error) {
        console.error("Load shared project error:", error);
        toast.error("Failed to load project");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [uuid, router]);

  // Copy share link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

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

  if (!projectData) {
    return null;
  }

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-green-theme-600">
              CompareHeights
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <RiShareLine className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
            <Link href="/auth/signup">
              <Button size="sm">Create Your Own</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Project Info */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {projectData.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              👁 {projectData.view_count} views
            </span>
            <span>•</span>
            <span>
              Updated{" "}
              {formatDistanceToNow(new Date(projectData.updated_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content - Read-only HeightCompareTool */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <HeightCompareTool
            presetData={projectData.project_data}
            readOnly={true}
          />
        </div>
      </div>

      {/* CTA Footer */}
      <div className="bg-white border-t px-6 py-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600 mb-4">
            Want to create your own height comparison?
          </p>
          <Link href="/auth/signup">
            <Button size="lg">
              Sign Up Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
