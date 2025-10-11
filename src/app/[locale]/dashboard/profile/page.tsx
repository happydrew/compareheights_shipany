"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/contexts/app";
import type { User } from "@/types/user";

export default function ProfilePage() {
  const { user, setUser } = useAppContext();
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.nickname || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      toast.error("You need to be signed in to update your profile");
      return;
    }

    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      toast.error("Display name is required");
      return;
    }

    if (trimmedDisplayName === (user.nickname || "")) {
      toast.info("No changes to save");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch("/api/update-user-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nickname: trimmedDisplayName }),
      });

      const result = await response.json();

      if (!response.ok || result.code !== 0) {
        throw new Error(result.message || "Failed to update profile");
      }

      const nextData = result.data as unknown;

      if (!nextData || Array.isArray(nextData) || typeof nextData !== "object") {
        throw new Error("Invalid user data returned");
      }

      const updatedUser = nextData as Partial<User>;

      setUser((prev) => {
        if (prev) {
          return {
            ...prev,
            ...updatedUser,
            nickname: updatedUser.nickname ?? trimmedDisplayName,
          };
        }

        return {
          ...(updatedUser as User),
          nickname: updatedUser.nickname ?? trimmedDisplayName,
        };
      });

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Update profile error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const fallbackInitial = (user?.nickname || user?.email || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-3 sm:px-0">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-1 text-sm text-gray-500 sm:text-base">Manage your personal information</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Avatar */}
        <div>
          <Label>Avatar</Label>
          <div className="mt-2 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={user?.avatar_url || ""}
                alt={user?.nickname || user?.email || "User avatar"}
              />
              <AvatarFallback className="text-2xl font-semibold text-gray-600">
                {fallbackInitial}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" disabled className="w-full sm:w-auto">
              Upload Photo (Coming Soon)
            </Button>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="mt-2"
          />
        </div>

        {/* Email (Read-only) */}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={user?.email || ""}
            disabled
            className="mt-2"
          />
          <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
