import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayInstance: Razorpay | null = null;

function getRazorpayInstance(): Razorpay {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials are missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables.');
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export interface RazorpayOrderOptions {
  amount: number; // Amount in paise (smallest currency unit)
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder(options: RazorpayOrderOptions) {
  try {
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: options.amount,
      currency: options.currency || 'INR',
      receipt: options.receipt,
      notes: options.notes || {},
    });
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const text = `${orderId}|${paymentId}`;
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(text)
    .digest('hex');

  return generatedSignature === signature;
}

// Helper to convert amount from rupees to paise
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

