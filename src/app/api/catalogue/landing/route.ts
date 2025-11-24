import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category";

async function productsByCategoryName(slug: string, limit = 8) {
    const category = await Category.findOne({ slug }).select("_id").lean();
    if (!category) {
        return [];
    }

    return Product.find({ category: category._id })
        .populate("category", "name slug")
        .lean()
        .then((docs) => {
            const sorted = [...docs].sort(
                (a, b) => {
                    const aRating = (a as { ratingsSummary?: { average?: number } }).ratingsSummary?.average ?? 0;
                    const bRating = (b as { ratingsSummary?: { average?: number } }).ratingsSummary?.average ?? 0;
                    return bRating - aRating;
                }
            );
            return sorted.slice(0, limit);
        })
        .catch(() => []);
}

export async function GET() {
    try {
        await connectDB();

        const all = await Product.find({})
            .sort({ createdAt: -1 })
            .limit(12)
            .populate("category", "name slug")
            .lean();

        const featured = await Product.find({ isFeatured: true })
            .sort({ updatedAt: -1 })
            .limit(8)
            .populate("category", "name slug")
            .lean();

        // Apparel/Combos via category slug
        const apparel = await productsByCategoryName("apparel", 8);
        const combos = await productsByCategoryName("combos", 8);
        const welcomeKits = await productsByCategoryName("welcome-kits", 8);

        // Bestsellers: by salesCount
        const bestSellers = await Product.find({})
            .sort({ salesCount: -1, "ratingsSummary.average": -1 })
            .limit(8)
            .populate("category", "name slug")
            .lean();

        // Trending: weighted heuristic
        const trending = await Product.aggregate([
            {
                $addFields: {
                    trendingScore: {
                        $add: [
                            { $multiply: [{ $ifNull: ["$salesCount", 0] }, 0.5] },
                            { $multiply: [{ $ifNull: ["$wishlistCount", 0] }, 0.2] },
                            {
                                $multiply: [
                                    { $ifNull: ["$ratingsSummary.average", 0] },
                                    0.2,
                                ],
                            },
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            {
                                                $subtract: [new Date(), { $ifNull: ["$createdAt", new Date()] }],
                                            },
                                            1000 * 60 * 60 * 24 * 30,
                                        ],
                                    },
                                    -0.1,
                                ],
                            },
                        ],
                    },
                },
            },
            { $sort: { trendingScore: -1 } },
            { $limit: 8 },
        ]);

        // Populate categories for aggregate docs
        const trendingIds = trending.map((p: { _id: string }) => p._id);
        const trendingPopulated = await Product.find({ _id: { $in: trendingIds } })
            .populate("category", "name slug")
            .lean();

        return NextResponse.json({
            tabs: {
                all: all || [],
                trending: trendingPopulated || [],
                apparel: apparel || [],
                featured: featured || [],
                combos: combos || [],
            },
            sections: {
                bestSellers: bestSellers || [],
                welcomeKits: welcomeKits || [],
            },
        });
    } catch (err) {
        console.error("Error in landing route:", err);
        // Return empty structure on error instead of error object
        return NextResponse.json({
            tabs: {
                all: [],
                trending: [],
                apparel: [],
                featured: [],
                combos: [],
            },
            sections: {
                bestSellers: [],
                welcomeKits: [],
            },
        }, { status: 500 });
    }
}


