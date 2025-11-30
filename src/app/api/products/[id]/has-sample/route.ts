import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        // Get the authorization header
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "No token provided" },
                { status: 401 }
            );
        }

        // Extract and verify the token
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        if (!decoded.userId) {
            return NextResponse.json(
                { error: "Invalid token" },
                { status: 401 }
            );
        }

        // Check if user has any order with this product where quantity is 1
        // This indicates a sample purchase
        const orders = await Order.find({
            user: decoded.userId,
            "items.product": id,
            "items.quantity": 1,
        })
            .populate("items.product")
            .sort({ createdAt: -1 });

        const hasSample = orders.length > 0;

        return NextResponse.json({ hasSample });
    } catch (error) {
        console.error("Error checking sample purchase:", error);
        return NextResponse.json(
            { error: "Failed to check sample purchase" },
            { status: 500 }
        );
    }
}

