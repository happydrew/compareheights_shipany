"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/icon";
import { Upload, ImageIcon, Zap, Copy, X, Loader2 } from "lucide-react";
import { useAppContext } from "@/contexts/app";
import { useSession } from "next-auth/react";
import { isAuthEnabled } from "@/lib/auth";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FaCoins } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";

interface ImageEditorProps {
  id?: string;
  className?: string;
}
interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
}
type AspectRatio = {
  value: string;
  label: string;
};
const aspectRatios: AspectRatio[] = [
  { value: "auto", label: "Auto" },
  { value: "1:1", label: "Square (1:1)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "4:3", label: "Landscape (4:3)" },
  { value: "16:9", label: "Landscape (16:9)" },
];
export default function ImageEditor({ className, id }: ImageEditorProps) {
  const t = useTranslations();
  const { setShowSignModal, promptFromTemplate, setPromptFromTemplate } = useAppContext();
  const { data: session } = isAuthEnabled() ? useSession() : { data: null };
  const isLoggedIn = session && session.user;

  const [selectedTab, setSelectedTab] = useState("image-to-image");
  const [prompt, setPrompt] = useState(
    "Make the image more vibrant and add dramatic lighting effects",
  );
  const [selectedAspectRatio, setSelectedAspectRatio] =
    useState<string>("auto");
  const [showAspectRatioDropdown, setShowAspectRatioDropdown] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(
    null,
  );
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [progressStartTime, setProgressStartTime] = useState<number | null>(
    null,
  );
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aspectRatioRef = useRef<HTMLDivElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const selectedAspectLabel = useMemo(() => {
    const aspectRatioMap: Record<string, string> = {
      auto: t("imageEditor.aspectRatios.auto"),
      "1:1": t("imageEditor.aspectRatios.square"),
      "3:4": t("imageEditor.aspectRatios.portraitSmall"),
      "9:16": t("imageEditor.aspectRatios.portraitLarge"),
      "4:3": t("imageEditor.aspectRatios.landscapeSmall"),
      "16:9": t("imageEditor.aspectRatios.landscapeLarge"),
    };
    return (
      aspectRatioMap[selectedAspectRatio] ||
      selectedAspectRatio ||
      t("imageEditor.aspectRatios.auto")
    );
  }, [selectedAspectRatio, t]);

  // Function to get user-friendly error message and suggestions
  const getErrorDetails = useCallback((errorMessage: string) => {
    if (errorMessage.includes("Director: unexpected error")) {
      return {
        title: t("imageEditor.errors.aiProcessingError.title"),
        message: t("imageEditor.errors.aiProcessingError.message"),
        suggestion: t("imageEditor.errors.aiProcessingError.suggestion")
      };
    } else if (errorMessage.includes("E6716")) {
      return {
        title: t("imageEditor.errors.serviceUnavailable.title"),
        message: t("imageEditor.errors.serviceUnavailable.message"),
        suggestion: t("imageEditor.errors.serviceUnavailable.suggestion")
      };
    } else if (errorMessage.includes("422") || errorMessage.includes("Invalid request format")) {
      return {
        title: t("imageEditor.errors.invalidRequest.title"),
        message: t("imageEditor.errors.invalidRequest.message"),
        suggestion: t("imageEditor.errors.invalidRequest.suggestion")
      };
    } else if (errorMessage.includes("timeout") || errorMessage.includes("Task timeout")) {
      return {
        title: t("imageEditor.errors.timeout.title"),
        message: t("imageEditor.errors.timeout.message"),
        suggestion: t("imageEditor.errors.timeout.suggestion")
      };
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return {
        title: t("imageEditor.errors.networkError.title"),
        message: t("imageEditor.errors.networkError.message"),
        suggestion: t("imageEditor.errors.networkError.suggestion")
      };
    } else {
      return {
        title: t("imageEditor.errors.general.title"),
        message: errorMessage || t("imageEditor.errors.general.message"),
        suggestion: t("imageEditor.errors.general.suggestion")
      };
    }
  }, [t]);

  // Auto-fill prompt from template context
  useEffect(() => {
    if (promptFromTemplate) {
      console.log('Setting prompt from template:', promptFromTemplate);
      setPrompt(promptFromTemplate);
      // Switch to image-to-image mode when using templates
      setSelectedTab("image-to-image");
      console.log('Switched to image-to-image mode');

      // Clear the template prompt after using it
      setPromptFromTemplate(null);
    }
  }, [promptFromTemplate, setPromptFromTemplate]);

  // Close aspect ratio dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        aspectRatioRef.current &&
        !aspectRatioRef.current.contains(event.target as Node)
      ) {
        setShowAspectRatioDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const handleImageUpload = useCallback(
    (files: FileList) => {
      const maxFiles = 5;
      const maxSizePerFile = 10 * 1024 * 1024;
      // 10MB in bytes
      const remainingSlots = maxFiles - uploadedImages.length;
      if (remainingSlots <= 0) {
        alert(t("imageEditor.errors.maxFileCount", { count: maxFiles }));
        return;
      }
      const acceptedFiles: File[] = [];
      const previewUrls: string[] = [];
      Array.from(files)
        .slice(0, remainingSlots)
        .forEach((file) => {
          if (file.size > maxSizePerFile) {
            alert(
              t("imageEditor.errors.fileTooLarge", {
                name: file.name,
                size: "10MB",
              }),
            );
            return;
          }
          if (!file.type.startsWith("image/")) {
            alert(t("imageEditor.errors.invalidFileType", { name: file.name }));
            return;
          }
          acceptedFiles.push(file);
          const previewUrl = URL.createObjectURL(file);
          previewUrls.push(previewUrl);
          previewUrlsRef.current.push(previewUrl);
        });
      if (acceptedFiles.length > 0) {
        setUploadedImages((prev) => [...prev, ...acceptedFiles]);
        setImagePreviews((prev) => [...prev, ...previewUrls]);
      }
    },
    [t, uploadedImages.length],
  );
  const removeImage = useCallback((index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const url = prev[index];
      if (url) {
        URL.revokeObjectURL(url);
        previewUrlsRef.current = previewUrlsRef.current.filter(
          (item) => item !== url,
        );
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files) {
        handleImageUpload(e.dataTransfer.files);
      }
    },
    [handleImageUpload],
  );
  const downloadGeneratedImage = useCallback(async () => {
    if (!generatedImage || isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      const response = await fetch(generatedImage.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const mimeType = blob.type || "";
      const extension = mimeType.includes("/") ? mimeType.split("/")[1] : "png";
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${generatedImage.id || "generated-image"}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download generated image:", error);
      alert("Failed to download image. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }, [generatedImage, isDownloading]);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, []);
  const isFormValid =
    selectedTab === "text-to-image"
      ? prompt.trim().length > 0
      : uploadedImages.length > 0 && prompt.trim().length > 0;
  // 计算积分消耗
  const getCreditsRequired = () => {
    const baseCredits = 10;
    const aspectRatioCredits = selectedAspectRatio !== "auto" ? 10 : 0;
    return baseCredits + aspectRatioCredits;
  };
  // 安抚用户的轮播消息
  const progressMessages = [
    t("imageEditor.progress.message1"),
    t("imageEditor.progress.message2"),
    t("imageEditor.progress.message3"),
    t("imageEditor.progress.message4"),
    t("imageEditor.progress.message5"),
    t("imageEditor.progress.message6"),
  ];
  // 伪进度条逻辑：每15秒完成剩余进度的一半
  const updateProgress = useCallback((startTime: number) => {
    const now = Date.now();
    const elapsed = (now - startTime) / 1000;
    // 秒
    /*每15秒完成剩余进度的一半*/ const halfLifeSeconds = 15;
    const maxProgress = 95;
    // 最高到95%，避免100%
    /*使用指数衰减公式：progress = maxProgress * (1 - 0.5^(elapsed/halfLifeSeconds))*/ const progress =
      maxProgress * (1 - Math.pow(0.5, elapsed / halfLifeSeconds));
    return Math.min(progress, maxProgress);
  }, []);
  // 轮播消息更新 - 每5秒换一条
  useEffect(() => {
    if (!isGenerating || !progressStartTime) return;
    // 立即设置第一条消息
    setStatusMessage(progressMessages[0]);
    const messageInterval = setInterval(() => {
      const elapsed = (Date.now() - progressStartTime) / 1000;
      const messageIndex = Math.floor(elapsed / 5) % progressMessages.length;
      setStatusMessage(progressMessages[messageIndex]);
    }, 5000);
    return () => clearInterval(messageInterval);
  }, [isGenerating, progressStartTime, progressMessages]);
  // 进度条更新 - 独立于后台轮询
  useEffect(() => {
    if (!isGenerating || !progressStartTime) return;
    // 立即更新一次进度
    setProgress(updateProgress(progressStartTime));
    const progressInterval = setInterval(() => {
      const newProgress = updateProgress(progressStartTime);
      setProgress(newProgress);
    }, 1000);
    // 每1秒更新一次
    return () => clearInterval(progressInterval);
  }, [isGenerating, progressStartTime, updateProgress]);
  const generateImage = useCallback(async () => {
    if (!isFormValid || isGenerating) return;
    // 检查用户登录状态
    if (!isLoggedIn) {
      setShowSignModal(true);
      return;
    }
    // 清除之前的结果
    setGeneratedImage(null);
    setErrorMessage(""); // Clear previous errors
    setIsGenerating(true);
    setProgress(0);
    // 设置进度条开始时间和初始消息
    const startTime = Date.now();
    setProgressStartTime(startTime);
    setStatusMessage(t("imageEditor.progress.message1"));
    try {
      // Convert uploaded images to base64 array
      let imageBase64Array: string[] = [];
      if (selectedTab === "image-to-image" && uploadedImages.length > 0) {
        console.log(`Converting ${uploadedImages.length} images to base64...`);
        // Convert all uploaded images to base64
        const conversions = uploadedImages.map(async (file, index) => {
          const reader = new FileReader();
          return new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              console.log(`Image ${index + 1} converted to base64`);
              resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });
        imageBase64Array = await Promise.all(conversions);
        console.log(`Successfully converted ${imageBase64Array.length} images`);
      }
      // Call the image editing API
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: imageBase64Array,
          // Send array of images
          prompt: prompt,
          mode: selectedTab,
          aspectRatio: selectedAspectRatio,
          // Add aspect ratio
          creditsRequired: getCreditsRequired(),
          // 添加积分计算
          /*Add turnstile token if available*/ turnstileToken:
            "placeholder_token" /*Replace with actual turnstile implementation*/,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        // Handle specific error codes
        if (errorData.code === "LOGIN_REQUIRED") {
          setShowSignModal(true);
          throw new Error(t("imageEditor.errors.loginRequired"));
        } else if (errorData.code === "INSUFFICIENT_CREDITS") {
          throw new Error(t("imageEditor.errors.insufficientCredits"));
        } else {
          throw new Error(
            errorData.error || t("imageEditor.errors.generateFailed"),
          );
        }
      }
      const result = await response.json();
      const externalTaskId = result.externalTaskId;
      const internalTaskId = result.internalTaskId;
      // 获取记录编号
      /*Poll for task completion - 每5秒轮询一次*/ let pollAttempts = 0;
      const maxPollAttempts = 60;
      // 5分钟，每5秒一次

      // Clear any existing polling interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(async () => {
        try {
          pollAttempts++;
          // 传递recordNo给task-status API
          const queryStateParams = new URLSearchParams({
            externalTaskId,
            internalTaskId,
            pollAttempts: `${pollAttempts}`,
          });
          const statusResponse = await fetch(
            `/api/generate-image/task-status?${queryStateParams.toString()}`,
          );
          if (!statusResponse.ok) {
            if (statusResponse.status >= 500) {
              // 服务器错误，可重试
              console.warn(
                `Server error during polling (${statusResponse.status}), attempt ${pollAttempts}`,
              );
              if (pollAttempts >= maxPollAttempts) {
                throw new Error(t("imageEditor.errors.serverTimeout"));
              }
              return; /*继续轮询*/
            } else {
              throw new Error(t("imageEditor.errors.pollError"));
            }
          }
          const statusResult = await statusResponse.json();
          console.log("Status result:", JSON.stringify(statusResult, null, 2));
          if (statusResult.success && statusResult.status === "SUCCESS") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setProgress(100);
            setProgressStartTime(null);
            setStatusMessage(t("imageEditor.progress.completed"));
            console.log(
              "Generation completed, image URL:",
              statusResult.editedImage,
            );
            // 验证图片URL
            if (!statusResult.editedImage) {
              console.error("No image URL returned from API");
              throw new Error("生成成功但未返回图片URL");
            }
            // Add generated image to results
            const newImage: GeneratedImage = {
              id: Date.now().toString(),
              url: statusResult.editedImage,
              prompt: prompt,
              createdAt: new Date(),
            };
            console.log("Adding new image to list:", newImage);

            // Set loading state for image
            setIsImageLoading(true);
            setGeneratedImage(newImage);

            // 立即重置状态
            setTimeout(() => {
              setIsGenerating(false);
              setProgress(0);
              setStatusMessage("");
              setProgressStartTime(null);
            }, 500); /*5秒后重置状态*/
          } else if (statusResult.status === "FAILED") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setIsGenerating(false);
            setProgress(0);
            setProgressStartTime(null);
            setStatusMessage(t("imageEditor.progress.failed"));
            // Show user-friendly error message with specific handling
            let errorMessage = statusResult.error || t("imageEditor.errors.generateFailed");

            // Handle specific error types
            if (errorMessage.includes("Director: unexpected error")) {
              errorMessage = "AI processing encountered an unexpected error. Please try again with a different prompt or image.";
            } else if (errorMessage.includes("E6716")) {
              errorMessage = "The AI service is temporarily unavailable. Please try again in a few moments.";
            } else if (errorMessage.includes("422")) {
              errorMessage = "Invalid request format. Please check your image and prompt.";
            }

            console.error("Generation failed:", errorMessage);
            setErrorMessage(errorMessage);
            return; // Don't throw, just handle the error
          } else if (pollAttempts >= maxPollAttempts) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setIsGenerating(false);
            setProgress(0);
            setProgressStartTime(null);
            setStatusMessage(t("imageEditor.progress.failed"));
            const timeoutMessage = t("imageEditor.errors.taskTimeout");
            console.error("Task timeout:", timeoutMessage);
            setErrorMessage(timeoutMessage);
            return; // Don't throw, just handle the error
          }
        } catch (pollError: any) {
          console.error("Polling error:", pollError);
          // 网络错误可以重试
          if (
            pollError.name === "TypeError" &&
            pollError.message.includes("fetch")
          ) {
            console.warn(
              `Network error during polling, attempt ${pollAttempts}. Will retry...`,
            );
            if (pollAttempts < maxPollAttempts) {
              setStatusMessage(t("imageEditor.status.networkError"));
              return; /*继续轮询*/
            }
          }
          // Handle error gracefully without throwing
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsGenerating(false);
          setProgress(0);
          setProgressStartTime(null);
          setStatusMessage(t("imageEditor.progress.failed"));

          // Show user-friendly error message
          const errorMessage = pollError.message || t("imageEditor.errors.pollError");
          console.error("Polling failed:", errorMessage);
          setErrorMessage(errorMessage);
          return; // Don't throw, just handle the error
        }
      }, 5000); /*Poll every 5 seconds*/
    } catch (error: any) {
      console.error("Image editing error:", error);
      setProgress(0);
      setProgressStartTime(null);
      setStatusMessage(t("imageEditor.progress.failed"));
      setIsGenerating(false);

      // Set user-friendly error message
      let userErrorMessage = error.message || t("imageEditor.errors.unknownError");
      if (userErrorMessage.includes("Director: unexpected error")) {
        userErrorMessage = "AI processing encountered an unexpected error. Please try again with a different prompt or image.";
      }
      setErrorMessage(userErrorMessage);
    }
  }, [
    isFormValid,
    isGenerating,
    prompt,
    selectedTab,
    uploadedImages,
    isLoggedIn,
    setShowSignModal,
    t,
  ]);
  return (
    <section
      id={id || "image-editor"}
      className={`py-16 lg:py-24 ${className || ""}`}
    >
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <Badge variant="outline" className="text-xs font-medium mb-4">
            {t("imageEditor.header.label")}
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t("imageEditor.header.title")}
          </h2>

          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {t("imageEditor.header.subtitle", {
              aiImageEditor: t("imageEditor.header.aiImageEditor"),
              nanoBananaAi: t("imageEditor.header.nanoBananaAi"),
              geminiAiPhotoGenerator: t(
                "imageEditor.header.geminiAiPhotoGenerator",
              ),
              newGeminiTrendPrompt: t(
                "imageEditor.header.newGeminiTrendPrompt",
              ),
            })}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Prompt Engine */}

          <Card id='image-editor-input' className="bg-card/50 border-border backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                  <Zap className="w-5 h-5 text-primary" />
                </div>

                <div>
                  <CardTitle className="text-foreground text-xl font-bold">
                    {t("imageEditor.promptEngine.title")}
                  </CardTitle>

                  <p className="text-muted-foreground text-sm mt-1">
                    {t("imageEditor.promptEngine.subtitle", {
                      nanoBananaAi: t("imageEditor.header.nanoBananaAi"),
                    })}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Tab Selection */}

              <Tabs
                value={selectedTab}
                onValueChange={setSelectedTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="image-to-image" className="">
                    <ImageIcon className="w-4 h-4 mr-2" />

                    {t("imageEditor.promptEngine.tabs.imageToImage")}
                  </TabsTrigger>

                  <TabsTrigger value="text-to-image" className="">
                    {t("imageEditor.promptEngine.tabs.textToImage")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Reference Image Upload - 仅在 Image to Image 模式显示 */}

              {selectedTab === "image-to-image" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-5 h-5 text-primary" />

                    <span className="font-medium text-foreground">
                      {t("imageEditor.promptEngine.refImage.title")}
                    </span>

                    <span className="text-muted-foreground text-sm">
                      {t("imageEditor.promptEngine.refImage.count", {
                        count: uploadedImages.length,
                        max: 5,
                      })}
                    </span>
                  </div>

                  {/* Hidden file input */}

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    aria-label="Upload reference images"
                    title="Upload reference images"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleImageUpload(e.target.files);
                        // 重置文件input的value，允许重复上传同一文件
                        e.target.value = "";
                      }
                    }}
                  />

                  {/* Upload area */}

                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/20 hover:border-primary/50 hover:bg-muted/30 transition-all duration-300 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>

                    <div className="text-foreground font-medium mb-1">
                      {uploadedImages.length === 0
                        ? t("imageEditor.promptEngine.refImage.upload.ctaEmpty")
                        : t("imageEditor.promptEngine.refImage.upload.ctaMore")}
                    </div>

                    <div className="text-muted-foreground text-sm">
                      {t("imageEditor.promptEngine.refImage.upload.hint")}

                      <br />

                      {`(${t("imageEditor.promptEngine.refImage.upload.limitNote", { maxFiles: 5, maxSize: "10MB" })})`}
                    </div>
                  </div>

                  {/* Uploaded images preview */}

                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {uploadedImages.map((file, index) => {
                        const previewUrl = imagePreviews[index];
                        if (!previewUrl) {
                          return null;
                        }
                        return (
                          <div
                            key={index}
                            className="relative group aspect-square"
                          >
                            <div className="w-full h-full bg-muted rounded-lg overflow-hidden">
                              <Image
                                src={previewUrl}
                                alt={`Upload ${index + 1}`}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 33vw, 100px"
                              />
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(index);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Prompt */}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Icon
                    name="RiChatSmile3Line"
                    className="w-5 h-5 text-primary"
                  />

                  <span className="font-medium text-foreground">
                    {t("imageEditor.promptEngine.mainPrompt.title")}
                  </span>
                </div>

                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] bg-muted/80 ring-0 border-0 focus:border-0 focus:ring-0 focus:outline-none text-foreground placeholder:text-muted-foreground resize-none"
                  placeholder={t(
                    "imageEditor.promptEngine.mainPrompt.placeholder",
                  )}
                />

                {/* Aspect Ratio Dropdown - positioned at bottom left of prompt */}
                <div className="flex justify-start mt-3">
                  <div className="relative" ref={aspectRatioRef}>
                    <button
                      type="button"
                      onClick={() =>
                        setShowAspectRatioDropdown(!showAspectRatioDropdown)
                      }
                      className="bg-muted/80 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted/90 transition-colors flex items-center gap-2"
                    >
                      {selectedAspectRatio !== "auto" && (
                        <div
                          className={`border border-foreground ${selectedAspectRatio === "1:1"
                            ? "w-3 h-3"
                            : selectedAspectRatio === "3:4"
                              ? "w-2.5 h-3"
                              : selectedAspectRatio === "9:16"
                                ? "w-1.5 h-3"
                                : selectedAspectRatio === "4:3"
                                  ? "w-4 h-3"
                                  : selectedAspectRatio === "16:9"
                                    ? "w-5 h-3"
                                    : "w-3 h-3"
                            }`}
                        />
                      )}

                      <span>{selectedAspectLabel}</span>
                    </button>

                    {showAspectRatioDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 backdrop-blur-md">
                        {aspectRatios.map((ratio) => {
                          const aspectRatioMap: Record<string, string> = {
                            auto: t("imageEditor.aspectRatios.auto"),
                            "1:1": t("imageEditor.aspectRatios.square"),
                            "3:4": t("imageEditor.aspectRatios.portraitSmall"),
                            "9:16": t("imageEditor.aspectRatios.portraitLarge"),
                            "4:3": t("imageEditor.aspectRatios.landscapeSmall"),
                            "16:9": t(
                              "imageEditor.aspectRatios.landscapeLarge",
                            ),
                          };
                          const ratioLabel =
                            aspectRatioMap[ratio.value] || ratio.label;
                          return (
                            <button
                              key={ratio.value}
                              type="button"
                              onClick={() => {
                                setSelectedAspectRatio(ratio.value);
                                setShowAspectRatioDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors first:rounded-t-md last:rounded-b-md flex items-center gap-2 ${selectedAspectRatio === ratio.value
                                ? "bg-primary/10 text-primary"
                                : "text-popover-foreground"
                                }`}
                            >
                              {ratio.value !== "auto" && (
                                <div
                                  className={`border ${selectedAspectRatio === ratio.value
                                    ? "border-primary"
                                    : "border-foreground"
                                    } ${ratio.value === "1:1"
                                      ? "w-3 h-3"
                                      : ratio.value === "3:4"
                                        ? "w-3 h-4"
                                        : ratio.value === "9:16"
                                          ? "w-2.25 h-4"
                                          : ratio.value === "4:3"
                                            ? "w-4 h-3"
                                            : ratio.value === "16:9"
                                              ? "w-4 h-2.25"
                                              : "w-3 h-3"
                                    }`}
                                />
                              )}

                              <span className="whitespace-nowrap">
                                {ratioLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Generate Button */}

              <Button
                className={`w-full font-medium py-3 backdrop-blur-md border transition-all ${isFormValid && !isGenerating
                  ? "bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 hover:border-primary/40 shadow-lg"
                  : "bg-muted/20 text-muted-foreground cursor-not-allowed border-muted/30"
                  }`}
                onClick={generateImage}
                disabled={!isFormValid || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />

                    {t("imageEditor.promptEngine.buttons.generating")}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />

                    {t("imageEditor.promptEngine.buttons.generate")}

                    {isLoggedIn && (
                      <span className="flex items-center justify-center gap-0.5">
                        {getCreditsRequired()}

                        <FaCoins className="mt-0.5" size={12} />
                      </span>
                    )}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>


          {/* Output Gallery */}
          <Card className="bg-card/50 border-border backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted/50 rounded-lg border border-border">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>

                <div>
                  <CardTitle className="text-foreground text-xl font-bold">
                    {t("imageEditor.gallery.title")}
                  </CardTitle>

                  <p className="text-muted-foreground text-sm mt-1">
                    {t("imageEditor.gallery.subtitle", {
                      geminiAiPhotoGenerator: t(
                        "imageEditor.header.geminiAiPhotoGenerator",
                      ),
                    })}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Loading State */}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-16 space-y-6">
                  {/* 进度条居中显示 */}

                  <div className="w-full max-w-md space-y-4">
                    <div className="text-center">
                      <span className="text-lg font-medium text-foreground">
                        {Math.round(progress)}%
                      </span>
                    </div>

                    <Progress value={progress} className="w-full h-2" />

                    {/* 轮播消息 */}

                    <div className="text-center min-h-[2.5rem] flex items-center justify-center">
                      <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                        {statusMessage}
                      </p>
                    </div>
                  </div>

                  {/* AI图标动画 */}

                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                    <ImageIcon className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                </div>
              )}

              {/* Error Display */}
              {!isGenerating && errorMessage && (() => {
                const errorDetails = getErrorDetails(errorMessage);
                return (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-lg flex items-center justify-center border border-red-200 dark:border-red-800">
                      <X className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="text-center max-w-lg">
                      <h3 className="text-lg font-semibold text-foreground mb-3">
                        {errorDetails.title}
                      </h3>
                      <p className="text-red-600 dark:text-red-400 text-sm leading-relaxed mb-2">
                        {errorDetails.message}
                      </p>
                      {errorDetails.suggestion && (
                        <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                          💡 {errorDetails.suggestion}
                        </p>
                      )}

                    {/* Credits Refund Notice */}
                    {isLoggedIn && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <FaCoins className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="text-left">
                            <p className="text-blue-800 dark:text-blue-200 text-sm font-medium mb-1">
                              {t("imageEditor.errors.creditsRefundTitle")}
                            </p>
                            <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                              {t("imageEditor.errors.creditsRefundMessage")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setErrorMessage("");
                          // Clear and allow retry
                        }}
                        className="flex items-center gap-2"
                      >
                        <Icon name="RiRefreshLine" className="w-4 h-4" />
                        {t("imageEditor.errors.tryAgain")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setErrorMessage("")}
                      >
                        {t("imageEditor.errors.dismiss")}
                      </Button>
                    </div>
                    </div>
                  </div>
                );
              })()}

              {/* Generated Images */}

              {!isGenerating && generatedImage && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {t("imageEditor.gallery.generatedImages", { count: 1 })}
                  </h3>

                  <div className="group relative">
                    <div className="aspect-square relative overflow-hidden rounded-lg border border-border">
                      {/* Image Loading Overlay */}
                      {isImageLoading && (
                        <div className="absolute inset-0 bg-muted/80 flex flex-col items-center justify-center z-10">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                          <p className="text-sm text-muted-foreground">Loading image...</p>
                        </div>
                      )}

                      <Image
                        src={generatedImage.url}
                        alt={`Generated: ${generatedImage.prompt}`}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        onLoad={() => {
                          console.log(
                            "Image loaded successfully:",
                            generatedImage.url,
                          );
                          setIsImageLoading(false);
                        }}
                        onError={(e) => {
                          console.error(
                            "Image failed to load:",
                            generatedImage.url,
                            e,
                          );
                          setIsImageLoading(false);
                        }}
                      />
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {generatedImage.prompt}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          {generatedImage.createdAt.toLocaleTimeString()}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="self-start sm:self-auto"
                        onClick={downloadGeneratedImage}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            {t("imageEditor.gallery.downloadAlt")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}

              {!isGenerating && !generatedImage && !errorMessage && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-6 border border-border">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>

                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {t("imageEditor.empty.title")}
                  </h3>

                  <p className="text-muted-foreground max-w-sm">
                    {selectedTab === "image-to-image"
                      ? t("imageEditor.empty.hintImageToImage")
                      : t("imageEditor.empty.hintTextToImage")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
