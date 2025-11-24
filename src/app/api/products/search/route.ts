import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Product from "@/models/Product";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const categoryId = searchParams.get("category");
    const subCategory = searchParams.get("subCategory");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const suggestionsOnly = searchParams.get("suggestionsOnly") === "true";

    if (!query && !categoryId && !subCategory) {
      return NextResponse.json({ products: [], suggestions: [] });
    }

    const searchQuery: Record<string, unknown> = {};

    // Text search across name, tags, description, and comboItems (for Welcome Kits)
    if (query) {
      const searchRegex = new RegExp(query, "i");
      
      // First, find products whose comboItems match the search (Welcome Kits search)
      const matchingComboProducts = await Product.find({
        type: "combo",
        comboItems: { $exists: true, $ne: [] }
      })
        .populate({
          path: "comboItems.productId",
          model: Product,
          select: "name tags"
        })
        .lean();

      const matchingComboIds: string[] = [];
      
      for (const comboProduct of matchingComboProducts) {
        if (comboProduct.comboItems && Array.isArray(comboProduct.comboItems)) {
          for (const item of comboProduct.comboItems) {
            const comboItem = item as { productId: string | { name?: string; tags?: string[] } };
            if (comboItem.productId) {
              const product = typeof comboItem.productId === "object" 
                ? comboItem.productId 
                : await Product.findById(comboItem.productId).select("name tags").lean();
              
              if (product) {
                const productName = (product as { name?: string }).name || "";
                const productTags = (product as { tags?: string[] }).tags || [];
                const matches = 
                  searchRegex.test(productName) ||
                  productTags.some((tag: string) => searchRegex.test(tag));
                
                if (matches) {
                  const comboId = (comboProduct as { _id?: string | { toString(): string } })._id;
                  const comboIdStr = typeof comboId === 'string' ? comboId : comboId?.toString() || '';
                  if (!matchingComboIds.includes(comboIdStr)) {
                    matchingComboIds.push(comboIdStr);
                  }
                }
              }
            }
          }
        }
      }

      // Build search query
      const orQuery: Array<Record<string, unknown>> = [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
      ];

      // If we found matching combo products, include them
      if (matchingComboIds.length > 0) {
        orQuery.push({ _id: { $in: matchingComboIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      }
      (searchQuery as { $or?: Array<Record<string, unknown>> }).$or = orQuery;
    }

    // Category filter
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      searchQuery.category = new mongoose.Types.ObjectId(categoryId);
    }

    // Subcategory filter
    if (subCategory && mongoose.Types.ObjectId.isValid(subCategory)) {
      searchQuery.subCategory = new mongoose.Types.ObjectId(subCategory);
    }

    // If suggestions only, return limited results for autocomplete
    if (suggestionsOnly) {
      const products = await Product.find(searchQuery)
        .select("name price category type")
        .populate("category", "name slug")
        .limit(5)
        .lean();

      const suggestions = products.map((p) => {
        const productData = p as unknown as { _id: string | { toString(): string }; name?: string; category?: { name?: string } | string; price?: unknown; type?: unknown };
        return {
          id: typeof productData._id === 'string' ? productData._id : productData._id.toString(),
          name: String(productData.name || ""),
          category: typeof productData.category === 'object' && productData.category !== null ? (productData.category as { name?: string }).name || "" : String(productData.category || ""),
          price: productData.price,
          type: productData.type,
        };
      });

      return NextResponse.json({ suggestions });
    }

    // Execute full search
    const products = await Product.find(searchQuery)
      .populate("category", "name slug")
      .populate({
        path: "comboItems.productId",
        model: Product,
        select: "name tags category",
        populate: {
          path: "category",
          select: "name slug",
        },
      })
      .limit(limit)
      .lean();

    return NextResponse.json({
      products,
      count: products.length,
    });
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json(
      { error: "Failed to search products" },
      { status: 500 }
    );
  }
}

