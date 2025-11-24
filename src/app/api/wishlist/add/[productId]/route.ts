import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { auth } from "@/lib/auth";
import User from "@/models/User";
import Product from "@/models/Product";
import mongoose from "mongoose";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await params;

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

    // Add to user's wishlist if not already present
    const userDoc = await User.findById(user._id);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!userDoc.wishlist.includes(new mongoose.Types.ObjectId(productId))) {
      userDoc.wishlist.push(new mongoose.Types.ObjectId(productId));
      await userDoc.save();

      // Increment product wishlistCount
      product.wishlistCount = (product.wishlistCount || 0) + 1;
      await product.save();
    }

    return NextResponse.json({
      message: "Product added to wishlist",
      wishlist: userDoc.wishlist,
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    return NextResponse.json(
      { error: "Failed to add to wishlist" },
      { status: 500 }
    );
  }
}

