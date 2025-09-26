import { Button, Image, Announcement } from "@/types/blocks/base";

export interface Announcement {
  title?: string;
  description?: string;
  label?: string;
  url?: string;
  target?: string;
}

export interface HeroTipItem {
  text?: string;
  icon?: string;
  className?: string;
}

export interface Hero {
  name?: string;
  disabled?: boolean;
  announcement?: Announcement;
  title?: string;
  typed_prefix?: string;
  typed_phrases?: string[];
  highlight_text?: string;
  description?: string;
  buttons?: Button[];
  image?: Image;
  tip?: string | string[] | HeroTipItem | HeroTipItem[];
  show_happy_users?: boolean;
  show_badge?: boolean;
}
