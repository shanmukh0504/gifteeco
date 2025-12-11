import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { auth } from "@/lib/auth";
import User from "@/models/User";
import Product from "@/models/Product";
import mongoose from "mongoose";

// Type definitions for customization
type PrintLocationElement = {
  id?: string;
  type?: string;
  textValue?: string;
  imageData?: string;
  qrValue?: string;
  shapeType?: string;
  fillColor?: string;
  [key: string]: unknown;
};

type PrintLocation = {
  slot?: string;
  uploadedImage?: string;
  elements?: PrintLocationElement[];
  [key: string]: unknown;
};

type CustomizationObject = {
  printLocations?: PrintLocation[];
  elements?: Record<string, Record<string, unknown[]>>;
  printSize?: string;
  sketchedImage?: boolean;
  [key: string]: unknown;
};

type CartItem = {
  product: string | mongoose.Types.ObjectId | { toString(): string };
  quantity: number;
  size?: string;
  color?: string;
  customization?: CustomizationObject | null;
  [key: string]: unknown;
};

// Helper function to normalize customization for comparison
function normalizeCustomization(cust?: CustomizationObject | null): string {
  if (!cust) return "";
  
  try {
    const normalized: Record<string, unknown> = {};
    
    // Sort and normalize printLocations array
    if (cust.printLocations && Array.isArray(cust.printLocations)) {
      normalized.printLocations = [...cust.printLocations].map((loc: PrintLocation) => {
        // Normalize each printLocation
        const normalizedLoc: PrintLocation = { ...loc };
        
        // Sort elements within each printLocation by ID for consistency
        if (normalizedLoc.elements && Array.isArray(normalizedLoc.elements)) {
          normalizedLoc.elements = [...normalizedLoc.elements].sort((a: PrintLocationElement, b: PrintLocationElement) => {
            const idA = a?.id || "";
            const idB = b?.id || "";
            return idA.localeCompare(idB);
          });
        }
        
        return normalizedLoc;
      }).sort((a: PrintLocation, b: PrintLocation) => {
        // Sort by slot first
        const slotA = a?.slot || "";
        const slotB = b?.slot || "";
        if (slotA !== slotB) return slotA.localeCompare(slotB);
        
        // If slots are the same, compare by normalized stringified content
        return JSON.stringify(a).localeCompare(JSON.stringify(b));
      });
    }
    
    // Normalize elements (if present)
    if (cust.elements && typeof cust.elements === 'object') {
      normalized.elements = cust.elements;
    }
    
    // Include other properties (printSize, sketchedImage, etc.)
    Object.keys(cust).forEach(key => {
      if (key !== 'printLocations' && key !== 'elements') {
        normalized[key] = cust[key];
      }
    });
    
    return JSON.stringify(normalized);
  } catch {
    return JSON.stringify(cust);
  }
}

// Helper function to check if two customizations are the same
function areCustomizationsEqual(cust1?: CustomizationObject | null, cust2?: CustomizationObject | null): boolean {
  // Both undefined/null - same (no customization)
  if (!cust1 && !cust2) return true;

  // Check if both are effectively empty (no meaningful customization data)
  const hasContent1 = cust1 && (
    (cust1.printLocations && Array.isArray(cust1.printLocations) && cust1.printLocations.length > 0) ||
    (cust1.elements && typeof cust1.elements === 'object' && Object.keys(cust1.elements).length > 0)
  );
  const hasContent2 = cust2 && (
    (cust2.printLocations && Array.isArray(cust2.printLocations) && cust2.printLocations.length > 0) ||
    (cust2.elements && typeof cust2.elements === 'object' && Object.keys(cust2.elements).length > 0)
  );

  // Both empty - same (no customization)
  if (!hasContent1 && !hasContent2) return true;

  // One empty, one not - different
  if (!hasContent1 || !hasContent2) return false;

  // Both have content - compare normalized versions
  if (!cust1 || !cust2) return false;
  try {
    return normalizeCustomization(cust1) === normalizeCustomization(cust2);
  } catch {
    return false;
  }
}

// Helper function to generate cartItemId from customization (matches client-side logic)
function getCustomizationHash(customization?: CustomizationObject | null): string {
  if (!customization) return "no-customization";
  try {
    const normalized = normalizeCustomization(customization);
    if (!normalized) return "no-customization";
    
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `custom-${Math.abs(hash).toString(36)}`;
  } catch {
    return "no-customization";
  }
}

