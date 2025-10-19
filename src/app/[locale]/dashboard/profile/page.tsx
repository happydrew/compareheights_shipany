"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/contexts/app";
import type { User } from "@/types/user";

export default function ProfilePage() {
  const t = useTranslations('profile');
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
      toast.error(t('toast.sign_in_required'));
      return;
    }

    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      toast.error(t('toast.name_required'));
      return;
    }

    if (trimmedDisplayName === (user.nickname || "")) {
      toast.info(t('toast.no_changes'));
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
        throw new Error(result.message || t('toast.update_failed'));
      }

      const nextData = result.data as unknown;

      if (!nextData || Array.isArray(nextData) || typeof nextData !== "object") {
        throw new Error(t('toast.update_failed'));
      }

      const updatedUser = nextData as Partial<User>;

      setUser((prev:User) => {
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

      toast.success(t('toast.update_success'));
    } catch (error) {
      console.error("Update profile error:", error);
      toast.error(error instanceof Error ? error.message : t('toast.update_failed'));
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
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500 sm:text-base">{t('description')}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Avatar */}
        <div>
          <Label>{t('avatar_label')}</Label>
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
              {t('upload_photo')}
            </Button>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <Label htmlFor="displayName">{t('display_name_label')}</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('display_name_placeholder')}
            className="mt-2"
          />
        </div>

        {/* Email (Read-only) */}
        <div>
          <Label htmlFor="email">{t('email_label')}</Label>
          <Input
            id="email"
            value={user?.email || ""}
            disabled
            className="mt-2"
          />
          <p className="text-sm text-gray-500 mt-1">{t('email_cannot_change')}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? t('saving') : t('save_changes')}
          </Button>
        </div>
      </div>
    </div>
  );
}
