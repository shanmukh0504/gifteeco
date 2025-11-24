import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';

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
      if (item.quantity < minQuantity) {
        return NextResponse.json(
          { error: `Product "${product.name}" requires minimum ${minQuantity} units. You ordered ${item.quantity} units.` },
          { status: 400 }
        );
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
      ...orderData,
      items: processedItems,
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