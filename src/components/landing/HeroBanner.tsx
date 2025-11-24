import Image from "next/image";
import Link from "next/link";

export default function HeroBanner() {
  return (
    <section
      className="flex w-full items-center px-4 py-12 md:px-10 md:py-16"
      style={{
        background: "linear-gradient(#FFFFFF 0%, rgba(255,164,140,0.8) 150%)",
        minHeight: "calc(100vh - 80px)",
      }}
    >
      <div className="mx-auto flex w-full flex-col items-center gap-8 md:flex-row md:items-stretch md:gap-12">
        <div className="w-full space-y-8 md:max-w-xl">
          <h1 className="text-[40px] font-semibold leading-tight text-neutral-700 md:text-[56px]">
            Corporate Gifting Made Simple, Stylish & Impactful
          </h1>
          <p className="text-base text-neutral-600 md:text-[20px] md:leading-8">
            From apparel to onboarding kits, discover high-quality, customizable
            products in one place.
          </p>
          <div className="flex flex-wrap gap-4 text-base font-semibold">
            <Link
              href="/products"
              className="rounded-2xl bg-brand px-8 py-3 text-white shadow-lg shadow-brand/25 transition hover:bg-brand/90"
            >
              Explore Products
            </Link>
            <a
              href="/brochure.pdf"
              download
              className="inline-flex items-center gap-3 rounded-2xl border border-neutral-300 bg-white/60 px-8 py-3 text-neutral-900 transition hover:bg-white"
            >
              Download Catalogue
              <Image src="/download.svg" alt="" width={20} height={20} />
            </a>
          </div>
        </div>

        <div className="relative flex w-full justify-center md:justify-end">
          <div className="relative w-full max-w-[600px]">
            <div className="absolute inset-0 overflow-hidden">
              <Image src="/Rectangle.png" alt="" fill priority={false} />
            </div>
            <div className="absolute h-[680px] w-full -translate-y-25">
              <Image
                src="/banner.png"
                alt="Customizable premium t-shirt"
                fill
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
