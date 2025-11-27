"use client";

import { useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";

export default function ContactSection() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.phone || !form.message) {
      toast.error("Please fill in all fields");
      return;
    }

    const subject = encodeURIComponent("Contact Inquiry from Gifteeco Website");
    const body = encodeURIComponent(
      `Hello Gifteeco Team,\n\n` +
        `I would like to get in touch with you regarding your corporate gifting services.\n\n` +
        `Here are my details:\n` +
        `Name: ${form.name}\n` +
        `Email: ${form.email}\n` +
        `Phone: ${form.phone}\n\n` +
        `Message:\n${form.message}\n\n` +
        `Looking forward to hearing from you.\n\n` +
        `Best regards,\n${form.name}`
    );

    window.location.href = `mailto:giftecoweb@gmail.com?subject=${subject}&body=${body}`;

    toast.success("Opening your email client...");
  };

  return (
    <section className="relative w-full overflow-hidden py-16 md:py-24">
      <div className="relative z-10 flex flex-col justify-center items-center w-full px-4 md:px-6">
        <div className="mb-12">
          <h2 className="text-4xl font-semibold leading-tight text-neutral-900 md:text-5xl lg:text-6xl font-dm-sans">
            Get in touch with us.
          </h2>
          <br />
          <span className="text-2xl text-[#CF6144]">
            Let&apos;s create meaningful gifting experiences together.
          </span>
        </div>

        <div className="flex justify-center items-center w-full">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-xl mx-auto flex flex-col items-center"
          >
            <div className="grid gap-6 md:grid-cols-1 w-full">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-neutral-700 font-dm-sans"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder-neutral-400 transition focus:border-[#FF9AA2] focus:outline-none focus:ring-2 focus:ring-[#FF9AA2] font-dm-sans"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-neutral-700 font-dm-sans"
                >
                  Email Id
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder-neutral-400 transition focus:border-[#FF9AA2] focus:outline-none focus:ring-2 focus:ring-[#FF9AA2] font-dm-sans"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-neutral-700 font-dm-sans"
                >
                  Phone no.
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 2342564432"
                  required
                  className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder-neutral-400 transition focus:border-[#FF9AA2] focus:outline-none focus:ring-2 focus:ring-[#FF9AA2] font-dm-sans"
                />
              </div>
            </div>

            <div className="mt-6 w-full">
              <label
                htmlFor="message"
                className="mb-2 block text-sm font-medium text-neutral-700 font-dm-sans"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Write your message here"
                rows={6}
                required
                className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder-neutral-400 transition focus:border-[#FF9AA2] focus:outline-none focus:ring-2 focus:ring-[#FF9AA2] resize-none font-dm-sans"
              />
            </div>

            <div className="mt-6 flex justify-center w-full">
              <Button
                type="submit"
                className="rounded-full bg-[#CF6144] px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-[#B8543A] focus:outline-none focus:ring-2 focus:ring-[#CF6144] focus:ring-offset-2 font-dm-sans"
              >
                Leave us a Message
                <svg
                  className="ml-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
