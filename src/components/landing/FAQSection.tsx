"use client";

import { useEffect, useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

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
    <section id="faqs" className="w-full py-16 md:py-24 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-4 font-dm-sans">
            Frequently Asked Questions
          </h2>
          <div className="w-24 h-1 bg-[#CF6144] mx-auto rounded-full" />
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={faq._id}
              className={`rounded-2xl border border-neutral-200 bg-white p-6 transition-all duration-200 ${
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
                className="w-full flex items-center justify-between text-left focus:outline-none"
              >
                <h3 className="text-lg font-semibold text-neutral-800 pr-4">
                  {faq.question}
                </h3>
                <div className="flex-shrink-0">
                  {openIndex === index ? (
                    <FaChevronUp className="w-5 h-5 text-neutral-400" />
                  ) : (
                    <FaChevronDown className="w-5 h-5 text-neutral-400" />
                  )}
                </div>
              </button>

              {/* Answer */}
              {openIndex === index && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <p className="text-base leading-7 text-neutral-700">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
