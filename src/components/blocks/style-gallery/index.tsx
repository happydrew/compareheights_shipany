"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { ImageComparison } from "@/components/ui/image-comparison";
import { RiPlayFill } from "react-icons/ri";
import { useAppContext } from "@/contexts/app";
import { SectionTag } from "@/components/ui/section-tag";

interface ExampleStyle {
  id: string;
  title: string;
  description: string;
  originalImage: string;
  editedImage: string;
  trending?: boolean;
  category: string;
  aspectRatio: "vertical" | "horizontal"; // vertical: 4:5, horizontal: 4:3
  defaultSliderPosition?: number;
  imageFit?: "contain" | "cover";
  prompt: string; // AI prompt for this style
}

interface StyleGalleryProps {
  id?: string;
  className?: string;
}

const exampleStyles: ExampleStyle[] = [
  {
    id: "foto-profissional",
    title: "Foto Profissional",
    description: "Cinematic dark-luxury portrait with confident, moody elegance.",
    originalImage: "/imgs/examples/foto-profissional/foto-profissional-before.png",
    editedImage: "/imgs/examples/foto-profissional/foto-profissional-after.png",
    trending: true,
    category: "Profissional",
    aspectRatio: "horizontal",
    defaultSliderPosition: 50,
    prompt: "Prompt A hyper-realistic cinematic editorial portrait of the uploaded person (preserve face 100%). HE stands tall in a dark MAROON moody studio,surrounded by soft drifting black white smoke under a dramatic spotlight.Outfit:Fit black 🖤 luxury suit with fit-leg trousers, paired with a slightly unbuttoned black 🖤 silk shirt. Both hands tucked casually in pockets, shoulders relaxed, confident expression, head tilted slightly upward"
  },
  {
    id: "retro-classic-black-sare",
    title: "Retro Style-Classic Black-sare",
    description: "Transform your photos into Classic Black-sare Retro Style images with warm vintage tones",
    originalImage: "/imgs/examples/retro-vintage/retro-classic-black-saree-before.png",
    editedImage: "/imgs/examples/retro-vintage/retro-classic-black-saree-after.png",
    trending: true,
    category: "Vintage",
    aspectRatio: "horizontal",
    defaultSliderPosition: 30,
    prompt: "Turn this person into a 90s retro-inspired portrait wearing a shimmering black chiffon saree. The background is a deep wall with dramatic shadows, lit by golden-hour tones. Expression is calm yet mysterious, evoking old Bollywood posters."
  },
  {
    id: "retro-white-polka-dot-saree",
    title: "Retro Style-White Polka-dot Saree",
    description: "Transform your photos into White Polka-dot Saree Retro Style images with warm vintage tones",
    originalImage: "/imgs/examples/retro-vintage/retro-classic-black-saree-before.png",
    editedImage: "/imgs/examples/retro-vintage/retro-white-polka-dot-saree-after.png",
    trending: true,
    category: "Vintage",
    aspectRatio: "horizontal",
    defaultSliderPosition: 30,
    prompt: "Create a realistic portrait of a woman in a translucent white polka-dot saree with matching blouse. A soft pink flower is tucked behind her ear, and warm light from the side casts a cinematic shadow. She exudes vintage diva energy."
  },
  {
    id: "retro-red-saree-drama",
    title: "Retro Style-Red Saree Drama",
    description: "Transform your photos into Red Saree Drama Retro Style images with warm vintage tones",
    originalImage: "/imgs/examples/retro-vintage/retro-classic-black-saree-before.png",
    editedImage: "/imgs/examples/retro-vintage/retro-red-saree-drama-after.png",
    trending: true,
    category: "Vintage",
    aspectRatio: "horizontal",
    defaultSliderPosition: 30,
    prompt: "Transform the subject into a classic Bollywood heroine in a flowing red chiffon saree, hair styled in soft waves. Background should be warm-toned, minimalist, with glowing sunset light giving a romantic and dramatic mood."
  },
  {
    id: "ghibli-style",
    title: "Ghibli Style",
    description: "Convert the photo into Studio Ghibli style",
    originalImage: "/imgs/examples/ghibli-style-before.webp",
    editedImage: "/imgs/examples/ghibli-style-after.webp",
    trending: true,
    category: "Anime",
    aspectRatio: "horizontal",
    defaultSliderPosition: 50,
    prompt: "Convert the photo into Studio Ghibli style."
  },
  {
    id: "3d-figurines",
    title: "3D Figurines",
    description: "Transform your photos into 3D Figurines",
    originalImage: "/imgs/examples/3d-figurines-before.png",
    editedImage: "/imgs/examples/3d-figurines-after.webp",
    trending: true,
    category: "Fashion",
    aspectRatio: "horizontal",
    defaultSliderPosition: 50,
    imageFit: "contain",
    prompt: "turn this photo into a character figure. Behind it, place a box with the character's image printed on it, and a computer showing the Blender modeling process on its screen. In front of the box, add a round plastic base with the character figure standing on it. set the scene indoors if possible"
  }
];

