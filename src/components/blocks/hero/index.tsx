'use client';

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HappyUsers from "./happy-users";
import HeroBg from "./bg";
import { Hero as HeroType } from "@/types/blocks/hero";
import Icon from "@/components/icon";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

const TYPE_SPEED = 90;
const DELETE_SPEED = 45;
const HOLD_DURATION = 1400;
const TRANSITION_DELAY = 400;

type TipBadge = {
  text: string;
  icon?: string;
  className?: string;
};

const TIP_BADGE_STYLES = [
  "text-amber-500 border-amber-400/70 shadow-[0_10px_30px_-18px_rgba(251,191,36,0.8)]",
  "text-sky-500 border-sky-400/70 shadow-[0_10px_30px_-18px_rgba(56,189,248,0.75)]",
  "text-rose-500 border-rose-400/70 shadow-[0_10px_30px_-18px_rgba(244,114,182,0.78)]",
  "text-emerald-500 border-emerald-400/70 shadow-[0_10px_30px_-18px_rgba(16,185,129,0.65)]",
];

export default function Hero({ hero }: { hero: HeroType }) {
  if (hero.disabled) {
    return null;
  }

  const typedPrefix = hero.typed_prefix?.trim() ?? "";
  const typedPhrases = useMemo(
    () =>
      (hero.typed_phrases ?? [])
        .map((phrase) => phrase?.trim() ?? "")
        .filter((phrase): phrase is string => phrase.length > 0),
    [hero.typed_phrases],
  );

  const tipItems = useMemo(() => {
    if (!hero.tip) {
      return [];
    }
    const rawItems = Array.isArray(hero.tip) ? hero.tip : [hero.tip];
    return rawItems
      .map<TipBadge | null>((item) => {
        if (typeof item === "string") {
          const text = item.trim();
          return text ? { text } : null;
        }
        if (!item) {
          return null;
        }
        const text = item.text?.trim() ?? "";
        if (!text) {
          return null;
        }
        const icon = item.icon?.trim();
        const className = item.className?.trim();
        return {
          text,
          icon: icon || undefined,
          className: className || undefined,
        };
      })
      .filter((item): item is TipBadge => Boolean(item));
  }, [hero.tip]);
  const hasTypewriter = Boolean(typedPrefix && typedPhrases.length);
  const prefixWithSpace =
    typedPrefix && !typedPrefix.endsWith(" ")
      ? `${typedPrefix} `
      : typedPrefix;

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (!hasTypewriter) {
      return;
    }

    setDisplayText("");
    setCurrentPhraseIndex(0);
    setIsDeleting(false);
  }, [hasTypewriter, typedPrefix, typedPhrases]);

  // Typewriter animation for the rotating hero phrases.
  useEffect(() => {
    if (!hasTypewriter || typedPhrases.length === 0) {
      return;
    }

    const currentPhrase = typedPhrases[currentPhraseIndex] ?? "";
    const isFull = displayText === currentPhrase;
    const isEmpty = displayText.length === 0;

    let timeoutId: number;

    if (!isDeleting && isFull) {
      timeoutId = window.setTimeout(() => setIsDeleting(true), HOLD_DURATION);
    } else if (isDeleting && isEmpty) {
      timeoutId = window.setTimeout(() => {
        setIsDeleting(false);
        setCurrentPhraseIndex((prev) => (prev + 1) % typedPhrases.length);
      }, TRANSITION_DELAY);
    } else {
      timeoutId = window.setTimeout(() => {
        setDisplayText((prev) => {
          const nextLength = prev.length + (isDeleting ? -1 : 1);
          return currentPhrase.slice(0, Math.max(0, nextLength));
        });
      }, isDeleting ? DELETE_SPEED : TYPE_SPEED);
    }

    return () => window.clearTimeout(timeoutId);
  }, [displayText, isDeleting, hasTypewriter, typedPhrases, currentPhraseIndex]);

  const highlightText = hero.highlight_text;
  let texts: string[] | null = null;
  if (highlightText) {
    texts = hero.title?.split(highlightText, 2) ?? null;
  }

  return (
    <>
      <HeroBg />
      <section className="py-24">
        <div className="container">
          {hero.show_badge && (
            <div className="flex items-center justify-center mb-8">
              <img
                src="/imgs/badges/phdaily.svg"
                alt="phdaily"
                className="h-10 object-cover"
              />
            </div>
          )}
          <div className="text-center">
            {hero.announcement && (
              <Link
                href={hero.announcement.url as any}
                className="mx-auto mb-3 inline-flex items-center gap-3 rounded-full border px-2 py-1 text-sm"
              >
                {hero.announcement.label && (
                  <Badge>{hero.announcement.label}</Badge>
                )}
                {hero.announcement.title}
              </Link>
            )}

            {hasTypewriter ? (
              <h1 className="mx-auto mb-3 mt-4 max-w-6xl text-balance text-4xl font-bold lg:mb-7 lg:text-7xl">
                <span>{prefixWithSpace}</span>
                <span className="relative inline-flex items-center whitespace-nowrap">
                  <span
                    className="text-primary md:bg-gradient-to-r md:from-pink-500 md:via-purple-500 md:to-indigo-500 md:bg-clip-text md:text-transparent"
                    aria-live="polite"
                  >
                    {displayText}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-2 h-10 w-[2px] rounded-sm bg-primary/80 animate-[blink_1s_steps(2,start)_infinite] lg:h-14"
                  />
                </span>
              </h1>
            ) : texts && texts.length > 1 ? (
              <h1 className="mx-auto mb-3 mt-4 max-w-6xl text-balance text-4xl font-bold lg:mb-7 lg:text-7xl">
                {texts[0]}
                <span className="text-primary md:bg-gradient-to-r md:from-pink-500 md:via-purple-500 md:to-indigo-500 md:bg-clip-text md:text-transparent">
                  {highlightText}
                </span>
                {texts[1]}
              </h1>
            ) : (
              <h1 className="mx-auto mb-3 mt-4 max-w-6xl text-balance text-4xl font-bold lg:mb-7 lg:text-7xl">
                {hero.title}
              </h1>
            )}

            <p
              className="m mx-auto max-w-3xl text-muted-foreground lg:text-xl"
              dangerouslySetInnerHTML={{ __html: hero.description || "" }}
            />
            {hero.buttons && (
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                {hero.buttons.map((item, i) => {
                  return (
                    <Link
                      key={i}
                      href={item.url as any}
                      target={item.target || ""}
                      className="flex items-center"
                    >
                      <Button
                        className="w-full"
                        size="lg"
                        variant={item.variant || "default"}
                      >
                        {item.icon && <Icon name={item.icon} className="" />}
                        {item.title}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
            {tipItems.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                {tipItems.map((tip, index) => {
                  const palette = TIP_BADGE_STYLES[index % TIP_BADGE_STYLES.length];
                  return (
                    <Badge
                      key={`${tip.text}-${index}`}
                      variant="outline"
                      className={cn(
                        "border px-3 py-1 text-xs font-semibold bg-transparent gap-1.5 whitespace-nowrap rounded-full",
                        palette,
                        tip.className,
                      )}
                    >
                      {tip.icon && (
                        <Icon name={tip.icon} className="h-3.5 w-3.5" />
                      )}
                      {tip.text}
                    </Badge>
                  );
                })}
              </div>
            )}
            {hero.show_happy_users && <HappyUsers />}
          </div>
        </div>
      </section>
    </>
  );
}
