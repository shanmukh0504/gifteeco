"use client";

import Image from "next/image";
import { motion } from "framer-motion";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function ValueProps() {
  return (
    <section className="relative z-10 -mt-4 sm:-mt-8 w-full md:-mt-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto w-full max-w-5xl rounded-2xl sm:rounded-3xl bg-white py-6 sm:py-8 md:py-12 px-4 sm:px-8 shadow-[0_20px_80px_rgba(23,17,23,0.08)] md:px-12"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center md:text-left"
        >
          {highlights.map((item) => (
            <motion.div
              key={item.title}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -5 }}
              className="flex flex-col sm:flex-row lg:flex-col items-center sm:items-start gap-3 sm:gap-4"
            >
              <motion.div
                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
                className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center flex-shrink-0"
              >
                <Image
                  src={item.icon}
                  alt={item.title}
                  width={32}
                  height={32}
                  className="w-8 h-8 sm:w-8 sm:h-8"
                />
              </motion.div>
              <div className="text-center sm:text-left">
                <p className="text-sm sm:text-base font-semibold text-neutral-900">
                  {item.title}
                </p>
                <p className="text-xs sm:text-xs text-neutral-500 mt-1">{item.caption}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
