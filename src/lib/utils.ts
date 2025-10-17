import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 获取元素内容区域尺寸的工具函数
export const getContentRect = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  const paddingTop = parseFloat(style.paddingTop);
  const paddingBottom = parseFloat(style.paddingBottom);
  const paddingLeft = parseFloat(style.paddingLeft);
  const paddingRight = parseFloat(style.paddingRight);

  return {
    width: element.clientWidth - paddingLeft - paddingRight,
    height: element.clientHeight - paddingTop - paddingBottom,
    x: element.clientLeft + paddingLeft,
    y: element.clientTop + paddingTop
  };
};

/**
 * Copy text to clipboard with fallback for mobile browsers
 * @param text - The text to copy
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("Clipboard API failed, trying fallback method:", err);
    }
  }

  // Fallback method for older browsers or when clipboard API fails
  try {
    // Create a temporary textarea element
    const textarea = document.createElement("textarea");
    textarea.value = text;

    // Make it invisible and non-interactive
    textarea.style.position = "fixed";
    textarea.style.left = "-999999px";
    textarea.style.top = "-999999px";
    textarea.setAttribute("readonly", "");

    document.body.appendChild(textarea);

    // Select and copy the text
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const successful = document.execCommand("copy");

    // Clean up
    document.body.removeChild(textarea);

    return successful;
  } catch (err) {
    console.error("Fallback copy method failed:", err);
    return false;
  }
}
