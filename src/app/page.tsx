"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

// Dummy Data
const popularProducts = [
  {
    id: 1,
    name: "Classic White T-Shirt",
    price: 29.99,
    image: "/products/tshirt.jpg",
  },
  {
    id: 2,
    name: "Denim Jeans",
    price: 79.99,
    image: "/products/jeans.jpg",
  },
  {
    id: 3,
    name: "Summer Dress",
    price: 59.99,
    image: "/products/dress.jpg",
  },
  {
    id: 4,
    name: "Leather Jacket",
    price: 199.99,
    image: "/products/jacket.jpg",
  },
];

const testimonials = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Fashion Blogger",
    content: "The quality of clothes and customer service is exceptional!",
    image: "/testimonials/sarah.jpg",
  },
  {
    id: 2,
    name: "Mike Thompson",
    role: "Regular Customer",
    content:
      "Best clothing store I've ever shopped at. Great variety and prices!",
    image: "/testimonials/mike.jpg",
  },
];

const brandLogos = [
  "/brands/nike.svg",
  "/brands/adidas.svg",
  "/brands/puma.svg",
  "/brands/reebok.svg",
  "/brands/under-armour.svg",
  "/brands/new-balance.svg",
];

const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="h-[80vh] flex items-center justify-between">
        <div className="w-1/2 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-black max-w-xl"
          >
            <h1 className="text-4xl md:text-4xl font-bold font-zinc-700 mb-6 leading-tight">
              Your Brand, Your Style: Custom Corporate Clothing Made Easy!
            </h1>
            <p className="text-lg md:text-xl mb-8 text-zinc-600">
              Create premium, customized corporate clothing that reflects your brand—perfect for teams, clients, and events
            </p>
            <Link
              href="/products"
              className="bg-[#F34C4C] text-white px-8 py-2 rounded-2xl text-lg font-semibold hover:bg-opacity-90 transition-all inline-block"
            >
              Explore
            </Link>
          </motion.div>
        </div>
        <div className="w-1/2 relative h-full">
          <Image
            src="/shirt.png"
            alt="Corporate Clothing"
            fill
            className="object-contain"
            priority
          />
        </div>
      </section>

      {/* Popular Products Section */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12">
            Popular Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {popularProducts.map((product) => (
              <motion.div
                key={product.id}
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="relative h-64">
                  <Image
                    // src={product.image}
                    src="/shirt.png"
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                  <p className="text-zinc-600">${product.price}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12">
            What Our Customers Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <div className="flex items-center mb-4">
                  <Image
                    // src={testimonial.image}
                    src="/shirt.png"
                    alt={testimonial.name}
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                  <div className="ml-4">
                    <h3 className="font-semibold">{testimonial.name}</h3>
                    <p className="text-zinc-600">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-zinc-700">{testimonial.content}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section className="py-16 bg-zinc-50 overflow-hidden">
        <h2 className="text-4xl font-bold text-center mb-12">
          Brands That Trust Us
        </h2>
        <div className="relative">
          <div className="flex space-x-12 animate-marquee">
            {[...brandLogos, ...brandLogos].map((logo, index) => (
              <div key={index} className="flex-shrink-0 w-32 h-32 relative">
                <Image
                  // src={logo}
                  src="/shirt.png"
                  alt="Brand Logo"
                  fill
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-4xl font-bold mb-6">Get in Touch</h2>
              <p className="text-zinc-300 mb-8">
                Have questions? We'd love to hear from you. Send us a message
                and we'll respond as soon as possible.
              </p>
              <div className="space-y-4">
                <p className="flex items-center">
                  <span className="mr-3">📍</span>
                  123 Fashion Street, Style City, ST 12345
                </p>
                <p className="flex items-center">
                  <span className="mr-3">📞</span>
                  +1 (555) 123-4567
                </p>
                <p className="flex items-center">
                  <span className="mr-3">✉️</span>
                  contact@gifteeco.com
                </p>
              </div>
            </div>
            <form className="space-y-6">
              <div>
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-white"
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Your Email"
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-white"
                />
              </div>
              <div>
                <textarea
                  rows={4}
                  placeholder="Your Message"
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-white"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-white text-black py-3 px-6 rounded-lg font-semibold hover:bg-opacity-90 transition-all"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Gifteeco</h3>
              <p className="text-zinc-400">
                Your one-stop shop for trendy clothes and accessories.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-zinc-400 hover:text-white"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products"
                    className="text-zinc-400 hover:text-white"
                  >
                    Products
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-zinc-400 hover:text-white"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-zinc-400 hover:text-white">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Categories</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/category/men"
                    className="text-zinc-400 hover:text-white"
                  >
                    Men
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/women"
                    className="text-zinc-400 hover:text-white"
                  >
                    Women
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/kids"
                    className="text-zinc-400 hover:text-white"
                  >
                    Kids
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/accessories"
                    className="text-zinc-400 hover:text-white"
                  >
                    Accessories
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-zinc-400 hover:text-white">
                  <span className="sr-only">Facebook</span>
                  📱
                </a>
                <a href="#" className="text-zinc-400 hover:text-white">
                  <span className="sr-only">Instagram</span>
                  📸
                </a>
                <a href="#" className="text-zinc-400 hover:text-white">
                  <span className="sr-only">Twitter</span>
                  🐦
                </a>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-zinc-400">
            <p>
              &copy; {new Date().getFullYear()} Gifteeco. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
