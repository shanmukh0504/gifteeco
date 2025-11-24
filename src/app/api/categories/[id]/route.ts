import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
        }

        const category = await Category.findById(id);

        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        return NextResponse.json(category);
    } catch (error) {
        console.error("Error fetching category", error);
        return NextResponse.json(
            { error: "Failed to fetch category" },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await auth(req);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const name = body?.name?.trim();
        const subcategoryId = body?.subcategoryId; // For editing a subcategory
        const subcategoryName = body?.subcategoryName?.trim(); // New name for subcategory

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
        }

        await connectDB();

        const category = await Category.findById(id);
        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        // If editing a subcategory
        if (subcategoryId && subcategoryName) {
            const subcategory = category.subcategories.find(
                (sub) => sub._id?.toString() === subcategoryId
            );
            if (!subcategory) {
                return NextResponse.json(
                    { error: "Subcategory not found" },
                    { status: 404 }
                );
            }

            const subSlug = generateSlug(subcategoryName);

            // Check if another subcategory with same name/slug exists
            const duplicate = category.subcategories.find(
                (sub) =>
                    sub._id?.toString() !== subcategoryId &&
                    (sub.name === subcategoryName || sub.slug === subSlug)
            );

            if (duplicate) {
                return NextResponse.json(
                    { error: "Subcategory with this name already exists" },
                    { status: 400 }
                );
            }

            subcategory.name = subcategoryName;
            subcategory.slug = subSlug;
            await category.save();
            return NextResponse.json(category);
        }

        // Editing main category name
        if (!name) {
            return NextResponse.json(
                { error: "Category name is required" },
                { status: 400 }
            );
        }

        const slug = generateSlug(name);

        // Check for duplicate slug
        const existing = await Category.findOne({ slug, _id: { $ne: id } });
        if (existing) {
            return NextResponse.json(
                { error: "Category with this name already exists" },
                { status: 400 }
            );
        }

        category.name = name;
        category.slug = slug;
        await category.save();

        return NextResponse.json(category);
    } catch (error) {
        console.error("Error updating category", error);
        return NextResponse.json(
            { error: "Failed to update category" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await auth(req);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
        }

        await connectDB();

        const category = await Category.findById(id);
        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        const subcategoryId = new URL(req.url).searchParams.get("subcategoryId");

        // If deleting a subcategory
        if (subcategoryId) {
            // Check if any products use this subcategory
            const productsCount = await Product.countDocuments({
                category: id,
                subCategory: subcategoryId
            });

            if (productsCount > 0) {
                return NextResponse.json(
                    { error: `Cannot delete subcategory: ${productsCount} product(s) are using it. Please reassign products first.` },
                    { status: 400 }
                );
            }

            category.subcategories = category.subcategories.filter(
                (sub) => sub._id?.toString() !== subcategoryId
            );
            await category.save();
            return NextResponse.json({ message: "Subcategory deleted successfully" });
        }

        // Deleting main category
        // Check if category has subcategories
        if (category.subcategories && category.subcategories.length > 0) {
            return NextResponse.json(
                { error: "Cannot delete category: it has subcategories. Please delete subcategories first." },
                { status: 400 }
            );
        }

        // Check if any products use this category
        const productsCount = await Product.countDocuments({ category: id });
        if (productsCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete category: ${productsCount} product(s) are using it. Please reassign products first.` },
                { status: 400 }
            );
        }

        await Category.findByIdAndDelete(id);

        return NextResponse.json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category", error);
        return NextResponse.json(
            { error: "Failed to delete category" },
            { status: 500 }
        );
    }
}

