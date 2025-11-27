import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/models/Product';
import connectDB from '@/lib/db';
import { auth } from '@/lib/auth';
import {
  buildSearchTerms,
  buildMongoSearchQuery,
  comboMatchesSearch,
} from '@/utils/search';

type ProductWithStock = {
  hasColorOptions?: boolean;
  colors?: Map<string, { stock?: number }> | Record<string, { stock?: number }>;
  noColor?: { stock?: number };
};

function getTotalStock(product: ProductWithStock): number {
  if (!product.hasColorOptions && product.noColor) {
    return product.noColor.stock || 0;
  }
  if (product.hasColorOptions && product.colors) {
    const colorMap = product.colors instanceof Map ? product.colors : new Map(Object.entries(product.colors || {}));
    let total = 0;
    for (const [, details] of colorMap) {
      total += details?.stock || 0;
    }
    return total;
  }
  return 0;
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const colors = searchParams.get("colors")?.split(",").filter(Boolean);
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const fastShipping = searchParams.get("fastShipping") === "true";
    const onlyAvailable = searchParams.get("onlyAvailable") === "true";
    const subcategories = searchParams.get("subcategories")?.split(",").filter(Boolean);
    const material = searchParams.get("material");
    const sortBy = searchParams.get("sortBy") || "default";
    const bulkOrders = searchParams.get("bulkOrders") === "true";

    const query: Record<string, unknown> = {};

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
      }

      const Category = (await import('@/models/Category')).default;

      const categoryDoc = await Category.findById(category);

      if (categoryDoc) {
        query.category = category;
      } else {
        const allCategories = await Category.find({});
        const parentCategory = allCategories.find((cat) => {
          const catData = cat as { subcategories?: Array<{ _id: string | { toString(): string } }> };
          return catData.subcategories?.some((sub) => {
            const subId = typeof sub._id === 'string' ? sub._id : sub._id.toString();
            return subId === category;
          });
        });

        if (parentCategory) {
          const parentData = parentCategory as { subcategories?: Array<{ _id: string | { toString(): string } }> };
          const subcategory = parentData.subcategories?.find(
            (sub) => {
              const subId = typeof sub._id === 'string' ? sub._id : sub._id.toString();
              return subId === category;
            }
          );

          if (subcategory) {
            query.category = parentCategory._id;
            query.subCategory = new mongoose.Types.ObjectId(category);
          }
        } else {
          return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
      }
    }

    if (subcategories && subcategories.length > 0) {
      const validSubcategoryIds = subcategories.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validSubcategoryIds.length > 0) {
        query.subCategory = { $in: validSubcategoryIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    let correctedSearchQuery: string | null = null;
    if (search) {
      const allProducts = await Product.find({})
        .select('name tags')
        .limit(1000)
        .lean();

      const allProductWords: string[] = [];
      for (const product of allProducts) {
        const productData = product as { name?: string; tags?: string[] };
        if (productData.name) {
          const words = productData.name.split(/\s+/);
          allProductWords.push(...words);
        }
        if (productData.tags && Array.isArray(productData.tags)) {
          allProductWords.push(...productData.tags);
        }
      }

      const uniqueWords = Array.from(new Set(allProductWords.map(w => w.toLowerCase())));

      const { correctedQuery, searchTerms, expandedTerms } = buildSearchTerms(search, uniqueWords);
      correctedSearchQuery = correctedQuery !== search ? correctedQuery : null;

      const orConditions = buildMongoSearchQuery(search, correctedQuery, searchTerms, expandedTerms);
      query.$or = orConditions;

      const allCombos = await Product.find({
        type: 'combo',
        comboItems: { $exists: true, $ne: [] }
      })
        .populate({
          path: 'comboItems.productId',
          model: Product,
          select: 'name tags description'
        })
        .lean();

      const matchingComboIds: string[] = [];
      for (const combo of allCombos) {
        if (comboMatchesSearch(combo as {
          comboItems?: Array<{
            productId?: {
              name?: string;
              tags?: string[];
              description?: string;
            } | string;
          }>;
        }, searchTerms, expandedTerms)) {
          const comboId = (combo as { _id?: string | { toString(): string } })._id;
          const id = typeof comboId === 'string' ? comboId : comboId?.toString() || '';
          if (id && !matchingComboIds.includes(id)) {
            matchingComboIds.push(id);
          }
        }
      }

      if (matchingComboIds.length > 0) {
        const existingOr = (query.$or as Array<Record<string, unknown>>) || [];
        query.$or = [
          ...existingOr,
          { _id: { $in: matchingComboIds.map(id => new mongoose.Types.ObjectId(id)) } }
        ];
      }
    }

    if (minPrice || maxPrice) {
      const priceQuery: { $gte?: number; $lte?: number } = {};
      if (minPrice) {
        priceQuery.$gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        priceQuery.$lte = parseFloat(maxPrice);
      }
      query.price = priceQuery;
    }

    if (material) {
      const materials = material.split(",").filter(Boolean);
      if (materials.length > 0) {
        const trimmedMaterials = materials.map((m) => m.trim());
        if (trimmedMaterials.length === 1) {
          query.material = { $regex: trimmedMaterials[0], $options: "i" };
        } else {
          const existingOr = (query.$or as unknown[]) || [];
          query.$or = [
            ...existingOr,
            ...trimmedMaterials.map((m) => ({ material: { $regex: m, $options: "i" } }))
          ];
        }
      }
    }

    if (fastShipping) {
      query.deliveryTimeInDays = { $lte: 3 };
    }

    let products = await Product.find(query)
      .populate("category", "name")
      .lean()
      .select("-reviews -ratingsSummary");

    if (colors && colors.length > 0) {
      products = products.filter((product) => {
        const productData = product as unknown as ProductWithStock & { hasColorOptions?: boolean; colors?: Map<string, unknown> | Record<string, unknown> };
        if (!productData.hasColorOptions) return false;
        const productColors = productData.colors instanceof Map
          ? Array.from(productData.colors.keys())
          : Object.keys(productData.colors || {});
        return colors.some((color: string) =>
          productColors.some((pc: string) => pc.toLowerCase() === color.toLowerCase())
        );
      });
    }

    if (onlyAvailable) {
      products = products.filter((product) => getTotalStock(product as unknown as ProductWithStock) > 0);
    }

    if (bulkOrders) {
      products = products.filter((product) => {
        const minQuantity = (product as { minQuantity?: number }).minQuantity;
        return minQuantity !== undefined && minQuantity > 1;
      });
    }

    switch (sortBy) {
      case "price-low-high":
        products.sort((a, b) => {
          const aPrice = (a as { price?: number }).price ?? 0;
          const bPrice = (b as { price?: number }).price ?? 0;
          return aPrice - bPrice;
        });
        break;
      case "price-high-low":
        products.sort((a, b) => {
          const aPrice = (a as { price?: number }).price ?? 0;
          const bPrice = (b as { price?: number }).price ?? 0;
          return bPrice - aPrice;
        });
        break;
      case "best-sellers":
        products.sort((a, b) => {
          const aCount = (a as { salesCount?: number }).salesCount || 0;
          const bCount = (b as { salesCount?: number }).salesCount || 0;
          return bCount - aCount;
        });
        break;
      case "new-arrivals":
        products.sort((a, b) => {
          const aCreated = (a as { createdAt?: string | Date }).createdAt;
          const bCreated = (b as { createdAt?: string | Date }).createdAt;
          const dateA = aCreated ? new Date(aCreated).getTime() : 0;
          const dateB = bCreated ? new Date(bCreated).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case "most-viewed":
        products.sort((a, b) => {
          const aCount = (a as { viewCount?: number }).viewCount || 0;
          const bCount = (b as { viewCount?: number }).viewCount || 0;
          return bCount - aCount;
        });
        break;
      case "most-wishlisted":
        products.sort((a, b) => {
          const aCount = (a as { wishlistCount?: number }).wishlistCount || 0;
          const bCount = (b as { wishlistCount?: number }).wishlistCount || 0;
          return bCount - aCount;
        });
        break;
      case "name-a-z":
        products.sort((a, b) => {
          const aName = String((a as { name?: string }).name || "");
          const bName = String((b as { name?: string }).name || "");
          return aName.localeCompare(bName);
        });
        break;
      case "name-z-a":
        products.sort((a, b) => {
          const aName = String((a as { name?: string }).name || "");
          const bName = String((b as { name?: string }).name || "");
          return bName.localeCompare(aName);
        });
        break;
      default:
        break;
    }

    const response: {
      products: unknown[];
      correctedQuery?: string;
      originalQuery?: string;
    } = { products };

    if (correctedSearchQuery && search) {
      response.correctedQuery = correctedSearchQuery;
      response.originalQuery = search;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: `Server error ${error}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await auth(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productData = await req.json();
    if (!productData?.category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(productData.category)) {
      return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
    }

    if (productData.subCategory === "" || productData.subCategory === null || productData.subCategory === undefined) {
      productData.subCategory = null;
    } else if (productData.subCategory && !mongoose.Types.ObjectId.isValid(productData.subCategory)) {
      return NextResponse.json({ error: "Invalid subcategory id" }, { status: 400 });
    } else if (productData.subCategory) {
      productData.subCategory = new mongoose.Types.ObjectId(productData.subCategory);
    }

    await connectDB();

    if (productData.type === "combo" && productData.comboItems?.length > 0) {
      if (!productData.tags || productData.tags.length === 0) {
        const comboProductIds = productData.comboItems.map((item: { productId: string }) => item.productId);
        const comboProducts = await Product.find({
          _id: { $in: comboProductIds },
        }).select("name");

        const tags = [
          productData.name,
          ...comboProducts.map((p: { name: string }) => p.name),
        ];
        productData.tags = tags;
      }
    }

    const product = await Product.create(productData);
    const populated = await Product.findById(product._id)
      .populate("category", "name slug")
      .populate({
        path: "comboItems.productId",
        model: Product,
        populate: {
          path: "category",
          select: "name slug",
        },
      });

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: `Server error ${error}` }, { status: 500 });
  }
}