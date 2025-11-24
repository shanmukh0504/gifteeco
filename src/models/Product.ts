import mongoose from "mongoose";

const boundingBoxSchema = new mongoose.Schema(
  {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 1 },
    height: { type: Number, default: 1 },
  },
  { _id: false }
);

const customizationSlotSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    mockupImage: { type: String },
    allowImage: { type: Boolean, default: true },
    allowText: { type: Boolean, default: true },
    allowFill: { type: Boolean, default: true },
  },
  { _id: false }
);

const slotGroupSchema = new mongoose.Schema(
  {
    front: customizationSlotSchema,
    back: customizationSlotSchema,
    chest: customizationSlotSchema,
  },
  { _id: false }
);

const colorDetailsSchema = new mongoose.Schema(
  {
    images: [{ type: String, required: true }],
    stock: { type: Number, default: 0 },
    customization: slotGroupSchema,
  },
  { _id: false }
);

const noColorSchema = new mongoose.Schema(
  {
    images: [{ type: String, required: true }],
    stock: { type: Number, default: 0 },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const comboItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    tags: { type: [String], default: [] },
    type: {
      type: String,
      enum: ["single", "combo"],
      default: "single",
    },
    comboItems: [comboItemSchema],
    sizes: [{ type: String }],
    minQuantity: { type: Number, default: 1 },
    hasColorOptions: { type: Boolean, default: false },
    colors: {
      type: Map,
      of: colorDetailsSchema,
      default: {},
    },
    noColor: noColorSchema,
    customDefaults: {
      front: boundingBoxSchema,
      back: boundingBoxSchema,
      chest: boundingBoxSchema,
    },
    ratingsSummary: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    reviews: [reviewSchema],
    isFeatured: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 },
    addToCartCount: { type: Number, default: 0 },
    material: { type: String, trim: true },
    deliveryTimeInDays: { type: Number, default: null },
  },
  { timestamps: true }
);

productSchema.methods.recalculateRatings = function recalculateRatings() {
  if (!this.reviews?.length) {
    this.ratingsSummary = { average: 0, count: 0 };
    return;
  }
  const total = this.reviews.reduce((sum: number, review: { rating: number }) => sum + review.rating, 0);
  this.ratingsSummary = {
    average: Number((total / this.reviews.length).toFixed(1)),
    count: this.reviews.length,
  };
};

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;