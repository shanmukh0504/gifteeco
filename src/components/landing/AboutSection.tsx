"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const features = [
  {
    title: "Premium Quality",
    description:
      "Curated products crafted with durable materials and attention to detail.",
  },
  {
    title: "Custom Branding",
    description:
      "Add your logo, colors, and messaging for a truly personalized experience.",
  },
  {
    title: "Fast & Reliable Delivery",
    description:
      "Timely, pan-India delivery for corporate events, onboarding, and celebrations.",
  },
  {
    title: "Eco-Friendly Options",
    description:
      "Sustainable gifting choices that reflect your brand's values and responsibility.",
  },
];

export default function AboutSection() {
  return (
    <section
      id="about"
      className="relative w-full overflow-hidden py-16 md:py-24"
      style={{ backgroundColor: "#EED4CA" }}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: "clamp(200px, 40vw, 662px)",
          height: "clamp(200px, 40vw, 662px)",
          left: "-15vw",
          top: "clamp(150px, 25vh, 379px)",
          backgroundColor: "#EBC7BA",
        }}
      />

      <div
        className="absolute z-10 hidden md:block"
        style={{
          left: "calc(-4vw + clamp(300px, 40vw, 662px) * 0.3)",
          top: "calc(clamp(200px, 30vh, 379px) + clamp(300px, 40vw, 662px) * 0.6)",
        }}
      >
        <Image
          src="/star.svg"
          alt=""
          width={64}
          height={64}
          className="w-full h-full"
        />
      </div>

      <div
        className="absolute rounded-full top-[350px] md:top-[-58vh]"
        style={{
          width: "clamp(250px, 45vw, 750px)",
          height: "clamp(250px, 45vw, 750px)",
          right: "-20vw",
          backgroundColor: "#EBC7BA",
        }}
      />

      <div
        className="absolute z-10 hidden 2xl:block"
        style={{
          right: "calc((100vw - 1536px) / 2 + 3vw)",
          top: "clamp(30px, 4vh, 57px)",
        }}
      >
        <Image
          src="/star.svg"
          alt=""
          width={64}
          height={64}
          className="w-full h-full"
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1536px] px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8 sm:mb-12 md:mb-16 text-center"
        >
          <h2 className="text-2xl sm:text-3xl md:text-[42px] font-semibold text-neutral-800 capitalize leading-[110%] font-dm-sans">
            Why Choose <span style={{ color: "#CF6144" }}>GifteeCo?</span>
          </h2>
        </motion.div>

        <div className="mb-8 sm:mb-12 md:mb-16 grid gap-6 sm:gap-8 lg:gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative space-y-3 sm:space-y-4 md:space-y-5"
          >
            <h3 className="relative z-10 text-2xl sm:text-3xl md:text-[40px] font-semibold text-[#1D1D1D] leading-[130%] sm:leading-[150%] font-dm-sans">
              Thoughtful Gifting That Builds Stronger Connections
            </h3>
            <p className="relative z-10 text-sm sm:text-base md:text-[20px] font-medium text-[#848383] leading-[150%] font-satoshi border-t pt-3 sm:pt-4">
              At GifTeeCo, every gift is designed to make people feel valued.
              From premium products to curated onboarding kits, we blend
              quality, personalization, and care to help companies celebrate
              teams, clients, and moments that matter.
            </p>
          </motion.div>

          {/* Right Side - shape.svg container with polygon image, star2, and spring */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            className="relative hidden lg:flex justify-center lg:justify-end"
          >
            {/* Container for shape.svg and all elements attached to it - rotated */}
            <motion.div
              initial={{ rotate: -18.73 }}
              whileHover={{ rotate: -15 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-[500px] aspect-[5/6]"
              style={{
                transformOrigin: "center",
              }}
            >
              {/* Shape behind the image */}
              <div
                className="absolute z-0 inset-0"
                style={{
                  pointerEvents: "none",
                }}
              >
                <div className="relative h-full w-full">
                  <Image
                    src="/shape.svg"
                    alt=""
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              <div
                className="absolute z-10"
                style={{
                  width: "80%",
                  aspectRatio: "1",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -60%)",
                }}
              >
                <div
                  className="relative h-full w-full overflow-hidden"
                  style={{
                    clipPath:
                      "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
                  }}
                >
                  <Image
                    src="/giftbox.png"
                    alt="Woman holding a gift box"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              <div
                className="absolute z-20 hidden lg:block"
                style={{
                  left: "10%",
                  top: "5%",
                }}
              >
                <Image src="/star2.svg" alt="" width={80} height={65} />
              </div>

              <div
                className="absolute z-20 hidden lg:block"
                style={{
                  width: "clamp(100px, 40%, 200px)",
                  height: "clamp(30px, 10%, 60px)",
                  right: "5%",
                  bottom: "5%",
                }}
              >
                <Image
                  src="/spring.svg"
                  alt=""
                  width={200}
                  height={60}
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
          className="grid gap-6"
        >
          {/* First row: 2fr : 3fr */}
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: "repeat(1, 1fr)",
            }}
          >
            <div
              className="hidden md:grid gap-6"
              style={{
                gridTemplateColumns: "2fr 3fr",
              }}
            >
              {features.slice(0, 2).map((feature, index) => (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-xl sm:rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 md:p-8"
                  style={{
                    boxShadow: "4px 4px 0px rgba(187, 128, 79, 0.5)",
                  }}
                >
                  <h4 className="mb-2 sm:mb-3 text-lg sm:text-xl font-bold text-neutral-800">
                    {feature.title}
                  </h4>
                  <p className="text-sm sm:text-base leading-6 text-neutral-700">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
            {/* Mobile: single column */}
            <div className="grid gap-4 sm:gap-6 md:hidden">
              {features.slice(0, 2).map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-xl sm:rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6"
                  style={{
                    boxShadow: "4px 4px 0px rgba(187, 128, 79, 0.5)",
                  }}
                >
                  <h4 className="mb-2 sm:mb-3 text-lg sm:text-xl font-bold text-neutral-800">
                    {feature.title}
                  </h4>
                  <p className="text-sm sm:text-base leading-6 text-neutral-700">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
          {/* Second row: 3fr : 2fr */}
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: "repeat(1, 1fr)",
            }}
          >
            <div
              className="hidden md:grid gap-6"
              style={{
                gridTemplateColumns: "3fr 2fr",
              }}
            >
              {features.slice(2, 4).map((feature, index) => (
                <motion.div
                  key={index + 2}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-xl sm:rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 md:p-8"
                  style={{
                    boxShadow: "4px 4px 0px rgba(187, 128, 79, 0.5)",
                  }}
                >
                  <h4 className="mb-2 sm:mb-3 text-lg sm:text-xl font-bold text-neutral-800">
                    {feature.title}
                  </h4>
                  <p className="text-sm sm:text-base leading-6 text-neutral-700">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
            {/* Mobile: single column */}
            <div className="grid gap-4 sm:gap-6 md:hidden">
              {features.slice(2, 4).map((feature, index) => (
                <motion.div
                  key={index + 2}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-xl sm:rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6"
                  style={{
                    boxShadow: "4px 4px 0px rgba(187, 128, 79, 0.5)",
                  }}
                >
                  <h4 className="mb-2 sm:mb-3 text-lg sm:text-xl font-bold text-neutral-800">
                    {feature.title}
                  </h4>
                  <p className="text-sm sm:text-base leading-6 text-neutral-700">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
