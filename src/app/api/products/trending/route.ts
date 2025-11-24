import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Product from "@/models/Product";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const days = parseInt(searchParams.get("days") || "7", 10);

    // Get date threshold for last N days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Calculate trending score based on recent activity
    // Weight: viewCount (0.4), wishlistCount (0.3), addToCartCount (0.3)
    const trendingProducts = await Product.aggregate([
      {
        $addFields: {
          trendingScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$viewCount", 0] }, 0.4] },
              { $multiply: [{ $ifNull: ["$wishlistCount", 0] }, 0.3] },
              { $multiply: [{ $ifNull: ["$addToCartCount", 0] }, 0.3] },
            ],
          },
        },
      },
      {
        $match: {
          updatedAt: { $gte: daysAgo },
        },
      },
      { $sort: { trendingScore: -1 } },
      { $limit: limit },
    ]);

    // Populate category for each product
    const productIds = trendingProducts.map((p: { _id: string | mongoose.Types.ObjectId }) => {
      const id = p._id;
      return typeof id === 'string' ? id : id.toString();
    });
    const populated = await Product.find({ _id: { $in: productIds } })
      .populate("category", "name slug parent")
      .lean();

    // Maintain order from aggregation
    const ordered = productIds.map((id: string) =>
      populated.find((p) => {
        const pId = (p._id as string | { toString(): string });
        const pIdStr = typeof pId === 'string' ? pId : pId.toString();
        return pIdStr === id;
      })
    );

    return NextResponse.json({
      products: ordered.filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching trending products:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending products" },
      { status: 500 }
    );
  }
}

