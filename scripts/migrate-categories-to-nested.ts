// Migration script to convert parent-child category structure to nested subcategories
// Run with: npx tsx scripts/migrate-categories-to-nested.ts

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST before any other imports
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.NEXT_PUBLIC_MONGO_URI;

if (!MONGODB_URI) {
  console.error('Error: NEXT_PUBLIC_MONGO_URI environment variable is not set');
  process.exit(1);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function migrateCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }
    const categoriesCollection = db.collection('categories');

    // Get all main categories (parent: null)
    const mainCategories = await categoriesCollection.find({ parent: null }).toArray();
    console.log(`Found ${mainCategories.length} main categories`);

    // Get all subcategories (parent: { $ne: null })
    const subcategories = await categoriesCollection.find({ parent: { $ne: null } }).toArray();
    console.log(`Found ${subcategories.length} subcategories`);

    // Group subcategories by parent
    const subcategoriesByParent: Record<string, any[]> = {};
    subcategories.forEach((sub: any) => {
      const parentId = sub.parent.toString();
      if (!subcategoriesByParent[parentId]) {
        subcategoriesByParent[parentId] = [];
      }
      subcategoriesByParent[parentId].push(sub);
    });

    let migratedCount = 0;
    let deletedCount = 0;

    // Process each main category
    for (const mainCategory of mainCategories) {
      const parentId = mainCategory._id.toString();
      const subs = subcategoriesByParent[parentId] || [];

      if (subs.length > 0) {
        // Convert subcategories to nested format
        const nestedSubs = subs.map((sub: any) => ({
          name: sub.name || "",
          slug: sub.slug || generateSlug(sub.name || ""),
        }));

        await categoriesCollection.updateOne(
          { _id: mainCategory._id },
          {
            $set: {
              subcategories: nestedSubs,
            },
            $unset: {
              parent: "",
            },
          }
        );

        const subIds = subs.map((sub: any) => sub._id);
        await categoriesCollection.deleteMany({ _id: { $in: subIds } });
        deletedCount += subIds.length;

        migratedCount++;
        console.log(`✓ Migrated "${mainCategory.name}" with ${subs.length} subcategories`);
      } else {
        await categoriesCollection.updateOne(
          { _id: mainCategory._id },
          {
            $set: {
              subcategories: [],
            },
            $unset: {
              parent: "",
            },
          }
        );
        console.log(`✓ Updated "${mainCategory.name}" (no subcategories)`);
      }
    }

    const orphanedSubs = subcategories.filter((sub: any) => {
      const parentId = sub.parent.toString();
      return !mainCategories.find((main: any) => main._id.toString() === parentId);
    });

    if (orphanedSubs.length > 0) {
      console.log(`\n⚠ Warning: Found ${orphanedSubs.length} orphaned subcategories (parent doesn't exist)`);
      console.log('Orphaned subcategories:', orphanedSubs.map((s: any) => s.name).join(', '));
      const orphanedIds = orphanedSubs.map((sub: any) => sub._id);
      await categoriesCollection.deleteMany({ _id: { $in: orphanedIds } });
      deletedCount += orphanedIds.length;
      console.log(`Deleted ${orphanedIds.length} orphaned subcategories`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Migrated ${migratedCount} main categories`);
    console.log(`   - Deleted ${deletedCount} old subcategory documents`);
    console.log(`   - Updated ${mainCategories.length} categories total`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error migrating categories:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

migrateCategories();

