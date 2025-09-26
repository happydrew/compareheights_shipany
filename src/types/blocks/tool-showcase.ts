import { Image, Video, Button, ImageComparison } from "@/types/blocks/base";

export interface ToolShowcaseFeature {
  icon?: string;
  title?: string;
  description?: string;
}

export interface ToolShowcaseItem {
  title?: string;
  description?: string;
  badge?: string;
  features?: ToolShowcaseFeature[];
  video?: Video;
  image?: Image;
  imageComparison?: ImageComparison;
  buttons?: Button[];
  reverse?: boolean;
}

export interface ToolShowcase {
  title?: string;
  description?: string;
  label?: string;
  items?: ToolShowcaseItem[];
}
