import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET() {
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

    // Get user from token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    if (!decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const orderData = await req.json();
    const userId = decoded.userId;

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

    // Check if this is a sample purchase (single item with quantity 1)
    const isSamplePurchase = orderData.items.length === 1 && orderData.items[0].quantity === 1;

    // Process each item and handle combo products
    const processedItems = [];
    const productUpdates: Record<string, number> = {};

    for (const item of orderData.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.product} not found` },
          { status: 404 }
        );
      }

      // Validate minimum quantity
      const minQuantity = product.minQuantity || 1;

      // Special handling for sample purchases
      if (isSamplePurchase) {
        // For sample purchases, allow quantity 1 even if minQuantity is higher
        if (item.quantity !== 1) {
          return NextResponse.json(
            { error: 'Sample purchase must be exactly 1 unit' },
            { status: 400 }
          );
        }

        // Check if user has already bought a sample of this product
        const existingSampleOrder = await Order.findOne({
          user: userId,
          'items.product': item.product,
          'items.quantity': 1,
        });

        if (existingSampleOrder) {
          return NextResponse.json(
            { error: 'You have already purchased a sample of this product' },
            { status: 400 }
          );
        }

        // Don't allow sample purchase if minQuantity is 1
        if (minQuantity === 1) {
          return NextResponse.json(
            { error: 'Sample purchase is not available for this product' },
            { status: 400 }
          );
        }
      } else {
        // Regular purchase - enforce minimum quantity
        if (item.quantity < minQuantity) {
          return NextResponse.json(
            { error: `Product "${product.name}" requires minimum ${minQuantity} units. You ordered ${item.quantity} units.` },
            { status: 400 }
          );
        }
      }

      // Track salesCount for this product
      const productId = product._id.toString();
      productUpdates[productId] = (productUpdates[productId] || 0) + item.quantity;

      // If product is a combo, handle individual items
      if (product.type === 'combo' && product.comboItems) {
        for (const comboItem of product.comboItems) {
          const comboProductId = comboItem.productId.toString();
          const totalQuantity = item.quantity * comboItem.quantity;

          // Deduct stock from combo item
          const comboProduct = await Product.findById(comboProductId);
          if (comboProduct) {
            if (comboProduct.hasColorOptions && item.color) {
              const colorData = comboProduct.colors.get(item.color);
              if (colorData && colorData.stock !== undefined) {
                colorData.stock = Math.max(0, colorData.stock - totalQuantity);
                comboProduct.colors.set(item.color, colorData);
              }
            } else if (comboProduct.noColor) {
              comboProduct.noColor.stock = Math.max(
                0,
                (comboProduct.noColor.stock || 0) - totalQuantity
              );
            }
            await comboProduct.save();
          }

          // Track salesCount for combo items (optional, for analytics)
          productUpdates[comboProductId] = (productUpdates[comboProductId] || 0) + totalQuantity;
        }
      } else {
        // Handle single product stock deduction
        if (product.hasColorOptions && item.color) {
          const colorData = product.colors.get(item.color);
          if (colorData && colorData.stock !== undefined) {
            colorData.stock = Math.max(0, colorData.stock - item.quantity);
            product.colors.set(item.color, colorData);
          }
        } else if (product.noColor) {
          product.noColor.stock = Math.max(
            0,
            (product.noColor.stock || 0) - item.quantity
          );
        }
        await product.save();
      }

      processedItems.push(item);
    }

    // Update salesCount for all products
    for (const [productId, quantity] of Object.entries(productUpdates)) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { salesCount: quantity },
      });
    }

    const order = await Order.create({
      user: userId,
      items: processedItems,
      totalAmount: orderData.totalAmount,
      shippingInfo: orderData.shippingInfo,
      payment: orderData.payment,
    });

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