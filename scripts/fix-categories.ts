/**
 * Database Migration Script
 * This script:
 * 1. Creates "Combos" and "Welcome Kits" categories if they don't exist
 * 2. Updates products to belong to the correct categories
 * 3. Adds searchable tags for items inside Welcome Kits
 */

import mongoose from "mongoose";
import connectDB from "../src/lib/db";
import Product from "../src/models/Product";
import Category from "../src/models/Category";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function fixCategories() {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Connected successfully!");

    // Step 1: Get or create "Combos" category
    let combosCategory = await Category.findOne({ slug: "combos" });
    if (!combosCategory) {
      console.log("Creating 'Combos' category...");
      combosCategory = await Category.create({
        name: "Combos",
        slug: "combos",
        subcategories: [
          { name: "Gift Sets", slug: "gift-sets" },
          { name: "Product Bundles", slug: "product-bundles" },
        ],
      });
      console.log("✓ Created 'Combos' category");
    } else {
      console.log("✓ 'Combos' category already exists");
    }

    // Step 2: Get or create "Welcome Kits" category
    let welcomeKitsCategory = await Category.findOne({ slug: "welcome-kits" });
    if (!welcomeKitsCategory) {
      console.log("Creating 'Welcome Kits' category...");
      welcomeKitsCategory = await Category.create({
        name: "Welcome Kits",
        slug: "welcome-kits",
        subcategories: [
          { name: "Executive Welcome Kits", slug: "executive-welcome-kits" },
          { name: "Employee Welcome Kits", slug: "employee-welcome-kits" },
          { name: "New Hire Kits", slug: "new-hire-kits" },
        ],
      });
      console.log("✓ Created 'Welcome Kits' category");
    } else {
      console.log("✓ 'Welcome Kits' category already exists");
    }

    // Step 3: Update products based on their names and types
    const allProducts = await Product.find({}).lean();
    console.log(`\nFound ${allProducts.length} products to process...`);

    let updatedCount = 0;
    let tagsUpdatedCount = 0;

    for (const product of allProducts) {
      let shouldUpdate = false;
      const updateData: any = {};

      // Determine category based on product name and type
      const productName = product.name?.toLowerCase() || "";
      const isWelcomeKit = productName.includes("welcome kit");
      const isCombo = product.type === "combo" || productName.includes("set") || productName.includes("kit") || productName.includes("combo");

      if (isWelcomeKit) {
        // Assign to Welcome Kits category
        const currentCategoryId = typeof product.category === "object" && product.category !== null 
          ? (product.category as any)._id?.toString() 
          : product.category?.toString();

        const welcomeKitsCategoryId = (welcomeKitsCategory._id as { toString(): string }).toString();
        if (currentCategoryId !== welcomeKitsCategoryId) {
          updateData.category = welcomeKitsCategory._id as mongoose.Types.ObjectId;
          
          // Assign to "Executive Welcome Kits" subcategory if it contains "executive"
          if (productName.includes("executive")) {
            const execSubcategory = welcomeKitsCategory.subcategories.find(
              (sub) => sub.slug === "executive-welcome-kits"
            );
            if (execSubcategory) {
              updateData.subCategory = execSubcategory._id as mongoose.Types.ObjectId;
            }
          }
          
          shouldUpdate = true;
          console.log(`  → Updating "${product.name}" to Welcome Kits category`);
        }
      } else if (isCombo && !isWelcomeKit) {
        // Assign combo products to Combos category
        const currentCategoryId = typeof product.category === "object" && product.category !== null 
          ? (product.category as any)._id?.toString() 
          : product.category?.toString();

        const combosCategoryId = (combosCategory._id as { toString(): string }).toString();
        if (currentCategoryId !== combosCategoryId) {
          updateData.category = combosCategory._id as mongoose.Types.ObjectId;
          
          // Assign to "Gift Sets" subcategory
          const giftSetSubcategory = combosCategory.subcategories.find(
            (sub) => (sub.slug || "") === "gift-sets"
          );
          if (giftSetSubcategory) {
            updateData.subCategory = giftSetSubcategory._id as mongoose.Types.ObjectId;
          }
          
          shouldUpdate = true;
          console.log(`  → Updating "${product.name}" to Combos category`);
        }
      }

      // Step 4: For Welcome Kits, add tags from comboItems for searchability
      if (isWelcomeKit && product.comboItems && Array.isArray(product.comboItems) && product.comboItems.length > 0) {
        const comboItemIds = product.comboItems
          .map((item: any) => 
            typeof item.productId === "object" && item.productId !== null
              ? (item.productId as any)._id?.toString()
              : item.productId?.toString()
          )
          .filter(Boolean);

        if (comboItemIds.length > 0) {
          const comboProducts = await Product.find({
            _id: { $in: comboItemIds }
          }).select("name tags");

          const newTags: string[] = [...(product.tags || [])];
          
          for (const comboProduct of comboProducts) {
            const productName = comboProduct.name;
            // Add the product name as a tag if not already present
            if (productName && !newTags.some(tag => tag.toLowerCase() === productName.toLowerCase())) {
              newTags.push(productName);
            }
            // Add existing tags from the combo product
            if (comboProduct.tags && Array.isArray(comboProduct.tags)) {
              for (const tag of comboProduct.tags) {
                if (!newTags.some(existingTag => existingTag.toLowerCase() === tag.toLowerCase())) {
                  newTags.push(tag);
                }
              }
            }
          }

          // Only update if tags changed
          const currentTags = product.tags || [];
          const tagsChanged = JSON.stringify(currentTags.sort()) !== JSON.stringify(newTags.sort());
          
          if (tagsChanged) {
            updateData.tags = newTags;
            tagsUpdatedCount++;
            console.log(`  → Added searchable tags to "${product.name}" from combo items`);
          }
        }
      }

      // Update product if needed
      if (shouldUpdate || updateData.tags) {
        await Product.updateOne(
          { _id: product._id },
          { $set: updateData }
        );
        updatedCount++;
      }
    }

    console.log(`\n✓ Migration complete!`);
    console.log(`  - Updated ${updatedCount} products`);
    console.log(`  - Enhanced tags for ${tagsUpdatedCount} Welcome Kits`);

    // Step 5: Ensure all combo products have type="combo"
    const comboProducts = await Product.find({
      $or: [
        { name: { $regex: /(set|kit|combo|bundle)/i } },
        { category: combosCategory._id as mongoose.Types.ObjectId },
        { category: welcomeKitsCategory._id as mongoose.Types.ObjectId }
      ]
    });

    let typeFixedCount = 0;
    for (const product of comboProducts) {
      if (product.type !== "combo") {
        await Product.updateOne(
          { _id: product._id },
          { $set: { type: "combo" } }
        );
        typeFixedCount++;
        console.log(`  → Fixed type for "${product.name}" to "combo"`);
      }
    }

    if (typeFixedCount > 0) {
      console.log(`  - Fixed type field for ${typeFixedCount} products`);
    }

    console.log("\n✓ All done!");

  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

// Run the migration
fixCategories()
  .then(() => {
    console.log("\n✓ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Migration failed:", error);
    process.exit(1);
  });

