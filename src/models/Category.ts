import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
  },
  { _id: true }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    subcategories: {
      type: [subcategorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Ensure unique subcategory names within a category
categorySchema.index({ "subcategories.name": 1 }, { unique: false });

export interface Subcategory {
  _id?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
}

export interface CategoryDoc extends mongoose.Document {
  name: string;
  slug: string;
  subcategories: Subcategory[];
}

export type CategoryModel = mongoose.Model<CategoryDoc>;

const Category =
  (mongoose.models.Category as CategoryModel) ||
  (mongoose.model<CategoryDoc, CategoryModel>("Category", categorySchema) as CategoryModel);

export default Category;