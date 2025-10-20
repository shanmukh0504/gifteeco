import { NextRequest, NextResponse } from 'next/server';
import ImageKit from 'imagekit';

const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY || '',
    privateKey: process.env.PRIVATE_KEY || '',
    urlEndpoint: process.env.NEXT_PUBLIC_URL_ENDPOINT || '',
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convert file to base64
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64File = buffer.toString('base64');

        // Upload to ImageKit
        const uploadResponse = await imagekit.upload({
            file: base64File,
            fileName: file.name,
            folder: '/products',
        });

        return NextResponse.json({ url: uploadResponse.url });
    } catch (error) {
        console.error('Upload failed:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}

