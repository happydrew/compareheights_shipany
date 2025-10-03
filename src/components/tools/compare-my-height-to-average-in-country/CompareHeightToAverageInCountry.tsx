import React from 'react';
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-theme-50 via-white to-green-theme-50">
      {/* Top Introduction Section */}
      <section className="pt-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card-modern p-4 md:p-12 mb-8">
            <h1 className="text-display-lg md:text-5xl font-bold text-gray-900 mb-6 leading-tight text-center">
              Compare My Height to Average in Country
            </h1>
            <div className="prose prose-lg max-w-none text-gray-700 mx-auto">
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                Ever wondered how you stack up against the rest of the world? With our advanced height comparison tool, you can <strong>compare my height to average in country</strong> and instantly visualize your height next to the average heights of men from countries all around the globe.
              </p>
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                Simply select countries from our comprehensive character library, which includes the average male heights for nearly every major nation. If your country isn’t listed, upload a custom character or image and set the height yourself. Our tool supports unlimited characters, so you can <strong>compare my height to average in country</strong> for as many countries as you like, all in one beautiful, shareable chart.
              </p>
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                Adjust the order, height, and name of each character, set the background, switch to dark mode, and export your comparison chart as a high-resolution image. <span className="text-green-theme-600 font-semibold">It’s never been easier or more fun to compare my height to average in country!</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                <a href="#height-compare-tool" className="btn-primary-modern inline-flex items-center gap-2 px-8 py-4 text-lg">
                  Try Now: Compare My Height to Average in Country <HandDown />
                </a>
              </div>
              <div className="text-center mt-6 text-body-lg text-gray-500">
                Want to explore even more fun features? Visit the <a href="/" className="text-green-theme-700 underline hover:text-green-theme-600 font-semibold">homepage</a> to use the full-featured height comparison tool, including celebrity, anime, and custom object comparisons, advanced export options, and more!
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
              Global Average Male Heights by Country
            </h2>
            <p className="text-body-lg mb-8 leading-relaxed text-center">
              The table below shows the average male height for major countries around the world. Use this data to <strong>compare my height to average in country</strong> and see where you stand globally.
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm bg-white mb-8">
              <table className="min-w-full text-left text-sm text-gray-700">
                <thead className="bg-green-theme-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Country</th>
                    <th className="px-4 py-3 font-semibold">Avg. Male Height</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
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
              Fun Facts & Insights: Compare My Height to Average in Country
            </h2>
            <div className="prose prose-lg max-w-none text-gray-700 mx-auto">
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                When you <strong>compare my height to average in country</strong>, you’ll quickly notice that average male heights vary dramatically across the globe. The Netherlands boasts the world’s tallest men, with an average height of 183.8 cm, while countries like Indonesia and the Philippines have averages closer to 165 cm. This means that if you <strong>compare my height to average in country</strong> and you’re 175 cm tall, you might be above average in Southeast Asia but below average in Northern Europe.
              </p>
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-display-sm font-semibold text-green-theme-700 mb-2">Tallest Countries</h3>
                  <ul className="list-disc pl-5 text-body-lg leading-relaxed">
                    <li>The Netherlands, Montenegro, Estonia, and Iceland all have average male heights above 182 cm.</li>
                    <li>If you <strong>compare my height to average in country</strong> with these nations, you’ll see just how tall the world’s tallest populations are.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-display-sm font-semibold text-green-theme-700 mb-2">Shortest Countries</h3>
                  <ul className="list-disc pl-5 text-body-lg leading-relaxed">
                    <li>Laos, Timor-Leste, the Philippines, and Indonesia have average male heights between 160 and 166 cm.</li>
                    <li><strong>Compare my height to average in country</strong> here, and you might find yourself towering above the local average!</li>
                  </ul>
                </div>
              </div>
              <div className="mb-8">
                <h3 className="text-display-sm font-semibold text-green-theme-700 mb-2">Global Middle Ground</h3>
                <ul className="list-disc pl-5 text-body-lg leading-relaxed">
                  <li>Countries like the United States (176.9 cm), China (175.7 cm), and Japan (172.1 cm) represent the global average.</li>
                  <li>When you <strong>compare my height to average in country</strong> with these, you’ll get a sense of where you stand worldwide.</li>
                </ul>
              </div>
              <div className="mb-8">
                <h3 className="text-display-sm font-semibold text-green-theme-700 mb-2">Regional Trends</h3>
                <ul className="list-disc pl-5 text-body-lg leading-relaxed">
                  <li>Northern and Eastern Europe dominate the tall rankings, while Southeast Asia and parts of South America are on the shorter side.</li>
                  <li><strong>Compare my height to average in country</strong> to see these patterns in action.</li>
                </ul>
              </div>
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                <span className="font-semibold text-green-theme-700">Innovative insight:</span> The global average male height has been rising in many countries due to improved nutrition and healthcare. For example, South Korea and China have seen significant increases in average height over the past few decades. When you <strong>compare my height to average in country</strong> today, you’re seeing a snapshot of ongoing human development and progress.
              </p>
              <p className="text-body-lg mb-6 leading-relaxed text-center">
                Our tool is designed to make it easy and engaging to <strong>compare my height to average in country</strong>. Add as many countries as you like, rearrange them, and even upload your own custom characters. Export your chart as a high-resolution image, perfect for sharing or using in presentations. Whether you’re a student, a teacher, a traveler, or just curious, there’s never been a better way to <strong>compare my height to average in country</strong>.
              </p>
              <p className="text-body-lg leading-relaxed text-center">
                Ready to see where you stand? Don’t just guess—<strong>compare my height to average in country</strong> and discover your place in the world’s height rankings. Try it now and share your results with friends. The world of height comparison is at your fingertips!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export { CompareHeightToAverageInCountry };