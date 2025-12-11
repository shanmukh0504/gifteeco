import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { auth } from "@/lib/auth";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const userDoc = await User.findById(user._id).select("addresses");
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      addresses: userDoc.addresses || [],
    });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, address, city, state, pincode, isDefault } = body;

    if (!name || !phone || !address || !city || !state || !pincode) {
      return NextResponse.json(
        { error: "All address fields are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const userDoc = await User.findById(user._id);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If this is set as default, unset all other defaults
    if (isDefault) {
      userDoc.addresses.forEach((addr: { isDefault?: boolean }) => {
        addr.isDefault = false;
      });
    }

    // If this is the first address, make it default
    if (userDoc.addresses.length === 0) {
      userDoc.addresses.push({
        name,
        phone,
        address,
        city,
        state,
        pincode,
        isDefault: true,
      });
    } else {
      userDoc.addresses.push({
        name,
        phone,
        address,
        city,
        state,
        pincode,
        isDefault: isDefault || false,
      });
    }

    await userDoc.save();

    return NextResponse.json({
      message: "Address added successfully",
      addresses: userDoc.addresses,
    });
  } catch (error) {
    console.error("Error adding address:", error);
    return NextResponse.json(
      { error: "Failed to add address" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { addressId, name, phone, address, city, state, pincode, isDefault } = body;

    if (!addressId || !name || !phone || !address || !city || !state || !pincode) {
      return NextResponse.json(
        { error: "All address fields are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const userDoc = await User.findById(user._id);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const addressIndex = userDoc.addresses.findIndex(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (addr: any) => addr._id?.toString() === addressId
    );

    if (addressIndex === -1) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    // If this is set as default, unset all other defaults
    if (isDefault) {
      userDoc.addresses.forEach((addr: { isDefault?: boolean }) => {
        addr.isDefault = false;
      });
    }

    userDoc.addresses[addressIndex] = {
      name,
      phone,
      address,
      city,
      state,
      pincode,
      isDefault: isDefault || false,
    };

    await userDoc.save();

    return NextResponse.json({
      message: "Address updated successfully",
      addresses: userDoc.addresses,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const addressId = searchParams.get("addressId");

    if (!addressId) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const userDoc = await User.findById(user._id);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    userDoc.addresses = userDoc.addresses.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (addr: any) => addr._id?.toString() !== addressId
    );

    await userDoc.save();

    return NextResponse.json({
      message: "Address deleted successfully",
      addresses: userDoc.addresses,
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
}

