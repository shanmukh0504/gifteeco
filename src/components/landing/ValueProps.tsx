import Image from "next/image";

const highlights = [
  {
    title: "Discount",
    caption: "Every week new sales",
    icon: "/discount.svg",
  },
  {
    title: "Free Delivery",
    caption: "100% free for all orders",
    icon: "/delivery.svg",
  },
  {
    title: "Great Support 24/7",
    caption: "We care about your experience",
    icon: "/support.svg",
  },
  {
    title: "Secure Payment",
    caption: "100% secure payment method",
    icon: "/secure.svg",
  },
];

export default function ValueProps() {
  return (
    <section className="relative z-10 -mt-8 w-full md:-mt-12">
      <div className="mx-auto w-full max-w-5xl rounded-3xl bg-white py-8 md:py-12 px-8 shadow-[0_20px_80px_rgba(23,17,23,0.08)] md:px-12">
        <div className="flex flex-col gap-8 text-center md:flex-row md:items-center md:justify-between md:text-left">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-4 md:flex-col md:items-start lg:flex-row"
            >
              <div className="flex h-14 w-14 items-center justify-center">
                <Image
                  src={item.icon}
                  alt={item.title}
                  width={32}
                  height={32}
                />
              </div>
              <div className="text-left">
                <p className="text-base font-semibold text-neutral-900">
                  {item.title}
                </p>
                <p className="text-xs text-neutral-500">{item.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
