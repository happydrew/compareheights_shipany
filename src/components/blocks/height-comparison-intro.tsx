import React from 'react';

interface HeightComparisonIntroProps {
  id?: string;
}

export default function HeightComparisonIntro({ id = "height-comparison-intro" }: HeightComparisonIntroProps) {
  return (
    <section id={id} className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="card-modern p-8 md:p-12">
          <h2 className="text-display-md md:text-3xl font-bold text-gray-900 mb-6">
            What is Height Comparison?
          </h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-body-lg text-gray-700 mb-6 leading-relaxed">
              <strong>Height Comparison</strong> is the process of visually and numerically comparing heights and height differences between people, characters, or objects using a height comparison tool or height comparison chart. With our advanced online height comparison tool, height compare and understanding height difference is now easier than ever. Whether you're curious about how your height stacks up against your favorite celebrities, need to visualize character heights and height differences for creative projects, or want to create engaging <strong>height comparison charts</strong> for educational purposes, our platform makes <strong>comparing heights</strong> and exploring height difference simple and fun.
            </p>
            <p className="text-body-lg text-gray-700 leading-relaxed">
              Our <strong>height comparison tool</strong> offers a comprehensive solution for anyone looking to create accurate, visual height comparisons. From comparing anime character heights to analyzing celebrity dimensions and height differences, this <strong>height chart comparison</strong> tool provides instant, precise results that help you understand proportional relationships and height difference at a glance. The height comparison chart is perfect for comparing heights and height differences in both metric and imperial units, making it the go-to height comparison tool for users worldwide.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}