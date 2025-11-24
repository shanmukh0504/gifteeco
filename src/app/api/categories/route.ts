import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Category from "@/models/Category";
import { auth } from "@/lib/auth";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    const query: Record<string, unknown> = {};

    if (categoryId) {
      // Return a specific category with its subcategories
      const category = await Category.findById(categoryId);
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      return NextResponse.json(category);
    }

    // Return all categories with their nested subcategories
    const categories = await Category.find(query)
      .sort({ name: 1 });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await auth(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = body?.name?.trim();
    const categoryId = body?.categoryId; // For adding subcategory to existing category
    const subcategories = body?.subcategories || []; // Array of subcategory names

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // If adding subcategory to existing category
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }

      const subName = name.trim();
      const subSlug = generateSlug(subName);

      // Check if subcategory already exists
      const existingSub = category.subcategories.find(
        (sub: { name: string; slug: string }) => sub.name === subName || sub.slug === subSlug
      );

      if (existingSub) {
        return NextResponse.json(
          { error: "Subcategory already exists" },
          { status: 400 }
        );
      }

      // Add subcategory
      category.subcategories.push({
        name: subName,
        slug: subSlug,
      });

      await category.save();
      return NextResponse.json(category, { status: 201 });
    }

    // Creating a new main category - require at least one subcategory
    if (!subcategories || subcategories.length === 0) {
      return NextResponse.json(
        { error: "Main categories must have at least one subcategory" },
        { status: 400 }
      );
    }

    const slug = generateSlug(name);

    // Check if category already exists
    const existing = await Category.findOne({ slug });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    // Create subcategories array
    const subcategoriesArray = subcategories
      .filter((subName: string) => subName.trim())
      .map((subName: string) => ({
        name: subName.trim(),
        slug: generateSlug(subName.trim()),
      }));

    const category = await Category.create({
      name,
      slug,
      subcategories: subcategoriesArray,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

