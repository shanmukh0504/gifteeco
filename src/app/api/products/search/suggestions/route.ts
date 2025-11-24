import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Product from "@/models/Product";

/**
 * Search Suggestions API
 * Returns quick suggestions for autocomplete/search bar
 * Supports autocorrect and fuzzy matching
 */

// Simple autocorrect - find similar words
function autocorrect(query: string, words: string[]): string | null {
  if (query.length < 3) return null;
  
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (words.some(w => w.toLowerCase() === queryLower)) {
    return null; // No correction needed
  }
  
  // Levenshtein distance-based suggestions
  let bestMatch: { word: string; distance: number } | null = null;
  
  for (const word of words) {
    const distance = levenshteinDistance(queryLower, word.toLowerCase());
    const maxDistance = Math.max(2, Math.floor(word.length / 3));
    
    if (distance <= maxDistance) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { word, distance };
      }
    }
  }
  
  return bestMatch && bestMatch.distance <= 3 ? bestMatch.word : null;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

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

    const searchRegex = new RegExp(query, "i");

    // Find matching products (including images for suggestions)
    const matchingProducts = await Product.find({
      $or: [
        { name: searchRegex },
        { tags: { $regex: query, $options: "i" } },
        { description: searchRegex },
      ]
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
        select: "name tags"
      })
      .select("name price category type comboItems hasColorOptions colors noColor")
      .populate("category", "name slug")
      .limit(50)
      .lean();

    // Filter combo products that match search in their items
    const matchingCombos: Array<Record<string, unknown>> = [];
    for (const combo of comboProducts) {
      if (combo.comboItems && Array.isArray(combo.comboItems)) {
        for (const item of combo.comboItems) {
          const comboItem = item.productId;
          if (comboItem) {
            const productName = typeof comboItem === "object" 
              ? (comboItem as { name?: string }).name || ""
              : "";
            const productTags = typeof comboItem === "object" 
              ? ((comboItem as { tags?: string[] }).tags || [])
              : [];
            
            const matches = 
              searchRegex.test(productName) ||
              productTags.some((tag: string) => searchRegex.test(tag));
            
            if (matches) {
              const comboId = (combo as { _id?: string | { toString(): string } })._id;
              const comboIdStr = typeof comboId === 'string' ? comboId : comboId?.toString() || '';
              if (!matchingCombos.find(c => {
                const cId = (c as { _id?: string | { toString(): string } })._id;
                const cIdStr = typeof cId === 'string' ? cId : cId?.toString() || '';
                return cIdStr === comboIdStr;
              })) {
                matchingCombos.push(combo as Record<string, unknown>);
                break;
              }
            }
          }
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

    // Get popular/category suggestions for autocorrect context
    const allProductNames = await Product.find({})
      .select("name")
      .limit(1000)
      .lean();
    
    const productWords: string[] = [];
    for (const product of allProductNames) {
      const words = (product.name as string).split(/\s+/);
      productWords.push(...words);
    }
    
    const uniqueWords = Array.from(new Set(productWords));
    const correction = autocorrect(query, uniqueWords);

    return NextResponse.json({
      suggestions,
      autocorrect: correction && correction.toLowerCase() !== query.toLowerCase() ? correction : null,
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

