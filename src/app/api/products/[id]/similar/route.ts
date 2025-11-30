import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/models/Product';
import connectDB from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    // Get the product to find its category
    const product = await Product.findById(id)
      .populate("category", "_id")
      .lean() as { category?: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId } | null; _id: mongoose.Types.ObjectId } | null;

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Handle category - could be ObjectId or populated object
    const category = product.category;

    const categoryId =
      category && typeof category === 'object' && '_id' in category
        ? (category as { _id: mongoose.Types.ObjectId })._id
        : (category as mongoose.Types.ObjectId | string | null | undefined);

    if (!categoryId) {
      // If product has no category, return empty array
      return NextResponse.json({ products: [] });
    }

    // Find products in the same category, excluding the current product
    const similarProducts = await Product.find({
      category: categoryId,
      _id: { $ne: new mongoose.Types.ObjectId(id) },
    })
      .populate("category", "name slug")
      .sort({
        "ratingsSummary.average": -1,
        salesCount: -1,
        createdAt: -1
      })
      .limit(8)
      .lean();

    return NextResponse.json({ products: similarProducts || [] });
  } catch (error) {
    console.error("Error fetching similar products:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}




