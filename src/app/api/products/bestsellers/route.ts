import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Product from "@/models/Product";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const bestsellers = await Product.find({})
      .sort({ salesCount: -1, "ratingsSummary.average": -1 })
      .limit(limit)
      .populate("category", "name slug parent")
      .lean();

    return NextResponse.json({
      products: bestsellers,
    });
  } catch (error) {
    console.error("Error fetching bestsellers:", error);
    return NextResponse.json(
      { error: "Failed to fetch bestsellers" },
      { status: 500 }
    );
  }
}

