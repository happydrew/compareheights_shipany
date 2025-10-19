import React from 'react';
import {
  Users, Zap, Globe, Download, Smartphone,
  BookOpen, Palette, Star, ChevronRight,
  CheckCircle, Info, HelpCircle
} from 'lucide-react';
import './styles.css';
import { useTranslations } from 'next-intl';

const FEATURE_COLOR_CLASSES: Record<
  "green" | "blue" | "purple" | "orange" | "rose",
  { background: string; text: string }
> = {
  green: {
    background: "bg-green-theme-100",
    text: "text-green-theme-600",
  },
  blue: {
    background: "bg-accent-blue-100",
    text: "text-accent-blue-600",
  },
  purple: {
    background: "bg-accent-purple-100",
    text: "text-accent-purple-600",
  },
  orange: {
    background: "bg-accent-orange-100",
    text: "text-accent-orange-600",
  },
  rose: {
    background: "bg-accent-rose-100",
    text: "text-accent-rose-600",
  },
};

type FeatureColor = keyof typeof FEATURE_COLOR_CLASSES;
const HeightComparisonArticle: React.FC = () => {
  const t = useTranslations('compareheights_article');
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-theme-50 via-white to-green-theme-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pb-20 pt-5 px-4">
        <div className="absolute inset-0 bg-pattern opacity-30"></div>
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-theme-100 text-green-theme-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4" />
            {t('hero_badge')}
          </div>

          <h1 className="text-display-lg md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            {t('hero_title')}
            <span className="text-green-theme-600"> {t('hero_title_highlight')}</span>
          </h1>

          <p className="text-body-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            {t('hero_desc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href='#height-compare-tool' className="btn-primary-modern inline-flex items-center gap-2 px-8 py-4 text-lg">
              {t('hero_cta_primary')}
              <ChevronRight className="w-5 h-5" />
            </a>
            <a href='/docs/user-guide' className="text-gray-600 hover:text-green-theme-600 font-medium inline-flex items-center gap-2 transition-colors">
              <Info className="w-4 h-4" />
              {t('hero_cta_secondary')}
            </a>
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card-modern p-8 md:p-12">
            <h2 className="text-display-md md:text-3xl font-bold text-gray-900 mb-6">
              {t('intro_title')}
            </h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-body-lg text-gray-700 mb-6 leading-relaxed">
                {/* 高亮加粗使用变量占位符和JSX拼接 */}
                <strong>{t('intro_desc1_strong1')}</strong>{t('intro_desc1_seg1')}
                <strong>{t('intro_desc1_strong2')}</strong>{t('intro_desc1_seg2')}
                <strong>{t('intro_desc1_strong3')}</strong>{t('intro_desc1_seg3')}
                {t('intro_desc1_seg4')}
                <strong>{t('intro_desc1_strong4')}</strong>{t('intro_desc1_seg5')}
                <strong>{t('intro_desc1_strong5')}</strong>{t('intro_desc1_seg6')}
              </p>
              <p className="text-body-lg text-gray-700 leading-relaxed">
                <strong>{t('intro_desc2_strong1')}</strong>{t('intro_desc2_seg1')}
                <strong>{t('intro_desc2_strong2')}</strong>{t('intro_desc2_seg2')}
                {t('intro_desc2_seg3')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id='how-it-works' className="py-16 px-4 bg-gradient-to-r from-green-theme-50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-display-md md:text-3xl font-bold text-gray-900 mb-4">
              {t('howitworks_title')}
            </h2>
            <p className="text-body-lg text-gray-600 max-w-2xl mx-auto">
              {t('howitworks_desc')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: t('howitworks_step1_no'),
                title: t('howitworks_step1_title'),
                description: t('howitworks_step1_desc'),
                icon: <Users className="w-6 h-6" />
              },
              {
                step: t('howitworks_step2_no'),
                title: t('howitworks_step2_title'),
                description: t('howitworks_step2_desc'),
                icon: <Zap className="w-6 h-6" />
              },
              {
                step: t('howitworks_step3_no'),
                title: t('howitworks_step3_title'),
                description: t('howitworks_step3_desc'),
                icon: <Palette className="w-6 h-6" />
              },
              {
                step: t('howitworks_step4_no'),
                title: t('howitworks_step4_title'),
                description: t('howitworks_step4_desc'),
                icon: <Download className="w-6 h-6" />
              }
            ].map((item, index) => (
              <div key={index} className="card-modern p-6 text-center group hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-green-theme-100 rounded-full flex items-center justify-center text-green-theme-600 mx-auto mb-4 group-hover:bg-green-theme-200 transition-colors">
                  {item.icon}
                </div>
                <div className="text-green-theme-600 font-bold text-sm mb-2">{item.step}</div>
                <h3 className="text-display-sm font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-body-md text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id='features' className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-display-md md:text-3xl font-bold text-gray-900 mb-4">
              {t('features_title')}
            </h2>
            <p className="text-body-lg text-gray-600 max-w-2xl mx-auto">
              {t('features_desc')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: t('features1_title'),
                description: t('features1_desc'),
                icon: <Users className="w-8 h-8" />,
                color: "green"
              },
              {
                title: t('features2_title'),
                description: t('features2_desc'),
                icon: <Globe className="w-8 h-8" />,
                color: "blue"
              },
              {
                title: t('features3_title'),
                description: t('features3_desc'),
                icon: <Palette className="w-8 h-8" />,
                color: "purple"
              },
              {
                title: t('features4_title'),
                description: t('features4_desc'),
                icon: <Zap className="w-8 h-8" />,
                color: "orange"
              },
              {
                title: t('features5_title'),
                description: t('features5_desc'),
                icon: <Download className="w-8 h-8" />,
                color: "rose"
              },
              {
                title: t('features6_title'),
                description: t('features6_desc'),
                icon: <Smartphone className="w-8 h-8" />,
                color: "green"
              }
            ].map((feature, index) => {
              const colorKey = feature.color as FeatureColor;
              const colorClasses = FEATURE_COLOR_CLASSES[colorKey];

              return (
                <div key={index} className="card-modern p-8 group hover:shadow-xl transition-all duration-300">
                  <div className={`w-16 h-16 ${colorClasses.background} ${colorClasses.text} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-display-sm font-semibold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-body-md text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 px-4 bg-gradient-to-l from-green-theme-50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-display-md md:text-3xl font-bold text-gray-900 mb-4">
              {t('usecases_title')}
            </h2>
            <p className="text-body-lg text-gray-600 max-w-2xl mx-auto">
              {t('usecases_desc')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: t('usecase1_title'),
                description: t('usecase1_desc'),
                icon: <Star className="w-6 h-6" />
              },
              {
                title: t('usecase2_title'),
                description: t('usecase2_desc'),
                icon: <BookOpen className="w-6 h-6" />
              },
              {
                title: t('usecase3_title'),
                description: t('usecase3_desc'),
                icon: <BookOpen className="w-6 h-6" />
              },
              {
                title: t('usecase4_title'),
                description: t('usecase4_desc'),
                icon: <Palette className="w-6 h-6" />
              }
            ].map((useCase, index) => (
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

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-display-md md:text-3xl font-bold text-gray-900 mb-4">
              {t('faq_title')}
            </h2>
            <p className="text-body-lg text-gray-600">
              {t('faq_desc')}
            </p>
          </div>

          <div className="space-y-6">
            {faqList(t).map((faq, index) => (
              <div key={index} className="card-modern p-6 group">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-theme-100 rounded-lg flex items-center justify-center text-green-theme-600 flex-shrink-0 mt-1">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-display-sm font-semibold text-gray-900 mb-2">{faq.question}</h3>
                    <p className="text-body-md text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-green-theme-600 to-green-theme-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <CheckCircle className="w-16 h-16 mx-auto mb-6 text-green-theme-200" />
            <h2 className="text-display-md md:text-4xl font-bold mb-6">
              {t('cta_title')}
            </h2>
            <p className="text-xl text-green-theme-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('cta_desc')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href='#height-compare-tool' className="bg-white text-green-theme-700 hover:bg-green-theme-50 font-semibold px-8 py-4 rounded-xl inline-flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-lg">
              {t('cta_primary')}
              <ChevronRight className="w-5 h-5" />
            </a>
            <button className="text-green-theme-100 hover:text-white font-medium inline-flex items-center gap-2 transition-colors">
              <Info className="w-4 h-4" />
              {t('cta_secondary')}
            </button>
          </div>

          <div className="mt-12 text-green-theme-200 text-sm">
            {t('cta_footer')}
          </div>
        </div>
      </section>
    </div>
  );
};

function faqList(t: any) {
  return [
    {
      question: t('faq_q1'),
      answer: t('faq_a1'),
    },
    {
      question: t('faq_q2'),
      answer: t('faq_a2'),
    },
    {
      question: t('faq_q3'),
      answer: t('faq_a3'),
    },
    {
      question: t('faq_q4'),
      answer: t('faq_a4'),
    },
    {
      question: t('faq_q5'),
      answer: t('faq_a5'),
    },
    {
      question: t('faq_q6'),
      answer: t('faq_a6'),
    },
    {
      question: t('faq_q7'),
      answer: t('faq_a7'),
    },
    {
      question: t('faq_q8'),
      answer: t('faq_a8'),
    },
    {
      question: t('faq_q9'),
      answer: t('faq_a9'),
    },
    {
      question: t('faq_q10'),
      answer: t('faq_a10'),
    },
    {
      question: t('faq_q11'),
      answer: t('faq_a11'),
    },
    {
      question: t('faq_q12'),
      answer: t('faq_a12'),
    },
    {
      question: t('faq_q13'),
      answer: t('faq_a13'),
    },
    {
      question: t('faq_q14'),
      answer: t('faq_a14'),
    }
  ];
}

export { HeightComparisonArticle };