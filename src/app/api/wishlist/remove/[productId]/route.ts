import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { auth } from "@/lib/auth";
import User from "@/models/User";
import Product from "@/models/Product";
import mongoose from "mongoose";

export async function DELETE(
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

    const userDoc = await User.findById(user._id);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const productObjectId = new mongoose.Types.ObjectId(productId);
    const index = userDoc.wishlist.findIndex(
      (id: mongoose.Types.ObjectId) => id.toString() === productObjectId.toString()
    );

    if (index === -1) {
      // Product not in wishlist - return success since the desired state is already achieved
      return NextResponse.json({
        message: "Product not in wishlist (already removed)",
        wishlist: userDoc.wishlist,
      });
    }

    userDoc.wishlist.splice(index, 1);
    await userDoc.save();

    // Decrement product wishlistCount (don't go below 0)
    const product = await Product.findById(productId);
    if (product) {
      product.wishlistCount = Math.max(0, (product.wishlistCount || 0) - 1);
      await product.save();
    }

    return NextResponse.json({
      message: "Product removed from wishlist",
      wishlist: userDoc.wishlist,
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    return NextResponse.json(
      { error: "Failed to remove from wishlist" },
      { status: 500 }
    );
  }
}

