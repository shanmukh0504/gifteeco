import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    size: {
      type: String,
      required: true
    },
    color: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      required: true
    },
    customization: {
      printLocations: [{
        slot: {
          type: String,
          enum: ['front', 'back', 'chest'],
        },
        uploadedImage: {
          type: String,
          default: null,
        }, // ImageKit URL - uploaded image by customer
        mockupImage: {
          type: String,
          default: null,
        }, // ImageKit URL - Mockup image for this specific slot
        elements: [{
          type: {
            type: String,
            enum: ['text', 'logo', 'qrcode', 'shape', 'fill'],
            required: true,
          },
          // Text element fields
          textValue: {
            type: String,
            default: null,
          },
          fontFamily: {
            type: String,
            default: null,
          },
          fontSize: {
            type: Number,
            default: null,
          },
          textColor: {
            type: String,
            default: null,
          },
          // QR code element fields
          qrValue: {
            type: String,
            default: null,
          }, // QR code content/text
          // Shape element fields
          shapeType: {
            type: String,
            enum: ['circle', 'square', 'triangle'],
            default: null,
          },
          shapeColor: {
            type: String,
            default: null,
          },
          // Logo element fields
          imageData: {
            type: String,
            default: null,
          }, // ImageKit URL for uploaded logos
          // Position and size fields
          x: {
            type: Number,
            default: null,
          },
          y: {
            type: Number,
            default: null,
          },
          width: {
            type: Number,
            default: null,
          },
          height: {
            type: Number,
            default: null,
          },
          rotation: {
            type: Number,
            default: null,
          },
          zIndex: {
            type: Number,
            default: null,
          },
        }]
      }],
      printSize: {
        type: String,
        default: null,
      },
      mockupImage: {
        type: String,
        default: null,
      }, // ImageKit URL - Final mockup image with all customizations applied
      elements: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      }, // Full elements structure (legacy format)
    }
  }],
  shippingInfo: {
    firstName: String,
    lastName: String,
    address: String,
    city: String,
    postalCode: String
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  payment: {
    method: {
      type: String,
      enum: ['razorpay', 'cod'],
      default: 'razorpay'
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export default Order;