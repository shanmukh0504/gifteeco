import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Category from "@/models/Category";

export async function GET() {
    try {
        await connectDB();

        // Get all categories with their nested subcategories
        const categories = await Category.find({})
            .sort({ name: 1 })
            .lean();

        // Filter to only include categories with at least one subcategory
        const hierarchy = categories
            .filter((cat) => cat.subcategories && cat.subcategories.length > 0)
            .map((cat) => {
                const catData = cat as unknown as { _id: string; name: string; slug: string; subcategories: Array<{ _id: string; name: string; slug: string }> };
                return {
                    _id: String(catData._id),
                    name: String(catData.name),
                    slug: String(catData.slug),
                    subcategories: catData.subcategories.map((sub) => ({
                        _id: String(sub._id),
                        name: String(sub.name),
                        slug: String(sub.slug),
                    })),
                };
            });

        return NextResponse.json(hierarchy);
    } catch (error) {
        console.error("Error fetching category hierarchy", error);
        return NextResponse.json(
            { error: "Failed to fetch category hierarchy" },
            { status: 500 }
        );
    }
}

