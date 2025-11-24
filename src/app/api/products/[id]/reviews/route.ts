import { NextResponse } from "next/server";
import Product from "@/models/Product";
import connectDB from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const product = await Product.findById(id).select(
      "reviews ratingsSummary"
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      reviews: product.reviews || [],
      ratingsSummary: product.ratingsSummary || { average: 0, count: 0 },
    });
  } catch (error) {
    console.error("Error fetching reviews", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rating, comment } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    await connectDB();
    const { id } = await params;
    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const existingReviewIndex = product.reviews.findIndex(
      (review: { user: string | { toString(): string } }) => review.user.toString() === user._id.toString()
    );

    if (existingReviewIndex >= 0) {
      product.reviews[existingReviewIndex] = {
        ...product.reviews[existingReviewIndex],
        rating,
        comment,
        name: user.name,
        createdAt: new Date(),
        user: user._id,
      };
    } else {
      product.reviews.push({
        user: user._id,
        name: user.name,
        rating,
        comment,
      });
    }

    if (typeof product.recalculateRatings === "function") {
      product.recalculateRatings();
    }

    await product.save();

    return NextResponse.json(
      {
        reviews: product.reviews,
        ratingsSummary: product.ratingsSummary,
      },
      { status: existingReviewIndex >= 0 ? 200 : 201 }
    );
  } catch (error) {
    console.error("Error saving review", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}

