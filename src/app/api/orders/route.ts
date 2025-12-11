import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import jwt from 'jsonwebtoken';
import ImageKit from 'imagekit';
import { createCanvas, loadImage } from 'canvas';
import QRCode from 'qrcode';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY || '',
  privateKey: process.env.PRIVATE_KEY || '',
  urlEndpoint: process.env.NEXT_PUBLIC_URL_ENDPOINT || '',
});

// Helper function to upload data URL to ImageKit
async function uploadDataUrlToImageKit(dataUrl: string, fileName: string): Promise<string> {
  try {
    // Convert data URL to base64
    const base64Data = dataUrl.split(',')[1] || dataUrl;
    
    const uploadResponse = await imagekit.upload({
      file: base64Data,
      fileName: fileName,
      folder: '/orders',
    });
    
    return uploadResponse.url;
  } catch (error) {
    console.error('Error uploading to ImageKit:', error);
    throw error;
  }
}

// Helper function to generate QR code as data URL
async function generateQRCodeDataUrl(qrValue: string, size: number): Promise<string> {
  try {
    return await QRCode.toDataURL(qrValue, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

// Helper function to load image from URL (handles both data URLs and regular URLs)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadImageFromUrl(url: string): Promise<any> {
  try {
    if (url.startsWith('data:')) {
      // For data URLs, convert to buffer
      const base64Data = url.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      return await loadImage(buffer);
    } else {
      // For regular URLs, fetch and load
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return await loadImage(buffer);
    }
  } catch (error) {
    console.error('Error loading image:', error);
    throw error;
  }
}

// Helper function to generate mockup image for a specific slot
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateMockupImageForSlot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product: any,
  color: string | null,
  slot: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  location: any
): Promise<string | null> {
  try {
    if (!location || !slot) {
      return null;
    }

    // Check if this location has any customization
    const hasCustomization = location.uploadedImage || (location.elements && location.elements.length > 0);
    if (!hasCustomization) {
      return null;
    }

    // Get mockup images from product
    const mockupImages: Record<string, string | undefined> = {
      front: undefined,
      back: undefined,
      chest: undefined,
    };

    if (product.hasColorOptions && color) {
      const colorData = product.colors.get(color);
      if (colorData?.customization) {
        mockupImages.front = colorData.customization.front?.mockupImage;
        mockupImages.back = colorData.customization.back?.mockupImage;
        mockupImages.chest = colorData.customization.chest?.mockupImage;
      }
    } else if (product.noColor?.customization) {
      mockupImages.front = product.noColor.customization.front?.mockupImage;
      mockupImages.back = product.noColor.customization.back?.mockupImage;
      mockupImages.chest = product.noColor.customization.chest?.mockupImage;
    }

    const mockupUrl = mockupImages[slot];
    if (!mockupUrl) {
      console.warn(`No mockup image found for slot ${slot}`);
      return null;
    }

    // Load mockup image
    const mockupImg = await loadImageFromUrl(mockupUrl);

    // Create canvas (square like product detail page)
    const canvasSize = 800; // Higher resolution for final mockup
    const canvas = createCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext('2d');

    // Draw mockup image with object-cover behavior
    const imgWidth = mockupImg.width;
    const imgHeight = mockupImg.height;
    const imgAspectRatio = imgWidth / imgHeight;
    const canvasAspectRatio = 1; // Square canvas

    let sx = 0, sy = 0, sWidth = imgWidth, sHeight = imgHeight;
    const dx = 0, dy = 0, dWidth = canvasSize, dHeight = canvasSize;

    if (imgAspectRatio > canvasAspectRatio) {
      sWidth = imgHeight * canvasAspectRatio;
      sx = (imgWidth - sWidth) / 2;
    } else {
      sHeight = imgWidth / canvasAspectRatio;
      sy = (imgHeight - sHeight) / 2;
    }

    ctx.drawImage(mockupImg, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

    // Get bounding box for this slot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getBoundingBox = (slotName: string): any => {
      if (product.customDefaults?.[slotName]) {
        return product.customDefaults[slotName];
      }
      // Default bounding boxes (relative to square container 0-1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const defaults: Record<string, any> = {
        front: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
        back: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
        chest: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
      };
      return defaults[slotName] || defaults.front;
    };

    // Calculate bounding box coordinates for this slot
    const box = getBoundingBox(slot);
    const boxX = box.x * canvasSize;
    const boxY = box.y * canvasSize;
    const boxWidth = box.width * canvasSize;
    const boxHeight = box.height * canvasSize;

    // Draw uploaded image if present
    if (location.uploadedImage) {
      try {
        const uploadedImg = await loadImageFromUrl(location.uploadedImage);
        ctx.drawImage(uploadedImg, boxX, boxY, boxWidth, boxHeight);
      } catch (error) {
        console.error('Error drawing uploaded image:', error);
      }
    }

    // Draw elements for this slot only
    if (location.elements && Array.isArray(location.elements)) {
      // Sort by zIndex
      const sortedElements = [...location.elements].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );

      for (const element of sortedElements) {
        const x = boxX + (element.x / 100) * boxWidth;
        const y = boxY + (element.y / 100) * boxHeight;
        const width = (element.width / 100) * boxWidth;
        const height = (element.height / 100) * boxHeight;
        const rotation = element.rotation || 0;

        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-(x + width / 2), -(y + height / 2));

        if (element.type === 'text' && element.textValue) {
          ctx.fillStyle = element.textColor || '#000000';
          const fontSize = (element.fontSize || 24) * (canvasSize / 640); // Scale from 640px base
          ctx.font = `${fontSize}px ${element.fontFamily || 'Arial'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(element.textValue, x + width / 2, y + height / 2);
        } else if (element.type === 'logo' && element.imageData) {
          try {
            const logoImg = await loadImageFromUrl(element.imageData);
            ctx.drawImage(logoImg, x, y, width, height);
          } catch (error) {
            console.error('Error drawing logo:', error);
          }
        } else if (element.type === 'qrcode' && element.qrValue) {
          try {
            const qrDataUrl = await generateQRCodeDataUrl(element.qrValue, Math.max(width, 100));
            const qrImg = await loadImageFromUrl(qrDataUrl);
            ctx.drawImage(qrImg, x, y, width, height);
          } catch (error) {
            console.error('Error drawing QR code:', error);
          }
        } else if (element.type === 'shape') {
          ctx.fillStyle = element.shapeColor || '#000000';
          if (element.shapeType === 'circle') {
            ctx.beginPath();
            ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, 2 * Math.PI);
            ctx.fill();
          } else if (element.shapeType === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(x + width / 2, y);
            ctx.lineTo(x, y + height);
            ctx.lineTo(x + width, y + height);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(x, y, width, height);
          }
        }

        ctx.restore();
      }
    }

    // Convert canvas to data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error(`Error generating mockup image for slot ${slot}:`, error);
    return null;
  }
}

// Helper function to process customization and upload images
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processCustomization(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customization: any,
  orderId: string,
  itemIndex: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product: any,
  color: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (!customization) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processed: any = {
    printSize: customization.printSize || null,
    printLocations: [],
    elements: null, // Will be processed separately to convert data URLs
  };

  // Process printLocations
  if (customization.printLocations && Array.isArray(customization.printLocations)) {
    for (let i = 0; i < customization.printLocations.length; i++) {
      const location = customization.printLocations[i];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processedLocation: any = {
        slot: location.slot || null,
        uploadedImage: null,
        mockupImage: null,
        elements: [],
      };

      // Upload uploadedImage if it's a data URL
      if (location.uploadedImage) {
        if (location.uploadedImage.startsWith('data:')) {
          processedLocation.uploadedImage = await uploadDataUrlToImageKit(
            location.uploadedImage,
            `order-${orderId}-item-${itemIndex}-location-${i}-uploaded.png`
          );
        } else {
          // Already a URL, use as is
          processedLocation.uploadedImage = location.uploadedImage;
        }
      }

      // Process elements
      if (location.elements && Array.isArray(location.elements)) {
        for (const element of location.elements) {
          // Ensure type is always present and valid
          if (!element.type) {
            continue;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const processedElement: any = {
            type: element.type, // Required field
            // Text element fields
            textValue: element.textValue || null,
            fontFamily: element.fontFamily || null,
            fontSize: element.fontSize || null,
            textColor: element.textColor || null,
            // QR code element fields
            qrValue: element.qrValue || null, // QR code content/text
            // Shape element fields
            shapeType: element.shapeType || null,
            shapeColor: element.shapeColor || null,
            // Logo element fields
            imageData: null,
            // Position and size fields
            x: element.x || null,
            y: element.y || null,
            width: element.width || null,
            height: element.height || null,
            rotation: element.rotation || null,
            zIndex: element.zIndex || null,
          };

          // Upload imageData if it's a data URL (for logos)
          if (element.imageData) {
            if (element.imageData.startsWith('data:')) {
              processedElement.imageData = await uploadDataUrlToImageKit(
                element.imageData,
                `order-${orderId}-item-${itemIndex}-element-${element.id || Date.now()}.png`
              );
            } else {
              // Already a URL, use as is
              processedElement.imageData = element.imageData;
            }
          }

          processedLocation.elements.push(processedElement);
        }
      }

      // Generate and upload mockup image for this specific slot
      // Only generate if there's actual customization (uploaded image or elements)
      let mockupImageUrl: string | null = null;
      if (processedLocation.slot && (processedLocation.uploadedImage || processedLocation.elements.length > 0)) {
        try {
          // Create a copy of processedLocation to avoid modifying the original
          // The uploadedImage should already be an ImageKit URL at this point
          const locationForMockup = {
            ...processedLocation,
            // Ensure uploadedImage is the ImageKit URL (not a data URL)
            uploadedImage: processedLocation.uploadedImage?.startsWith('data:') 
              ? null // Skip if somehow still a data URL (shouldn't happen)
              : processedLocation.uploadedImage,
          };
          
          const mockupDataUrl = await generateMockupImageForSlot(
            product,
            color,
            processedLocation.slot,
            locationForMockup
          );
          if (mockupDataUrl) {
            mockupImageUrl = await uploadDataUrlToImageKit(
              mockupDataUrl,
              `order-${orderId}-item-${itemIndex}-slot-${processedLocation.slot}-mockup.png`
            );
            console.log(`✓ Mockup image uploaded for slot ${processedLocation.slot}:`, mockupImageUrl);
          } else {
            console.warn(`⚠ No mockup data URL generated for slot ${processedLocation.slot}`);
          }
        } catch (error) {
          console.error(`✗ Error generating/uploading mockup image for slot ${processedLocation.slot}:`, error);
          // Continue without mockup image if generation fails
        }
      } else {
        console.log(`⊘ Skipping mockup generation for slot ${processedLocation.slot} - no customization`);
      }

      // Create a new object with all properties explicitly set, including mockupImage
      const finalLocation = {
        slot: processedLocation.slot,
        uploadedImage: processedLocation.uploadedImage,
        mockupImage: mockupImageUrl, // Explicitly set mockupImage
        elements: processedLocation.elements,
      };

      console.log(`Pushing location ${finalLocation.slot} with mockupImage:`, finalLocation.mockupImage || 'NULL');
      processed.printLocations.push(finalLocation);
    }
  }

  // Process elements field (legacy format) - convert any data URLs to ImageKit URLs
  if (customization.elements && typeof customization.elements === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedElements: any = {};
    
    for (const [colorKey, colorElements] of Object.entries(customization.elements)) {
      if (colorElements && typeof colorElements === 'object') {
        processedElements[colorKey] = {};
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const [slotKey, slotElements] of Object.entries(colorElements as Record<string, any[]>)) {
          if (Array.isArray(slotElements)) {
            processedElements[colorKey][slotKey] = await Promise.all(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              slotElements.map(async (element: any) => {
                const processedElement = { ...element };
                
                // Convert imageData data URLs to ImageKit URLs
                if (element.imageData && element.imageData.startsWith('data:')) {
                  processedElement.imageData = await uploadDataUrlToImageKit(
                    element.imageData,
                    `order-${orderId}-item-${itemIndex}-elements-${colorKey}-${slotKey}-${element.id || Date.now()}.png`
                  );
                }
                
                return processedElement;
              })
            );
          } else {
            processedElements[colorKey][slotKey] = slotElements;
          }
        }
      } else {
        processedElements[colorKey] = colorElements;
      }
    }
    
    processed.elements = processedElements;
  }

  return processed;
}

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

      // For initial order creation, set customization to null
      // We'll process and add it after order creation
      processedItems.push({
        ...item,
        customization: null, // Will be processed and added after order creation
      });
    }

    // Update salesCount for all products
    for (const [productId, quantity] of Object.entries(productUpdates)) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { salesCount: quantity },
      });
    }

    // Create order first to get order ID
    const order = await Order.create({
      user: userId,
      items: processedItems,
      totalAmount: orderData.totalAmount,
      shippingInfo: orderData.shippingInfo,
      payment: orderData.payment,
    });

    // Now process customizations and upload images
    // Get original customization from orderData.items (since processedItems has customization: null)
    const finalItems = [];
    for (let i = 0; i < processedItems.length; i++) {
      const item = processedItems[i];
      const originalItem = orderData.items[i]; // Get original item with customization

      if (originalItem && originalItem.customization) {
        try {
          // Get product again for mockup generation
          const product = await Product.findById(item.product);
          if (product) {
            const processedCustomization = await processCustomization(
              originalItem.customization, // Use original customization data
              order._id.toString(),
              i,
              product,
              item.color || null
            );
            finalItems.push({
              ...item,
              customization: processedCustomization, // Add processed customization
            });
          } else {
            // Product not found, skip customization processing
            finalItems.push(item);
          }
        } catch (error) {
          console.error(`Error processing customization for item ${i}:`, error);
          // Continue with unprocessed customization if upload fails
          finalItems.push(item);
        }
      } else {
        finalItems.push(item);
      }
    }

    // Update order with processed customizations
    // Log finalItems to verify mockupImage is present before save
    console.log('\n=== FINAL ITEMS BEFORE SAVE ===');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalItems.forEach((item: any, idx: number) => {
      if (item.customization?.printLocations) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        item.customization.printLocations.forEach((loc: any, locIdx: number) => {
          console.log(`Item ${idx}, Location ${locIdx} (${loc.slot}):`, {
            slot: loc.slot,
            hasUploadedImage: !!loc.uploadedImage,
            hasMockupImage: !!loc.mockupImage,
            mockupImage: loc.mockupImage || 'NULL',
            elementsCount: loc.elements?.length || 0
          });
        });
      }
    });
    
    // Use findByIdAndUpdate with $set to ensure all nested fields are saved
    // This is more reliable for deeply nested structures
    const updateResult = await Order.findByIdAndUpdate(
      order._id,
      { 
        $set: { 
          items: finalItems 
        } 
      },
      { 
        new: true, 
        runValidators: true,
        overwrite: false // Don't overwrite, just update
      }
    );
    
    if (!updateResult) {
      throw new Error('Failed to update order with customizations');
    }
    
    // Verify after save
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verifyOrder = await Order.findById(order._id).lean() as any;
    console.log('\n=== ORDER AFTER SAVE (VERIFICATION) ===');
    if (verifyOrder?.items?.[0]?.customization?.printLocations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      verifyOrder.items[0].customization.printLocations.forEach((loc: any, locIdx: number) => {
        console.log(`Location ${locIdx} (${loc.slot}):`, {
          slot: loc.slot,
          hasUploadedImage: !!loc.uploadedImage,
          hasMockupImage: !!loc.mockupImage,
          mockupImage: loc.mockupImage || 'NULL',
          elementsCount: loc.elements?.length || 0
        });
      });
    }

    // Reload the order to ensure we return the properly saved version
    const savedOrder = await Order.findById(order._id)
      .populate('user', 'name email')
      .populate('items.product');

    return NextResponse.json(savedOrder, { status: 201 });
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