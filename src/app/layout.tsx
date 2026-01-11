import type { Metadata } from "next";
import { Poppins, DM_Sans } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "sonner";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import CartLoadingOverlay from "@/components/cart/CartLoadingOverlay";
import CartStorageErrorHandler from "@/components/cart/CartStorageErrorHandler";
import ScrollToTop from "@/components/shared/ScrollToTop";
import PageTransition from "@/components/shared/PageTransition";
import SessionGuard from "@/components/shared/SessionGuard";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Gifteeco - Premium Corporate Gifting",
  description:
    "Your one-stop destination for premium corporate gifting and custom apparel solutions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${dmSans.variable}`}>
      <body className={`${poppins.className} antialiased`}>
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <Navbar />
        <PageTransition>{children}</PageTransition>
        <Footer />
        <Toaster richColors position="bottom-right" />
        <CartLoadingOverlay />
        <CartStorageErrorHandler />
        <SessionGuard />
      </body>
    </html>
  );
}
