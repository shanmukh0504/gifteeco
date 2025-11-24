import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Here you would integrate with an email service to send the catalogue PDF
    // For now, we'll just log it and return success
    console.log('Catalogue request:', { email });

    // TODO: Implement email sending with PDF attachment
    // Example:
    // await sendEmail({
    //   to: email,
    //   subject: 'Your Catalogue from Dappers Dress Code',
    //   attachments: [{ filename: 'catalogue.pdf', path: '/path/to/catalogue.pdf' }]
    // });

    return NextResponse.json({ message: 'Catalogue sent successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: `Server error ${error}` }, { status: 500 });
  }
}

