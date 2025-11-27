import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Product from "@/models/Product";
import {
  buildSearchTerms,
  buildMongoSearchQuery,
  comboMatchesSearch,
} from "@/utils/search";

/**
 * Search Suggestions API
 * Returns quick suggestions for autocomplete/search bar
 * Supports autocorrect and fuzzy matching with advanced search
 */

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "8", 10);

    if (!query || query.length < 2) {
      return NextResponse.json({
        suggestions: [],
        autocorrect: null,
        popular: []
      });
    }

    // Get all product names and tags for spelling correction
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

    // Build search terms with corrections
    const { correctedQuery, searchTerms, expandedTerms } = buildSearchTerms(query, uniqueWords);

    // Build MongoDB query with all variations
    const orConditions = buildMongoSearchQuery(query, correctedQuery, searchTerms, expandedTerms);

    // Find matching products (including images for suggestions)
    const matchingProducts = await Product.find({
      $or: orConditions
    })
      .select("name price category type tags comboItems hasColorOptions colors noColor")
      .populate("category", "name slug")
      .limit(50) // Get more to filter
      .lean();

    // Also search in comboItems for Welcome Kits
    const comboProducts = await Product.find({
      type: "combo",
      comboItems: { $exists: true, $ne: [] }
    })
      .populate({
        path: "comboItems.productId",
        model: Product,
        select: "name tags description"
      })
      .select("name price category type comboItems hasColorOptions colors noColor")
      .populate("category", "name slug")
      .limit(50)
      .lean();

    // Filter combo products that match search in their items
    const matchingCombos: Array<Record<string, unknown>> = [];
    for (const combo of comboProducts) {
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
        const comboIdStr = typeof comboId === 'string' ? comboId : comboId?.toString() || '';
        if (!matchingCombos.find(c => {
          const cId = (c as { _id?: string | { toString(): string } })._id;
          const cIdStr = typeof cId === 'string' ? cId : cId?.toString() || '';
          return cIdStr === comboIdStr;
        })) {
          matchingCombos.push(combo as Record<string, unknown>);
        }
      }
    }

    // Combine and deduplicate
    const allMatching = [...matchingProducts, ...matchingCombos];
    const uniqueProducts = new Map<string, Record<string, unknown>>();

    for (const product of allMatching) {
      const productId = (product as { _id?: string | { toString(): string } })._id;
      const id = typeof productId === 'string' ? productId : productId?.toString() || '';
      if (id && !uniqueProducts.has(id)) {
        uniqueProducts.set(id, product as Record<string, unknown>);
      }
    }

    // Format suggestions with proper image handling
    const suggestions = Array.from(uniqueProducts.values())
      .slice(0, limit)
      .map((p: Record<string, unknown>) => {
        let image: string | undefined;

        const hasColorOptions = p.hasColorOptions as boolean | undefined;
        const colors = p.colors as Record<string, { images?: string[] }> | undefined;
        const noColor = p.noColor as { images?: string[] } | undefined;

        if (hasColorOptions && colors) {
          const colorMap = colors instanceof Map ? colors : new Map(Object.entries(colors || {}));
          const firstColor = Array.from(colorMap.values())[0];
          image = firstColor?.images?.[0];
        } else if (noColor?.images && Array.isArray(noColor.images) && noColor.images.length > 0) {
          image = noColor.images[0];
        }

        const productId = (p._id as string | { toString(): string }) || '';
        const id = typeof productId === 'string' ? productId : productId.toString();
        const category = p.category as { name?: string } | undefined;

        return {
          id,
          name: p.name as string,
          category: category?.name || "",
          price: p.price as number,
          type: (p.type as string) || "single",
          image,
        };
      });

    // Return correction if different from original
    const correction = correctedQuery !== query ? correctedQuery : null;

    return NextResponse.json({
      suggestions,
      autocorrect: correction,
      correctedQuery: correction,
      count: suggestions.length,
    });
  } catch (error) {
    console.error("Error getting search suggestions:", error);
    return NextResponse.json(
      { error: "Failed to get suggestions", suggestions: [] },
      { status: 500 }
    );
  }
}

