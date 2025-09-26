"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

import Icon from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionTag } from "@/components/ui/section-tag";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageComparison } from "@/components/ui/image-comparison";
import type { ToolShowcase as ToolShowcaseType } from "@/types/blocks/tool-showcase";
import { Video } from "@/types/blocks/base";
import { Link } from "@/i18n/navigation";

function VideoPlayer({ video }: { video: Video }) {
  const t = useTranslations("common");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(video.muted ?? true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    const element = videoRef.current;
    if (!element) return;

    if (isPlaying) {
      element.pause();
    } else {
      element.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const element = videoRef.current;
    if (!element) return;

    element.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-muted group">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        poster={video.poster}
        autoPlay={video.autoplay}
        loop={video.loop}
        muted={isMuted}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <source src={video.src} type="video/mp4" />
        <p className="text-muted-foreground">{t("video_not_supported")}</p>
      </video>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/90 text-black hover:bg-white"
            onClick={togglePlay}
            title={isPlaying ? t("pause_video") : t("play_video")}
            type="button"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="ml-1 h-6 w-6" />
            )}
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/90 text-black hover:bg-white"
            onClick={toggleMute}
            title={isMuted ? t("unmute_video") : t("mute_video")}
            type="button"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ToolShowcase({ toolShowcase }: { toolShowcase: ToolShowcaseType }) {
  const t = useTranslations("common");
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  const [comingSoonMessage, setComingSoonMessage] = useState("");

  const modalTitle = t("coming_soon_title", { default: "Coming soon" });
  const modalDefaultMessage = t("coming_soon_message", {
    default: "Coming soon, please stay tuned!",
  });
  const modalCloseLabel = t("coming_soon_close", { default: "Got it" });

  const handleOpenModal = (message?: string) => {
    const text = (message ?? modalDefaultMessage).trim();
    setComingSoonMessage(text.length > 0 ? text : modalDefaultMessage);
    setIsComingSoonOpen(true);
  };

  return (
    <>
      <section className="py-16 lg:py-24">
        <div className="container">
          {(toolShowcase.title || toolShowcase.description) && (
            <div className="mx-auto mb-16 max-w-3xl text-center">
              {toolShowcase.label && (
                <Badge variant="outline" className="text-xs font-medium mb-4">
                  {toolShowcase.label}
                </Badge>
              )}
              {toolShowcase.title && (
                <h2 className="mb-6 text-3xl font-bold tracking-tight lg:text-4xl xl:text-5xl">
                  {toolShowcase.title}
                </h2>
              )}
              {toolShowcase.description && (
                <p className="text-lg text-muted-foreground lg:text-xl">
                  {toolShowcase.description}
                </p>
              )}
            </div>
          )}

          <div className="space-y-24">
            {toolShowcase.items?.map((item, index) => {
              const hasComparison = Boolean(
                item.imageComparison?.originalImage && item.imageComparison?.editedImage
              );

              const buttonElements = (item.buttons ?? []).map((button, buttonIndex) => {
                const label = button.title ?? button.text ?? "";
                const iconName = button.icon;

                if (button.modalMessage !== undefined) {
                  return (
                    <Button
                      key={buttonIndex}
                      variant={(button.variant as any) || "default"}
                      size={(button.size as any) || "default"}
                      type="button"
                      onClick={() => handleOpenModal(button.modalMessage)}
                    >
                      {iconName && <Icon name={iconName} className="mr-2 h-4 w-4" />}
                      {label}
                    </Button>
                  );
                }

                if (!button.url) {
                  return (
                    <Button
                      key={buttonIndex}
                      variant={(button.variant as any) || "default"}
                      size={(button.size as any) || "default"}
                      type="button"
                      onClick={() => handleOpenModal(button.modalMessage)}
                    >
                      {iconName && <Icon name={iconName} className="mr-2 h-4 w-4" />}
                      {label}
                    </Button>
                  );
                }

                return (
                  <Button
                    key={buttonIndex}
                    variant={(button.variant as any) || "default"}
                    size={(button.size as any) || "default"}
                    asChild
                  >
                    <Link
                      href={button.url}
                      target={button.target || "_self"}
                      rel={button.target === "_blank" ? "noopener noreferrer" : undefined}
                    >
                      {iconName && <Icon name={iconName} className="mr-2 h-4 w-4" />}
                      {label}
                    </Link>
                  </Button>
                );
              });

              return (
                <div
                  key={index}
                  className={`grid items-center gap-12 lg:gap-16 ${item.reverse ? "lg:grid-cols-2 lg:grid-flow-col-dense" : "lg:grid-cols-2"
                    }`}
                >
                  <div className={`space-y-6 ${item.reverse ? "lg:col-start-2" : ""}`}>
                    {item.badge && (
                      <Badge variant="secondary" className="w-fit">
                        {item.badge}
                      </Badge>
                    )}

                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold tracking-tight lg:text-3xl">
                        {item.title}
                      </h3>
                      <p className="text-lg leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>

                    {item.features && item.features.length > 0 && (
                      <div className="space-y-4">
                        {item.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-start gap-3">
                            {feature.icon && (
                              <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <Icon name={feature.icon} className="h-3 w-3 text-primary" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-semibold text-foreground">{feature.title}</h4>
                              <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {buttonElements.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-2">{buttonElements}</div>
                    )}
                  </div>

                  <div className={`${item.reverse ? "lg:col-start-1" : ""}`}>
                    <Card className="overflow-hidden border-0 shadow-2xl bg-transparent py-0">
                      <CardContent className="p-0">
                        {hasComparison ? (
                          <ImageComparison
                            imageComparison={item.imageComparison!}
                          />
                        ) : (
                          <div className="aspect-video">
                            {item.video ? (
                              <VideoPlayer video={item.video} />
                            ) : item.image?.src ? (
                              <div className="relative h-full w-full">
                                <Image
                                  src={item.image.src}
                                  alt={item.image.alt || item.title || "Showcase item"}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 100vw, 50vw"
                                />
                              </div>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted">
                                <p className="text-muted-foreground">
                                  {t("no_media_available", { default: "No media available" })}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Dialog open={isComingSoonOpen} onOpenChange={setIsComingSoonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>{comingSoonMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setIsComingSoonOpen(false)}>
              {modalCloseLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
