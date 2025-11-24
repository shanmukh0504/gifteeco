import { NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/lib/razorpay';
import connectDB from '@/lib/db';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { amount, receipt, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Create Razorpay order
    // Amount should be in paise (smallest currency unit)
    // If amount is in rupees, multiply by 100
    const amountInPaise = amount < 1000 ? Math.round(amount * 100) : Math.round(amount);
    
    const razorpayOrder = await createRazorpayOrder({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    });

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}

