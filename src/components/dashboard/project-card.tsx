"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiMoreLine,
  RiEditLine,
  RiShareLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiEyeOffLine,
  RiGlobalLine,
  RiLockLine,
} from "react-icons/ri";
import { formatDistanceToNow } from "date-fns";
import type { ProjectListItem } from "@/types/project";

interface ProjectCardProps {
  project: ProjectListItem;
  onEdit: (uuid: string) => void;
  onShare: (uuid: string) => void;
  onDuplicate: (uuid: string) => void;
  onTogglePublic: (uuid: string, isPublic: boolean) => void;
  onDelete: (uuid: string) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onShare,
  onDuplicate,
  onTogglePublic,
  onDelete,
}: ProjectCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group relative bg-white rounded-xl border border-gray-200 hover:border-green-theme-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Thumbnail */}
      <div
        className="relative w-full aspect-video bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer overflow-hidden"
        onClick={() => onEdit(project.uuid)}
      >
        {project.thumbnail_url && !imageError ? (
          <Image
            src={project.thumbnail_url}
            alt={project.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <svg
                className="w-10 h-10 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Public/Private badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm transition-all">
          {project.is_public ? (
            <>
              <RiGlobalLine className="w-3.5 h-3.5 text-green-600" />
              <span className="bg-green-50/90 px-2 py-0.5 rounded-full text-green-700">
                Public
              </span>
            </>
          ) : (
            <>
              <RiLockLine className="w-3.5 h-3.5 text-gray-600" />
              <span className="bg-gray-100/90 px-2 py-0.5 rounded-full text-gray-700">
                Private
              </span>
            </>
          )}
        </div>

        {/* Quick Actions (visible on hover) */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(project.uuid);
            }}
            className="bg-white/95 backdrop-blur-sm hover:bg-white text-gray-900 shadow-md hover:shadow-lg border border-gray-200"
          >
            <RiEditLine className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="mb-3 flex gap-2 items-start justify-between">
          <h3
            className="flex-1 truncate text-base font-semibold text-gray-900 transition-colors hover:text-green-theme-600 sm:text-lg cursor-pointer"
            onClick={() => onEdit(project.uuid)}
            title={project.title}
          >
            {project.title}
          </h3>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 self-start p-0 transition-colors hover:bg-gray-100 sm:self-auto"
              >
                <RiMoreLine className="h-5 w-5 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => onEdit(project.uuid)}
                className="cursor-pointer"
              >
                <RiEditLine className="mr-2 h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onShare(project.uuid)}
                className="cursor-pointer"
              >
                <RiShareLine className="mr-2 h-4 w-4" />
                Share Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDuplicate(project.uuid)}
                className="cursor-pointer"
              >
                <RiFileCopyLine className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onTogglePublic(project.uuid, !project.is_public)}
                className="cursor-pointer"
              >
                {project.is_public ? (
                  <>
                    <RiEyeOffLine className="mr-2 h-4 w-4" />
                    Make Private
                  </>
                ) : (
                  <>
                    <RiEyeLine className="mr-2 h-4 w-4" />
                    Make Public
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(project.uuid)}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <RiDeleteBinLine className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta info */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {project.character_count} {project.character_count === 1 ? "character" : "characters"}
          </span>
          {project.is_public && project.view_count > 0 && (
            <span className="flex items-center gap-1.5">
              <RiEyeLine className="h-4 w-4" />
              {project.view_count} {project.view_count === 1 ? "view" : "views"}
            </span>
          )}
        </div>

        {/* Updated time */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
