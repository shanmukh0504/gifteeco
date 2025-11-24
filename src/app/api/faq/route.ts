import { NextResponse } from 'next/server';
import FAQ from '@/models/FAQ';
import connectDB from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    await connectDB();
    const faqs = await FAQ.find().sort({ order: 1 });
    return NextResponse.json(faqs);
  } catch (error) {
    return NextResponse.json({ error: `Server error ${error}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await auth(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const faqData = await req.json();
    await connectDB();
    
    const faq = await FAQ.create(faqData);
    return NextResponse.json(faq, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: `Server error ${error}` }, { status: 500 });
  }
}

