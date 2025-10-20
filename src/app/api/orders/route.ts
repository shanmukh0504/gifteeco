import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req: Request) {
  try {
    await connectDB();
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product')
      .sort({ createdAt: -1 });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const orderData = await req.json();

    if (!orderData.user) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!orderData.items || orderData.items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    if (!orderData.totalAmount) {
      return NextResponse.json(
        { error: 'Total amount is required' },
        { status: 400 }
      );
    }

    const order = await Order.create(orderData);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);

    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Invalid order data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}