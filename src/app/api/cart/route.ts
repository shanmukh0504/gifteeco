import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { auth } from "@/lib/auth";
import User from "@/models/User";
import Product from "@/models/Product";
import mongoose from "mongoose";

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

    // Check if item already exists in cart (same product, size, color)
    const existingIndex = userDoc.cart.findIndex(
      (item: { product: string | { toString(): string }; size?: string; color?: string }) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
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
    const { productId, quantity, size, color } = body;

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
      (item: { product: string | { toString(): string }; size?: string; color?: string }) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
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
    userDoc.cart = userDoc.cart.filter(
      (item: { product: string | { toString(): string }; size?: string; color?: string }) =>
        !(
          item.product.toString() === productId &&
          item.size === size &&
          item.color === color
        )
    );

    if (userDoc.cart.length === initialLength) {
      return NextResponse.json({
        message: "Item not found in cart (already removed)",
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
