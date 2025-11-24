// One-time script to remove searchKeywords field from all products in the database
// Run with: npx tsx scripts/remove-searchKeywords.ts

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST before any other imports
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI: string = process.env.NEXT_PUBLIC_MONGO_URI!;

if (!MONGODB_URI) {
  console.error('Error: NEXT_PUBLIC_MONGO_URI environment variable is not set');
  console.error('Please make sure your .env.local or .env file contains NEXT_PUBLIC_MONGO_URI');
  process.exit(1);
}

async function removeSearchKeywords() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Import Product model after connection
    const Product = (await import('../src/models/Product')).default;

    console.log('Removing searchKeywords field from all products...');
    const result = await Product.updateMany(
      {},
      { $unset: { searchKeywords: "" } }
    );

    console.log(`✅ Successfully removed searchKeywords from ${result.modifiedCount} products`);
    console.log(`   Total products checked: ${result.matchedCount}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error removing searchKeywords:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

removeSearchKeywords();