export async function GET(req: Request) {
  try {
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const userDoc = await User.findById(user._id).populate({
      path: "cart.product",
      model: Product,
      populate: {
        path: "category",
        select: "name slug",
      },
    });

    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      items: userDoc.cart || [],
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { productId, quantity, size, color, customization } = body;

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: "Invalid product ID or quantity" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const minQuantity = product.minQuantity || 1;
    if (quantity < minQuantity) {
      return NextResponse.json(
        { error: `Minimum quantity is ${minQuantity}` },
        { status: 400 }
      );
    }

    const userDoc = await User.findById(user._id);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if item already exists in cart (same product, size, color, AND customization)
    const existingIndex = userDoc.cart.findIndex(
      (item: CartItem) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color &&
        areCustomizationsEqual(item.customization, customization)
    );

    if (existingIndex >= 0) {
      // Update quantity
      const newQuantity = userDoc.cart[existingIndex].quantity + quantity;
      if (newQuantity < minQuantity) {
        return NextResponse.json(
          { error: `Minimum quantity is ${minQuantity}` },
          { status: 400 }
        );
      }
      userDoc.cart[existingIndex].quantity = newQuantity;
    } else {
      // Add new item
      userDoc.cart.push({
        product: new mongoose.Types.ObjectId(productId),
        quantity,
        size,
        color,
        customization: customization || null,
      });
    }

    await userDoc.save();

    // Increment addToCartCount
    product.addToCartCount = (product.addToCartCount || 0) + 1;
    await product.save();

    // Return updated cart
    const updatedUser = await User.findById(user._id).populate({
      path: "cart.product",
      model: Product,
      populate: {
        path: "category",
        select: "name slug",
      },
    });

    return NextResponse.json({
      message: "Added to cart",
      items: updatedUser?.cart || [],
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { productId, quantity, size, color, customization } = body;

    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { error: "Product ID and quantity are required" },
        { status: 400 }
      );
    }

    if (quantity < 0) {
      return NextResponse.json(
        { error: "Quantity cannot be negative" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify product exists and get minQuantity
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const minQuantity = product.minQuantity || 1;

    if (quantity > 0 && quantity < minQuantity) {
      return NextResponse.json(
        { error: `Minimum quantity is ${minQuantity}` },
        { status: 400 }
      );
    }

    const userDoc = await User.findById(user._id);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const index = userDoc.cart.findIndex(
      (item: CartItem) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color &&
        areCustomizationsEqual(item.customization, customization)
    );

    if (index === -1) {
      return NextResponse.json(
        { error: "Item not found in cart" },
        { status: 404 }
      );
    }

    if (quantity === 0) {
      userDoc.cart.splice(index, 1);
    } else {
      userDoc.cart[index].quantity = quantity;
    }

    await userDoc.save();

    // Return updated cart
    const updatedUser = await User.findById(user._id).populate({
      path: "cart.product",
      model: Product,
      populate: {
        path: "category",
        select: "name slug",
      },
    });

    return NextResponse.json({
      message: "Cart updated",
      items: updatedUser?.cart || [],
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { productId, oldSize, newSize, color, customization, cartItemId } = body;

    if (!productId || !oldSize || !newSize) {
      return NextResponse.json(
        { error: "Product ID, old size, and new size are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const userDoc = await User.findById(user._id);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the specific item to update - must match productId, oldSize, color, AND customization
    let itemIndex = -1;
    
    if (customization) {
      // Match by customization (most reliable)
      itemIndex = userDoc.cart.findIndex((item: CartItem) => {
        return (
          item.product.toString() === productId &&
          item.size === oldSize &&
          item.color === color &&
          areCustomizationsEqual(item.customization, customization)
        );
      });
    } else if (cartItemId) {
      // Match by cartItemId hash
      itemIndex = userDoc.cart.findIndex((item: CartItem) => {
        const itemHash = getCustomizationHash(item.customization);
        return (
          item.product.toString() === productId &&
          item.size === oldSize &&
          item.color === color &&
          itemHash === cartItemId
        );
      });
    } else {
      // For non-customized products without cartItemId, match by productId, size, and color only
      // Also ensure the item has no customization
      itemIndex = userDoc.cart.findIndex((item: CartItem) => {
        const hasNoCustomization = !item.customization || 
          (typeof item.customization === 'object' && Object.keys(item.customization).length === 0);
        return (
          item.product.toString() === productId &&
          item.size === oldSize &&
          item.color === color &&
          hasNoCustomization
        );
      });
    }

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: "Item not found in cart" },
        { status: 404 }
      );
    }

    // Check if there's already an item with the new size and same customization
    const existingItemIndex = userDoc.cart.findIndex((item: CartItem) => {
      const matchesBasic =
        item.product.toString() === productId &&
        item.size === newSize &&
        item.color === color;
      
      if (!matchesBasic) return false;
      
      if (customization) {
        return areCustomizationsEqual(item.customization, customization);
      } else if (cartItemId) {
        const itemHash = getCustomizationHash(item.customization);
        return itemHash === cartItemId;
      } else {
        // For non-customized products, check if item has no customization
        const hasNoCustomization = !item.customization || 
          (typeof item.customization === 'object' && Object.keys(item.customization).length === 0);
        return hasNoCustomization;
      }
    });

    if (existingItemIndex >= 0 && existingItemIndex !== itemIndex) {
      // Merge with existing item
      const existingItem = userDoc.cart[existingItemIndex];
      const itemToUpdate = userDoc.cart[itemIndex];
      existingItem.quantity += itemToUpdate.quantity;
      userDoc.cart.splice(itemIndex, 1);
    } else {
      // Update the size of the existing item
      userDoc.cart[itemIndex].size = newSize;
    }

    await userDoc.save();

    // Return updated cart
    const updatedUser = await User.findById(user._id).populate({
      path: "cart.product",
      model: Product,
      populate: {
        path: "category",
        select: "name slug",
      },
    });

    return NextResponse.json({
      message: "Size updated",
      items: updatedUser?.cart || [],
    });
  } catch (error) {
    console.error("Error updating size:", error);
    return NextResponse.json(
      { error: "Failed to update size" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const size = searchParams.get("size") || undefined;
    const color = searchParams.get("color") || undefined;
    const cartItemId = searchParams.get("cartItemId") || undefined;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const userDoc = await User.findById(user._id);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const initialLength = userDoc.cart.length;
    
    // Get customization from query params if provided (as JSON string)
    let customizationToMatch: CustomizationObject | undefined = undefined;
    const customizationParam = searchParams.get("customization");
    if (customizationParam) {
      try {
        customizationToMatch = JSON.parse(decodeURIComponent(customizationParam));
      } catch {
        // If parsing fails, ignore customization param
      }
    }
    
    // Match items to delete - must match productId, size, color, AND customization/cartItemId
    // IMPORTANT: We MUST have either customization or cartItemId to avoid deleting multiple items
    if (!customizationToMatch && !cartItemId) {
      // Without customization or cartItemId, we cannot safely delete a single item
      // Return error to prevent accidental deletion of multiple items
      return NextResponse.json({
        error: "Cannot delete item: customization or cartItemId required to identify specific item",
        itemsDeleted: 0,
        items: userDoc.cart,
      }, { status: 400 });
    }
    
    // First, find all items that match the basic criteria
    const matchingItems = userDoc.cart.filter((item: CartItem) => {
      return (
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
      );
    });
    
    // Count how many items would match the full criteria (with customization)
    let exactMatches = 0;
    if (customizationToMatch) {
      exactMatches = matchingItems.filter((item: CartItem) => 
        areCustomizationsEqual(item.customization, customizationToMatch)
      ).length;
    } else if (cartItemId) {
      exactMatches = matchingItems.filter((item: CartItem) => {
        const itemHash = getCustomizationHash(item.customization);
        return itemHash === cartItemId;
      }).length;
    }
    
    // Safety check: if multiple items would match, or zero items match, don't delete
    if (exactMatches !== 1) {
      return NextResponse.json({
        error: exactMatches === 0 
          ? "Item not found in cart with matching criteria"
          : `Multiple items (${exactMatches}) match the criteria. Cannot safely delete.`,
        itemsDeleted: 0,
        matchingItemsCount: exactMatches,
        items: userDoc.cart,
      }, { status: 400 });
    }
    
    // Now filter - only delete the item that matches ALL criteria exactly
    userDoc.cart = userDoc.cart.filter((item: CartItem) => {
      // First check basic criteria
      const matchesBasic = 
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color;
      
      if (!matchesBasic) {
        // Keep items that don't match basic criteria
        return true;
      }
      
      // If we have customization to match, it MUST match exactly
      if (customizationToMatch) {
        const customizationsMatch = areCustomizationsEqual(
          item.customization, 
          customizationToMatch
        );
        // Only delete if customizations match exactly
        return !customizationsMatch;
      }
      
      // If we have cartItemId (but no customization), try matching by hash
      if (cartItemId) {
        const itemHash = getCustomizationHash(item.customization);
        // Only delete if hash matches exactly
        return itemHash !== cartItemId;
      }
      
      // This should never be reached due to the check above
      return true; // Keep the item
    });

    const itemsDeleted = initialLength - userDoc.cart.length;
    
    if (itemsDeleted === 0) {
      // No items were deleted - this might mean the item wasn't found
      // Return the current cart so client can verify
      return NextResponse.json({
        message: "Item not found in cart or matching criteria too broad",
        itemsDeleted: 0,
        items: userDoc.cart,
      });
    }

    await userDoc.save();

    // Return updated cart
    const updatedUser = await User.findById(user._id).populate({
      path: "cart.product",
      model: Product,
      populate: {
        path: "category",
        select: "name slug",
      },
    });

    return NextResponse.json({
      message: "Item removed from cart",
      itemsDeleted: itemsDeleted,
      items: updatedUser?.cart || [],
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    return NextResponse.json(
      { error: "Failed to remove from cart" },
      { status: 500 }
    );
  }
}
