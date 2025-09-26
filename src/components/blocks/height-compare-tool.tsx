import { HeightCompareTool } from "@/components/compareheights/HeightCompareTool";

export default function HeightCompareToolBlock({ id = "height-compare-tool" }: { id?: string }) {
  return (
    <section id={id} className="w-full">
      <HeightCompareTool />
    </section>
  );
}