import { NextResponse } from 'next/server';
import { verifyPaymentSignature } from '@/lib/razorpay';
import connectDB from '@/lib/db';
import Order from '@/models/Order';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      orderId, // Our internal order ID
    } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Missing payment details' },
        { status: 400 }
      );
    }

    // Verify payment signature
    const isValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Update order with payment details
    if (orderId) {
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          'payment.razorpayOrderId': razorpayOrderId,
          'payment.razorpayPaymentId': razorpayPaymentId,
          'payment.razorpaySignature': razorpaySignature,
          'payment.status': 'completed',
          status: 'processing',
        },
        { new: true }
      );

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        order,
        message: 'Payment verified successfully',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

