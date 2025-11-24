# Razorpay Payment Integration Setup

This guide will help you set up Razorpay payment integration for the Giftee Co e-commerce platform.

## Prerequisites

1. A Razorpay account (Sign up at https://razorpay.com/)
2. Access to Razorpay Dashboard

## Step 1: Get Razorpay API Keys

1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to **Settings** → **API Keys**
3. Generate a new API key pair (or use existing ones)
4. Copy your **Key ID** and **Key Secret**

## Step 2: Configure Environment Variables

Create a `.env.local` file in the root of your project (if it doesn't exist) and add the following:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here

# Public Razorpay Key (for client-side)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id_here
```

**Important Notes:**

- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are used on the server-side (API routes)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` is used on the client-side (checkout page)
- Never expose your `RAZORPAY_KEY_SECRET` in client-side code

## Step 3: Test Mode vs Production Mode

### Test Mode

- Use test API keys from Razorpay Dashboard
- Test payments using Razorpay's test cards (see below)
- No real money is charged

### Production Mode

- Use live API keys from Razorpay Dashboard
- Real payments will be processed
- Ensure you have completed KYC verification

## Step 4: Test Cards

For testing in test mode, use these test card numbers:

| Card Number         | CVV | Expiry          | Result  |
| ------------------- | --- | --------------- | ------- |
| 4111 1111 1111 1111 | Any | Any future date | Success |
| 5555 5555 5555 4444 | Any | Any future date | Success |
| 4000 0000 0000 0002 | Any | Any future date | Failure |

## Step 5: Payment Flow

1. **User clicks "Proceed to Payment"** on checkout page
2. **Order is created** in database with status "pending"
3. **Razorpay order is created** via `/api/payments/create-order`
4. **Razorpay checkout modal** opens for user to enter payment details
5. **Payment is processed** by Razorpay
6. **Payment is verified** via `/api/payments/verify` using signature verification
7. **Order status is updated** to "processing" and payment status to "completed"
8. **User is redirected** to success/failure page

## Step 6: Webhook Setup (Optional but Recommended)

For production, set up webhooks to handle payment status updates:

1. Go to Razorpay Dashboard → **Settings** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/payments/webhook`
3. Select events: `payment.captured`, `payment.failed`, `order.paid`
4. Create webhook handler at `src/app/api/payments/webhook/route.ts`

## API Routes

### POST `/api/payments/create-order`

Creates a Razorpay order and returns order details.

**Request Body:**

```json
{
  "amount": 1000.0,
  "receipt": "order_123",
  "notes": {
    "orderId": "internal_order_id",
    "userId": "user_id"
  }
}
```

**Response:**

```json
{
  "orderId": "order_razorpay_id",
  "amount": 100000,
  "currency": "INR",
  "key": "razorpay_key_id"
}
```

### POST `/api/payments/verify`

Verifies payment signature and updates order status.

**Request Body:**

```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_xxx",
  "orderId": "internal_order_id"
}
```

## Troubleshooting

### Payment Modal Not Opening

- Check if Razorpay script is loaded: `window.Razorpay` should exist
- Verify `NEXT_PUBLIC_RAZORPAY_KEY_ID` is set correctly
- Check browser console for errors

### Payment Verification Fails

- Ensure `RAZORPAY_KEY_SECRET` matches the key used to create the order
- Verify signature is being sent correctly from Razorpay
- Check server logs for detailed error messages

### Order Not Updating After Payment

- Verify database connection
- Check if order ID is being passed correctly
- Review API route logs for errors

## Security Best Practices

1. **Never expose** `RAZORPAY_KEY_SECRET` in client-side code
2. **Always verify** payment signatures on the server-side
3. **Use HTTPS** in production
4. **Validate** all payment data before processing
5. **Log** all payment transactions for audit purposes

## Support

For Razorpay-specific issues, refer to:

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Support](https://razorpay.com/support/)

For application-specific issues, check the application logs and error messages.
