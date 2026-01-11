"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function HeroBanner() {
  return (
    <section
      className="flex w-full items-center px-4 py-8 sm:py-12 md:px-10 md:py-16"
      style={{
        background: "linear-gradient(#FFFFFF 0%, rgba(255,164,140,0.8) 150%)",
        minHeight: "calc(100vh - 80px)",
      }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 sm:gap-8 md:flex-row md:items-stretch md:gap-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full space-y-6 sm:space-y-8 md:max-w-xl"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-[40px] font-semibold leading-tight text-neutral-700 md:text-[56px]"
          >
            Corporate Gifting Made Simple, Stylish & Impactful
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm sm:text-base text-neutral-600 md:text-[20px] md:leading-8"
          >
            From apparel to onboarding kits, discover high-quality, customizable
            products in one place.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 text-sm sm:text-base font-semibold"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/products"
                className="rounded-2xl bg-brand px-6 py-2.5 sm:px-8 sm:py-3 text-white shadow-lg shadow-brand/25 transition hover:bg-brand/90 text-center block"
              >
                Explore Products
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <a
                href="/brochure.pdf"
                download
                className="inline-flex items-center justify-center gap-2 sm:gap-3 rounded-2xl border border-neutral-300 bg-white/60 px-6 py-2.5 sm:px-8 sm:py-3 text-neutral-900 transition hover:bg-white"
              >
                Download Catalogue
                <Image
                  src="/download.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="sm:w-5 sm:h-5"
                />
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden md:flex w-full justify-center mt-4 md:justify-end md:mt-0"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-[400px] sm:max-w-[500px] md:max-w-[600px]"
          >
            <div className="absolute inset-0 overflow-hidden rounded-lg md:rounded-none">
              <Image src="/Rectangle.png" alt="" fill priority={false} />
            </div>
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="absolute h-[400px] sm:h-[500px] md:h-[680px] w-full -translate-y-25"
            >
              <Image
                src="/banner.png"
                alt="Customizable premium t-shirt"
                fill
                priority
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
