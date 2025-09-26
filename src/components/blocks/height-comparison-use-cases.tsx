import React from 'react';
import { Star, BookOpen, Palette } from 'lucide-react';

interface HeightComparisonUseCasesProps {
  id?: string;
}

export default function HeightComparisonUseCases({ id = "height-comparison-use-cases" }: HeightComparisonUseCasesProps) {
  const useCases = [
    {
      title: "Celebrity Height Comparisons",
      description: "One of the most popular applications involves comparing celebrity heights. Users love creating height comparison charts featuring their favorite actors, musicians, and public figures. These height chart comparisons often reveal surprising height differences that aren't apparent in photos or movies. The height comparison tool makes it easy to compare heights and instantly see the height difference between celebrities.",
      icon: <Star className="w-6 h-6" />
    },
    {
      title: "Anime and Character Analysis",
      description: "Anime enthusiasts frequently use height comparison tools to visualize their favorite characters' heights. Creating height chart comparisons of anime characters helps fans better understand character designs and proportional relationships within series. The height comparison chart is a must-have for comparing heights and exploring height difference in anime.",
      icon: <BookOpen className="w-6 h-6" />
    },
    {
      title: "Educational Applications",
      description: "Teachers and educators utilize height comparison charts for STEM education, helping students understand concepts of scale, proportion, measurement, and height difference. These visual tools make abstract mathematical concepts more concrete and engaging. The height comparison tool and height chart comparison are perfect for classroom use, especially for teaching about height difference.",
      icon: <BookOpen className="w-6 h-6" />
    },
    {
      title: "Creative and Professional Projects",
      description: "Artists, writers, and game developers rely on height comparison tools to maintain consistency in their creative works. By visualizing character heights and height differences early in the design process, creators ensure proportional accuracy throughout their projects. The height comparison chart generator is essential for comparing heights and analyzing height difference in creative fields.",
      icon: <Palette className="w-6 h-6" />
    }
  ];

  return (
    <section id={id} className="py-16 px-4 bg-gradient-to-l from-green-theme-50 to-transparent">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-display-md md:text-3xl font-bold text-gray-900 mb-4">
            Popular Use Cases for Height Comparison
          </h2>
          <p className="text-body-lg text-gray-600 max-w-2xl mx-auto">
            Discover how people use our height comparison tool and height comparison chart for various creative and educational purposes. The height chart comparison system is perfect for comparing heights and analyzing height difference in any context, from entertainment to education.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {useCases.map((useCase, index) => (
            <div key={index} className="card-modern p-8 group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-theme-100 rounded-xl flex items-center justify-center text-green-theme-600 flex-shrink-0 group-hover:bg-green-theme-200 transition-colors">
                  {useCase.icon}
                </div>
                <div>
                  <h3 className="text-display-sm font-semibold text-gray-900 mb-3">{useCase.title}</h3>
                  <p className="text-body-md text-gray-600 leading-relaxed">{useCase.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}