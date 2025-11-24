// Script to seed categories from CATEGORY_HIERARCHY and update products
// Run with: npx tsx scripts/seed-categories.ts

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST before any other imports
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI: string = process.env.NEXT_PUBLIC_MONGO_URI!;

if (!MONGODB_URI) {
  console.error('Error: NEXT_PUBLIC_MONGO_URI environment variable is not set');
  process.exit(1);
}

const CATEGORY_HIERARCHY = {
  apparel: {
    name: "Apparel",
    subcategories: ["Tshirt", "Hoodie", "Jacket"],
  },
  drinkware: {
    name: "Drinkware",
    subcategories: ["Mug", "Bottle", "Sipper"],
  },
  stationery: {
    name: "Stationery",
    subcategories: ["Diary", "Calendar", "Notepad", "Pen"],
  },
  accessories: {
    name: "Accessories",
    subcategories: ["Keychain", "Tote bag"],
  },
  welcomeKits: {
    name: "Welcome Kits",
    subcategories: [],
  },
  combos: {
    name: "Combos",
    subcategories: [],
  },
  merchandise: {
    name: "Merchandise",
    subcategories: [],
  },
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function seedCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }
    const categoriesCollection = db.collection('categories');
    const productsCollection = db.collection('products');

    // Step 1: Delete all existing categories
    console.log('\n🗑️  Deleting all existing categories...');
    const deleteResult = await categoriesCollection.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} categories`);

    // Step 2: Create new categories from hierarchy
    console.log('\n📦 Creating categories from hierarchy...');
    const createdCategories: Record<string, any> = {};

    for (const [key, categoryData] of Object.entries(CATEGORY_HIERARCHY)) {
      const slug = generateSlug(categoryData.name);
      
      // Create subcategories array
      const subcategories = (categoryData.subcategories || []).map((subName: string) => ({
        name: subName,
        slug: generateSlug(subName),
      }));

      // Only create categories that have at least one subcategory
      if (subcategories.length > 0) {
        const category = await categoriesCollection.insertOne({
          name: categoryData.name,
          slug,
          subcategories,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        createdCategories[key] = {
          _id: category.insertedId,
          name: categoryData.name,
          subcategories: subcategories.map((sub, index) => ({
            _id: new mongoose.Types.ObjectId(), // Generate ID for subcategory
            name: sub.name,
            slug: sub.slug,
          })),
        };

        // Update subcategories with their IDs
        const insertedCategory = await categoriesCollection.findOne({ _id: category.insertedId });
        if (insertedCategory) {
          const updatedSubs = subcategories.map((sub: any) => ({
            _id: new mongoose.Types.ObjectId(),
            name: sub.name,
            slug: sub.slug,
          }));
          
          await categoriesCollection.updateOne(
            { _id: category.insertedId },
            { $set: { subcategories: updatedSubs } }
          );
          
          createdCategories[key].subcategories = updatedSubs;
        }

        console.log(`   ✓ Created "${categoryData.name}" with ${subcategories.length} subcategories`);
      }
    }

    // Step 3: Get all categories from DB with their subcategories (with proper IDs)
    console.log('\n📋 Fetching created categories with subcategory IDs...');
    const allCreatedCategories = await categoriesCollection.find({}).toArray();
    const categoryMap: Record<string, any> = {};
    
    for (const cat of allCreatedCategories) {
      categoryMap[cat._id.toString()] = cat;
      // Also map by name for matching
      categoryMap[cat.name.toLowerCase()] = cat;
    }

    // Step 4: Update products to reference both category and subcategory
    console.log('\n🔄 Updating products with category and subcategory references...');
    
    const allProducts = await productsCollection.find({}).toArray();
    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of allProducts) {
      let matchedCategory: any = null;
      let matchedSubcategory: any = null;

      // Try to match by category ID first
      if (product.category) {
        const categoryId = product.category.toString ? product.category.toString() : product.category;
        matchedCategory = categoryMap[categoryId];
      }

      // If not found by ID, try to match by category name (from populated category)
      if (!matchedCategory && product.category && typeof product.category === 'object' && product.category.name) {
        const categoryName = product.category.name.toLowerCase();
        matchedCategory = categoryMap[categoryName];
      }

      // If still not found, try to match by product name keywords
      if (!matchedCategory && product.name) {
        const productName = product.name.toLowerCase();
        for (const [key, catData] of Object.entries(createdCategories)) {
          const catName = catData.name.toLowerCase();
          // Check if product name contains category keywords
          if (productName.includes('tshirt') || productName.includes('t-shirt') || productName.includes('shirt')) {
            if (catData.name === 'Apparel') {
              matchedCategory = categoryMap[catData._id.toString()];
              // Try to match Tshirt subcategory
              matchedSubcategory = catData.subcategories.find((sub: any) => 
                sub.name.toLowerCase().includes('tshirt') || sub.name.toLowerCase().includes('shirt')
              );
              break;
            }
          } else if (productName.includes('hoodie')) {
            if (catData.name === 'Apparel') {
              matchedCategory = categoryMap[catData._id.toString()];
              matchedSubcategory = catData.subcategories.find((sub: any) => 
                sub.name.toLowerCase().includes('hoodie')
              );
              break;
            }
          } else if (productName.includes('jacket')) {
            if (catData.name === 'Apparel') {
              matchedCategory = categoryMap[catData._id.toString()];
              matchedSubcategory = catData.subcategories.find((sub: any) => 
                sub.name.toLowerCase().includes('jacket')
              );
              break;
            }
          } else if (productName.includes('mug')) {
            if (catData.name === 'Drinkware') {
              matchedCategory = categoryMap[catData._id.toString()];
              matchedSubcategory = catData.subcategories.find((sub: any) => 
                sub.name.toLowerCase().includes('mug')
              );
              break;
            }
          } else if (productName.includes('bottle')) {
            if (catData.name === 'Drinkware') {
              matchedCategory = categoryMap[catData._id.toString()];
              matchedSubcategory = catData.subcategories.find((sub: any) => 
                sub.name.toLowerCase().includes('bottle')
              );
              break;
            }
          } else if (productName.includes('diary') || productName.includes('diaries')) {
            if (catData.name === 'Stationery') {
              matchedCategory = categoryMap[catData._id.toString()];
              matchedSubcategory = catData.subcategories.find((sub: any) => 
                sub.name.toLowerCase().includes('diary')
              );
              break;
            }
          } else if (productName.includes('calendar')) {
            if (catData.name === 'Stationery') {
              matchedCategory = categoryMap[catData._id.toString()];
              matchedSubcategory = catData.subcategories.find((sub: any) => 
                sub.name.toLowerCase().includes('calendar')
              );
              break;
            }
          } else if (productName.includes('combo') || productName.includes('kit') || productName.includes('set') || productName.includes('bundle')) {
            // These are likely combos - we'll assign to a category but may not have specific subcategory
            // Try to find best match based on items in the combo
            if (productName.includes('welcome')) {
              // Could be welcome kit - but we don't have that category with subcategories
              // Skip for now or assign to closest match
            }
          }
        }
      }

      // If we found a category, try to match subcategory from product.subCategory field
      if (matchedCategory && !matchedSubcategory && product.subCategory) {
        const subName = product.subCategory.toString().toLowerCase().trim();
        const categoryDoc = categoryMap[matchedCategory._id.toString()];
        if (categoryDoc && categoryDoc.subcategories) {
          matchedSubcategory = categoryDoc.subcategories.find(
            (sub: any) => 
              sub.name.toLowerCase() === subName || 
              sub.slug.toLowerCase() === subName ||
              sub.name.toLowerCase().includes(subName) ||
              subName.includes(sub.name.toLowerCase())
          );
        }
      }

      if (matchedCategory) {
        const updateData: any = {
          category: matchedCategory._id,
        };

        if (matchedSubcategory) {
          updateData.subCategory = matchedSubcategory._id;
        } else {
          // Clear subCategory if we can't match
          updateData.subCategory = null;
        }

        await productsCollection.updateOne(
          { _id: product._id },
          { $set: updateData }
        );
        updatedCount++;
        console.log(`   ✓ Updated product "${product.name}" - Category: ${matchedCategory.name}${matchedSubcategory ? `, Subcategory: ${matchedSubcategory.name}` : ' (no subcategory match)'}`);
      } else {
        skippedCount++;
        console.log(`   ⚠ Product "${product.name}" - Could not match category, keeping existing`);
      }
    }

    console.log(`\n   Updated: ${updatedCount}, Skipped: ${skippedCount}`);

    console.log(`\n✅ Seeding complete!`);
    console.log(`   - Created ${Object.keys(createdCategories).length} categories`);
    console.log(`   - Updated ${updatedCount} products`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

seedCategories();

