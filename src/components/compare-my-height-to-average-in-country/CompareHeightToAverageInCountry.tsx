import React from 'react';
import { useTranslations } from 'next-intl';
import { HeightCompareTool } from '@/components/compareheights/HeightCompareTool';
import { presetData } from './presetData';

const countryHeightData = [
  { country: 'Netherlands', height: '183.78 cm', source: 'Data Pandas; World Population Review' },
  { country: 'Montenegro', height: '183.30 cm', source: 'Data Pandas; World Population Review' },
  { country: 'Estonia', height: '182.79 cm', source: 'Data Pandas; World Population Review' },
  { country: 'Bosnia & Herzegovina', height: '182.47 cm', source: 'Data Pandas; Times of India' },
  { country: 'Iceland', height: '182.10 cm', source: 'Data Pandas' },
  { country: 'Denmark', height: '181.89 cm', source: 'Data Pandas; MedicineNet' },
  { country: 'Czech Republic', height: '181.19 cm', source: 'Data Pandas' },
  { country: 'Latvia', height: '181.17 cm', source: 'Data Pandas' },
  { country: 'Slovakia', height: '181.02 cm', source: 'Data Pandas' },
  { country: 'Slovenia & Ukraine', height: '180.98 cm', source: 'Data Pandas' },
  { country: 'Germany', height: '180.80 cm', source: 'Wikipedia; Data Pandas' },
  { country: 'France', height: '179.70 cm', source: 'Wikipedia; MedicineNet' },
  { country: 'Australia & Canada', height: '178.80 cm', source: 'Data Pandas; Healthline' },
  { country: 'United Kingdom', height: '177.50 – 178.20 cm', source: 'Data Pandas; MedicineNet' },
  { country: 'United States', height: '176.90 cm', source: 'Data Pandas; Healthline' },
  { country: 'South Korea', height: '175.50 cm', source: 'Data Pandas; MedicineNet' },
  { country: 'China & Brazil', height: '175.70 cm', source: 'Data Pandas; MedicineNet' },
  { country: 'Japan', height: '172.10 cm', source: 'Data Pandas; MedicineNet' },
  { country: 'Mexico', height: '170.30 cm', source: 'MedicineNet' },
  { country: 'Vietnam', height: '168.40 cm', source: 'Data Pandas' },
  { country: 'Indonesia', height: '166.30 cm', source: 'Data Pandas' },
  { country: 'India', height: '164.90 cm', source: 'MedicineNet' },
  { country: 'Philippines', height: '163.30 cm', source: 'Data Pandas' },
  { country: 'Laos & Timor-Leste', height: '162.80 – 160.10 cm', source: 'Data Pandas; Visual Capitalist' },
];

// Animated hand-down emoji
const HandDown = () => (
  <span
    className="inline-block animate-bounce text-3xl ml-2"
    role="img"
    aria-label="Downward hand"
  >
    👇
  </span>
);

const CompareHeightToAverageInCountry: React.FC = () => {
  const t = useTranslations('compare_height_country');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-theme-50 via-white to-green-theme-50">
      {/* Top Introduction Section */}
      <section className="pt-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card-modern p-4 md:p-12 mb-8">
            <h1 className="text-display-lg md:text-5xl font-bold text-gray-900 mb-6 leading-tight text-center">
              {t('page_title')}
            </h1>
            <div className="prose prose-lg max-w-none text-gray-700 mx-auto">
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                {t('intro_p1')}
              </p>
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                {t('intro_p2')}
              </p>
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                {t('intro_p3')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                <a href="#height-compare-tool" className="btn-primary-modern inline-flex items-center gap-2 px-8 py-4 text-lg no-underline">
                  {t('try_now')} <HandDown />
                </a>
              </div>
              <div className="text-center mt-6 text-body-lg text-gray-500">
                {t('homepage_link')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Height Comparison Tool Section */}
      <section className="w-full mx-auto py-8" id="height-compare-tool">
        <HeightCompareTool presetData={presetData} />
      </section>

      {/* Bottom Knowledge and Insights Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card-modern p-4 md:p-12 mb-8">
            <h2 className="text-display-lg md:text-3xl font-bold text-gray-900 mb-6 text-center">
              {t('table_title')}
            </h2>
            <p className="text-body-lg mb-8 leading-relaxed text-center">
              {t('table_description')}
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm bg-white mb-8">
              <table className="min-w-full text-left text-sm text-gray-700">
                <thead className="bg-green-theme-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t('table_country')}</th>
                    <th className="px-4 py-3 font-semibold">{t('table_height')}</th>
                    <th className="px-4 py-3 font-semibold">{t('table_source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {countryHeightData.map((row, idx) => (
                    <tr key={row.country} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap">{row.country}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{row.height}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mb-8">
              <img
                src="/assets/blog/how-tall-are-men-around-the-world.png"
                alt="How Tall Are Men Around the World"
                className="rounded-lg shadow max-w-full md:max-w-[700px] h-auto"
              />
            </div>
          </div>

          <div className="card-modern p-4 md:p-12">
            <h2 className="text-display-lg md:text-3xl font-bold text-gray-900 mb-6 text-center">
              {t('insights_title')}
            </h2>
            <div className="prose prose-lg max-w-none text-gray-700 mx-auto">
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                {t('insights_intro')}
              </p>
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-display-sm font-semibold text-green-theme-700 mb-2">{t('tallest_countries_title')}</h3>
                  <ul className="list-disc pl-5 text-body-lg leading-relaxed">
                    <li>{t('tallest_countries_desc1')}</li>
                    <li>{t('tallest_countries_desc2')}</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-display-sm font-semibold text-green-theme-700 mb-2">{t('shortest_countries_title')}</h3>
                  <ul className="list-disc pl-5 text-body-lg leading-relaxed">
                    <li>{t('shortest_countries_desc1')}</li>
                    <li>{t('shortest_countries_desc2')}</li>
                  </ul>
                </div>
              </div>
              <div className="mb-8">
                <h3 className="text-display-sm font-semibold text-green-theme-700 mb-2">{t('middle_ground_title')}</h3>
                <ul className="list-disc pl-5 text-body-lg leading-relaxed">
                  <li>{t('middle_ground_desc1')}</li>
                  <li>{t('middle_ground_desc2')}</li>
                </ul>
              </div>
              <div className="mb-8">
                <h3 className="text-display-sm font-semibold text-green-theme-700 mb-2">{t('regional_trends_title')}</h3>
                <ul className="list-disc pl-5 text-body-lg leading-relaxed">
                  <li>{t('regional_trends_desc1')}</li>
                  <li>{t('regional_trends_desc2')}</li>
                </ul>
              </div>
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                <span className="font-semibold text-green-theme-700">{t('innovative_insight_title')}</span> {t('innovative_insight_desc')}
              </p>
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                {t('tool_benefits')}
              </p>
              <p className="text-body-lg leading-relaxed text-center">
                {t('closing_cta')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export { CompareHeightToAverageInCountry };