export default function StyleGallery({ className, id }: StyleGalleryProps) {
  const t = useTranslations();
  const { setPromptFromTemplate } = useAppContext();

  const handleUsePrompt = (prompt: string, event: React.MouseEvent) => {
    event.preventDefault();
    setPromptFromTemplate(prompt);

    // 滚动到图片编辑器
    const imageEditorElement = document.getElementById('image-editor-input');
    if (imageEditorElement) {
      imageEditorElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id={id || 'examples'} className={`py-16 lg:py-24 bg-transparent ${className || ''}`}>
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge
            variant="outline"
            className='mb-4 border-opacity-50 bg-gradient-to-r dark:from-purple-900/20 dark:to-pink-900/20 dark:border-purple-600 dark:text-purple-300 from-purple-100 to-pink-100 border-purple-200 text-purple-700'
          >
            {t('styleGallery.section.badge')}
          </Badge>
          <h2 className='text-4xl font-bold tracking-tight mb-6 text-primary md:bg-gradient-to-r md:from-pink-600 md:via-purple-600 md:to-indigo-600 md:bg-clip-text md:text-transparent dark:md:from-pink-400 dark:md:via-purple-400 dark:md:to-indigo-400'>
            {t('styleGallery.section.title')}
          </h2>
          <p className='text-xl text-gray-600 dark:text-gray-300'>
            {t('styleGallery.section.description')}
          </p>
        </div>


        {/* Masonry Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 auto-rows-min">
          {exampleStyles.map((style, index) => (
            <div
              key={style.id}
              className={`${style.aspectRatio === "horizontal"
                ? "col-span-2 md:col-span-4 lg:col-span-4 xl:col-span-4" // Horizontal spans 2x vertical width
                : "col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2"  // Vertical normal width
                }`}
            >
              <Card className='group border-none py-0 gap-2 hover:shadow-xl transition-all duration-300 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900'>
                <div className="relative">
                  {/* Comparison Slider */}
                  <ImageComparison
                    imageComparison={{
                      originalImage: style.originalImage,
                      originalAlt: "before",
                      editedImage: style.editedImage,
                      afterAlt: "after",
                      originalLabel: "Before",
                      editedLabel: "After",
                      aspectRatio: style.aspectRatio,
                      defaultSliderPosition: style.defaultSliderPosition || 30,
                      className: "w-full h-full",
                      imageFit: style.imageFit || "cover"
                    }}
                  />

                  {/* {style.trending && (
                    <Badge className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white z-20">
                      🔥 Trending
                    </Badge>
                  )} */}

                </div>

                {/* Content */}
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className='font-semibold leading-tight text-gray-700 dark:text-gray-200'>
                      {style.title}
                    </h3>
                    <Badge
                      variant="secondary"
                      className='text-xs ml-2 shrink-0 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'>
                      {style.category}
                    </Badge>
                  </div>

                  {/* Description and Try This Button */}
                  <div className="flex items-end justify-between gap-3">
                    <p className='text-xs dark:text-zinc-500 text-zinc-400 flex-1'>
                      {style.description}
                    </p>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleUsePrompt(style.prompt, e)}
                      className="shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 text-xs px-3 py-1 h-7 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <RiPlayFill className="w-3 h-3 mr-1" />
                      Use prompt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-12">
          <Button
            size="lg"
            variant="outline"
            className='dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:border-gray-600 dark:text-gray-300 dark:hover:text-purple-300 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700'
          >
            {t('styleGallery.loadMore')}
          </Button>
        </div>
      </div>
    </section>
  );
}
