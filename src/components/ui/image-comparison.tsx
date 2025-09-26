"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { type ImageComparison } from "@/types/blocks/base";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function ImageComparison({
  imageComparison
}: { imageComparison: ImageComparison }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const [sliderPosition, setSliderPosition] = useState(() =>
    clamp(imageComparison.defaultSliderPosition, 0, 100)
  );
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newPosition = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(clamp(newPosition, 0, 100));
  }, []);

  useEffect(() => {
    setSliderPosition(clamp(imageComparison.defaultSliderPosition, 0, 100));
  }, [imageComparison.defaultSliderPosition]);

  useEffect(() => {
    return () => {
      const container = containerRef.current;
      if (container && pointerIdRef.current !== null) {
        try {
          container.releasePointerCapture(pointerIdRef.current);
        } catch {
          // ignore release failures, typically happens when component unmounts mid interaction
        }
      }
      pointerIdRef.current = null;
      isDraggingRef.current = false;
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      // Allow touch interactions and left mouse button
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (event.pointerType === "touch") {
        event.preventDefault();
      }

      const container = containerRef.current;
      if (!container) return;

      pointerIdRef.current = event.pointerId;
      isDraggingRef.current = true;
      setIsDragging(true);
      container.setPointerCapture(event.pointerId);
      updatePosition(event.clientX);
    },
    [updatePosition]
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      return;
    }

    const container = containerRef.current;
    if (container && pointerIdRef.current !== null) {
      try {
        container.releasePointerCapture(pointerIdRef.current);
      } catch {
        // ignore
      }
    }

    pointerIdRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) {
        return;
      }

      updatePosition(event.clientX);
    },
    [updatePosition]
  );

  const containerClasses = [
    "relative overflow-hidden select-none touch-pan-y",
    imageComparison.aspectRatio === "horizontal" ? "aspect-[4/3]" : "aspect-[4/5]",
    imageComparison.className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={isDragging ? { cursor: "ew-resize" } : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") {
          endDrag(event);
        }
      }}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(sliderPosition)}
    >
      <div className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <Image
          src={imageComparison.originalImage}
          alt={imageComparison.originalAlt || imageComparison.originalLabel || ""}
          fill
          className={imageComparison.imageFit === "cover" ? "object-cover" : "object-contain"}
          sizes={imageComparison.aspectRatio === "horizontal" ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 25vw"}
        />
        {imageComparison.originalLabel && (
          <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {imageComparison.originalLabel}
          </div>
        )}
      </div>

      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
      >
        <Image
          src={imageComparison.editedImage}
          alt={imageComparison.afterAlt || imageComparison.editedLabel || ""}
          fill
          className={imageComparison.imageFit === "cover" ? "object-cover" : "object-contain"}
          sizes={imageComparison.aspectRatio === "horizontal" ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 25vw"}
        />
        {imageComparison.editedLabel && (
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {imageComparison.editedLabel}
          </div>
        )}
      </div>

      <div
        className="absolute inset-y-0 w-1 bg-white"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
      />

      <button
        type="button"
        aria-label="Adjust comparison"
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white text-black cursor-ew-resize touch-none shadow-lg transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ left: `${sliderPosition}%`, width: 28, height: 28 }}
        onPointerDown={handlePointerDown}
      >
        <span className="sr-only">Adjust comparison slider</span>
      </button>
    </div>
  );
}

export default ImageComparison;

