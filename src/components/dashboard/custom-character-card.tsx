"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type Character } from "@/lib/types/characters";
import { RiMoreLine, RiEditLine, RiDeleteBinLine } from "react-icons/ri";

interface CustomCharacterCardProps {
  character: Character;
  onEdit?: (character: Character) => void;
  onDelete?: (character: Character) => void;
  locale?: string;
  isDeleting?: boolean;
}

export function CustomCharacterCard({
  character,
  onEdit,
  onDelete,
  isDeleting,
}: CustomCharacterCardProps) {
  const displayHeight = character.height > 3
    ? `${character.height.toFixed(2)} m`
    : `${(character.height * 100).toFixed(1)} cm`;

  const handleEdit = () => {
    onEdit?.(character);
  };

  const handleDelete = () => {
    if (isDeleting) return;
    onDelete?.(character);
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-300 hover:border-green-theme-300 hover:shadow-lg">
      <div
        className="relative aspect-[4/3] w-full bg-gray-50 focus:outline-none"
        aria-label={`Edit ${character.name}`}
      >
        {character.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.thumbnail_url}
            alt={character.name}
            className="absolute inset-0 h-full w-full object-contain transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No preview
          </div>
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <div className="flex flex-1 flex-col px-4 py-2">
        <div className="flex flex-wrap items-center justify-between">
          <span className="line-clamp-2 text-lg font-semibold text-gray-900 transition-colors">{character.name}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 self-start p-0 hover:bg-gray-100 sm:self-auto"
                disabled={isDeleting}
                aria-label="More actions"
              >
                <RiMoreLine className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                <RiEditLine className="mr-2 h-4 w-4" />
                Edit character
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="cursor-pointer"
                variant="destructive"
                disabled={isDeleting}
              >
                <RiDeleteBinLine className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
          <div className="space-y-1 text-sm text-gray-600">
            <span className="block font-medium text-gray-700">Height: {displayHeight}</span>
            {/* <span className="block text-xs text-gray-400">ID: {character.id}</span>
            <span className="block text-xs text-gray-400">Click card or menu to edit</span> */}
          </div>
        </div>
      </div>
    </div>
  );
}
