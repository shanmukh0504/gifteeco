import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category";

type ProductDoc = {
  _id: string;
  price: number;
  hasColorOptions?: boolean;
  colors?: Map<string, { stock?: number }> | Record<string, { stock?: number }>;
  noColor?: { stock?: number };
  material?: string;
  deliveryTimeInDays?: number | null;
};

type CategoryDoc = {
  _id: string;
  name: string;
  subcategories?: Array<{ _id: string; name: string; slug: string }>;
};

export async function GET() {
  try {
    await connectDB();

    const products = await Product.find({}).select('material price hasColorOptions colors noColor deliveryTimeInDays').lean();

    const colorSet = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = 0;

    products.forEach((product) => {
      const productData = product as unknown as ProductDoc;
      if (productData.price < minPrice) minPrice = productData.price;
      if (productData.price > maxPrice) maxPrice = productData.price;

      if (productData.hasColorOptions && productData.colors) {
        const colorMap = productData.colors instanceof Map
          ? productData.colors
          : new Map(Object.entries(productData.colors || {}));
        colorMap.forEach((_: unknown, colorKey: string) => {
          colorSet.add(colorKey);
        });
      }
    });

    const categories = await Category.find({}).lean();
    const subcategories: Array<{ _id: string; name: string; categoryName: string }> = [];

    categories.forEach((cat) => {
      const catData = cat as unknown as CategoryDoc;
      if (catData.subcategories && catData.subcategories.length > 0) {
        catData.subcategories.forEach((sub: { _id: string; name: string }) => {
          subcategories.push({
            _id: sub._id.toString(),
            name: sub.name,
            categoryName: catData.name,
          });
        });
      }
    });

    const materialSet = new Set<string>();
    products.forEach((product) => {
      const productData = product as unknown as ProductDoc;
      if (productData.material) {
        const material = typeof productData.material === 'string'
          ? productData.material.trim()
          : String(productData.material).trim();
        if (material && material !== 'null' && material !== 'undefined') {
          materialSet.add(material);
        }
      }
    });

    const getTotalStock = (product: ProductDoc): number => {
      if (!product.hasColorOptions && product.noColor) {
        return product.noColor.stock || 0;
      }
      if (product.hasColorOptions && product.colors) {
        const colorMap = product.colors instanceof Map
          ? product.colors
          : new Map(Object.entries(product.colors || {}));
        let total = 0;
        colorMap.forEach((details: { stock?: number }) => {
          total += details?.stock || 0;
        });
        return total;
      }
      return 0;
    };

    const availableProductsCount = products.filter(
      (p) => getTotalStock(p as unknown as ProductDoc) > 0
    ).length;

    const fastShippingProductsCount = products.filter(
      (p) => {
        const productData = p as unknown as ProductDoc;
        return productData.deliveryTimeInDays !== null && productData.deliveryTimeInDays !== undefined && productData.deliveryTimeInDays <= 3;
      }
    ).length;

    return NextResponse.json({
      colors: Array.from(colorSet).sort(),
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === 0 ? 1000 : maxPrice,
      },
      subcategories: subcategories.sort((a, b) => a.name.localeCompare(b.name)),
      materials: Array.from(materialSet).sort(),
      stats: {
        availableProducts: availableProductsCount,
        fastShippingProducts: fastShippingProductsCount,
        totalProducts: products.length,
      },
    });
  } catch (error) {
    console.error("Error fetching filter options:", error);
    return NextResponse.json(
      { error: "Failed to fetch filter options" },
      { status: 500 }
    );
  }
}

