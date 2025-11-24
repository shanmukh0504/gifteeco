import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import Product from "@/models/Product";
import ProductCustomizer from "@/components/product/ProductCustomizer";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function CustomizeProductPage({ params }: Params) {
  const { id } = await params;
  await connectDB();

  const productDoc = await Product.findById(id)
    .populate("category", "name")
    .lean();

  if (!productDoc) {
    notFound();
  }

  const product = JSON.parse(JSON.stringify(productDoc));

  // Check if product has any customization mockup images
  const hasCustomizationImages = (() => {
    // Check colors for customization mockup images
    if (product.colors && typeof product.colors === "object") {
      const colorEntries = Object.entries(product.colors);
      for (const [, colorData] of colorEntries) {
        const customization = (
          colorData as { customization?: Record<string, unknown> }
        )?.customization;
        if (customization) {
          const slots = ["front", "back", "chest"];
          for (const slot of slots) {
            const slotData = customization[slot] as
              | { mockupImage?: string }
              | undefined;
            if (slotData?.mockupImage) {
              return true;
            }
          }
        }
      }
    }
    // Check noColor customization
    if (product.noColor?.customization) {
      const slots = ["front", "back", "chest"];
      for (const slot of slots) {
        if (product.noColor.customization[slot]?.mockupImage) {
          return true;
        }
      }
    }
    return false;
  })();

  if (!hasCustomizationImages) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <ProductCustomizer product={product} />
    </div>
  );
}
