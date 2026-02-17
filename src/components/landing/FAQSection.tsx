"use client";

import { useEffect, useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  order: number;
}

export default function FAQSection() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const response = await fetch("/api/faq");
      if (!response.ok) throw new Error("Failed to fetch FAQs");
      const data = await response.json();
      setFaqs(data);
      // Open first FAQ by default
      if (data.length > 0) {
        setOpenIndex(0);
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (loading) {
    return (
      <section className="w-full py-16 md:py-24 bg-white">
        <div className="mx-auto w-full max-w-4xl px-4 md:px-6">
          <div className="text-center mb-12">
            <div className="h-8 w-64 bg-neutral-200 rounded animate-pulse mx-auto mb-4" />
            <div className="h-1 w-32 bg-neutral-200 rounded animate-pulse mx-auto" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 bg-neutral-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (faqs.length === 0) {
    return null;
  }

  return (
    <section id="faqs" className="w-full py-12 sm:py-16 md:py-24 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-800 mb-3 sm:mb-4 font-dm-sans">
            Frequently Asked Questions
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "80px" }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-20 sm:w-24 h-1 bg-[#CF6144] mx-auto rounded-full"
          />
        </motion.div>

        {/* FAQ Items */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="space-y-3 sm:space-y-4"
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={faq._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              whileHover={{ scale: 1.01 }}
              className={`rounded-xl sm:rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 transition-all duration-200 ${
                openIndex === index ? "" : "hover:shadow-sm"
              }`}
              style={
                openIndex === index
                  ? {
                      boxShadow: "4px 4px 0px rgba(187, 128, 79, 0.5)",
                    }
                  : {}
              }
            >
              {/* Question */}
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-start sm:items-center justify-between text-left focus:outline-none gap-2"
              >
                <h3 className="text-base sm:text-lg font-semibold text-neutral-800 pr-2 sm:pr-4 flex-1">
                  {faq.question}
                </h3>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0 mt-1 sm:mt-0"
                >
                  <FaChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                </motion.div>
              </button>

              {/* Answer */}
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-neutral-100">
                      <p className="text-sm sm:text-base leading-6 sm:leading-7 text-neutral-700">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
