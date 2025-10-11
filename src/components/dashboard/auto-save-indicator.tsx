"use client";

import { useEffect, useState } from "react";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  error?: string;
  customMessage?: string; // 自定义消息（用于特殊状态，如"正在更新项目封面..."）
}

export function AutoSaveIndicator({ status, error, customMessage }: AutoSaveIndicatorProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (status === "saving" || status === "error" || status === "unsaved") {
      setShow(true);
    } else if (status === "saved") {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!show && status === "saved") return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === "unsaved" && (
        <>
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-gray-600">Unsaved changes</span>
        </>
      )}
      {status === "saving" && (
        <>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-gray-600">{customMessage || "Saving..."}</span>
        </>
      )}
      {status === "saved" && (
        <>
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-600">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-600">{error || "Save failed"}</span>
        </>
      )}
    </div>
  );
}
