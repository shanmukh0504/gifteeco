import HeroBanner from "@/components/landing/HeroBanner";
import ValueProps from "@/components/landing/ValueProps";
import ProductShowcase from "@/components/landing/ProductShowcase";
import AboutSection from "@/components/landing/AboutSection";
import FAQSection from "@/components/landing/FAQSection";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex w-full flex-col pb-16">
        <HeroBanner />
        <ValueProps />
        <ProductShowcase />
        <AboutSection />
        <FAQSection />
        <div id="contact" className="sr-only" aria-hidden />
      </div>
    </div>
  );
}
