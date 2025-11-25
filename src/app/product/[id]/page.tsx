import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category";
import ProductDetailView from "@/components/product/ProductDetailView";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: Params) {
  try {
    const { id } = await params;
    await connectDB();

    // Import Category to ensure it's registered before populate
    void Category;

    const productDoc = await Product.findById(id)
      .populate("category", "name")
      .lean();

    if (!productDoc) {
      notFound();
    }

    const product = JSON.parse(JSON.stringify(productDoc));

    return (
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <ProductDetailView product={product} />
      </div>
    );
  } catch (error) {
    console.error("Error loading product:", error);
    notFound();
  }
}
