import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/models/Product';
import connectDB from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const product = await Product.findById(id)
      .populate("category", "name slug")
      .populate({
        path: "comboItems.productId",
        model: Product,
        populate: {
          path: "category",
          select: "name slug",
        },
      })
      .lean(); // Use lean() for faster queries

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Increment viewCount asynchronously (non-blocking)
    Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).catch((err) => {
      console.error("Error incrementing viewCount:", err);
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    if (!body?.category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(body.category)) {
      return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
    }

    // Handle subCategory: convert empty string to null, validate ObjectId if provided
    if (body.subCategory === "" || body.subCategory === null || body.subCategory === undefined) {
      body.subCategory = null;
    } else if (body.subCategory && !mongoose.Types.ObjectId.isValid(body.subCategory)) {
      return NextResponse.json({ error: "Invalid subcategory id" }, { status: 400 });
    } else if (body.subCategory) {
      body.subCategory = new mongoose.Types.ObjectId(body.subCategory);
    }

    // Ensure material and deliveryTimeInDays are explicitly set (even if null)
    // This ensures they are updated in the database
    if (body.material === undefined) {
      // If not provided, don't change it
      delete body.material;
    } else {
      // If provided (including null), ensure it's set
      body.material = body.material === "" ? null : body.material;
    }

    if (body.deliveryTimeInDays === undefined) {
      // If not provided, don't change it
      delete body.deliveryTimeInDays;
    } else {
      // If provided (including null), ensure it's set
      body.deliveryTimeInDays = body.deliveryTimeInDays === "" ? null : body.deliveryTimeInDays;
    }

    const product = await Product.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    ).populate("category", "name");

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}