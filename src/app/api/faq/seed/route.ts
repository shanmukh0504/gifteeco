import { NextResponse } from 'next/server';
import FAQ from '@/models/FAQ';
import connectDB from '@/lib/db';
import { auth } from '@/lib/auth';

const mockFAQs = [
    {
        question: "What types of products do you offer?",
        answer: "We offer a wide range of premium corporate gifting products including custom branded items, welcome kits, onboarding packages, and curated gift sets. Our products are designed to help companies celebrate teams, clients, and special moments.",
        order: 0,
    },
    {
        question: "How can I customize products with my company branding?",
        answer: "You can add your logo, company colors, and custom messaging to most of our products. Simply select a product, choose the customization options, and upload your branding assets. Our team will work with you to ensure your branding is perfectly applied.",
        order: 1,
    },
    {
        question: "What is your delivery timeline?",
        answer: "We offer fast and reliable pan-India delivery. Standard delivery typically takes 5-7 business days, while express delivery options are available for urgent orders. Delivery times may vary based on customization requirements and location.",
        order: 2,
    },
    {
        question: "Do you offer eco-friendly gifting options?",
        answer: "Yes, we have a range of sustainable and eco-friendly gifting options that reflect your brand's values and environmental responsibility. These products are made from sustainable materials and follow eco-friendly manufacturing processes.",
        order: 3,
    },
    {
        question: "What is your minimum order quantity?",
        answer: "Minimum order quantities vary by product type. For custom branded items, we typically require a minimum order of 10-25 units depending on the product. For standard products, there is no minimum order requirement. Contact our sales team for specific details.",
        order: 4,
    },
    {
        question: "Can I track my order?",
        answer: "Yes, once your order is shipped, you will receive a tracking number via email. You can use this tracking number to monitor your order's progress through our delivery partners.",
        order: 5,
    },
    {
        question: "What payment methods do you accept?",
        answer: "We accept various payment methods including credit/debit cards, net banking, UPI, and cash on delivery (COD) for eligible orders. Corporate clients can also arrange for invoice-based payments with payment terms.",
        order: 6,
    },
    {
        question: "Do you offer bulk discounts?",
        answer: "Yes, we offer competitive pricing for bulk orders. Discounts are typically available for orders above certain quantities. Please contact our sales team with your requirements, and we'll provide you with a customized quote.",
        order: 7,
    },
];

export async function POST(req: Request) {
    try {
        const user = await auth(req);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Check if FAQs already exist
        const existingFAQs = await FAQ.countDocuments();
        if (existingFAQs > 0) {
            return NextResponse.json({
                message: 'FAQs already exist. Use the admin panel to manage them.',
                count: existingFAQs
            });
        }

        // Insert mock FAQs
        const createdFAQs = await FAQ.insertMany(mockFAQs);

        return NextResponse.json({
            message: 'Mock FAQs seeded successfully',
            count: createdFAQs.length
        }, { status: 201 });
    } catch (error) {
        console.error('Error seeding FAQs:', error);
        return NextResponse.json({
            error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

