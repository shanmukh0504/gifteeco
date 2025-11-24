import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, phone, email, message } = await req.json();

    // Here you would integrate with an email service like SendGrid, Resend, or Nodemailer
    // For now, we'll just log it and return success
    console.log('Contact form submission:', { name, phone, email, message });

    // TODO: Implement email sending
    // Example with Resend or SendGrid:
    // await sendEmail({
    //   to: process.env.CONTACT_EMAIL,
    //   subject: `New Contact Form Submission from ${name}`,
    //   body: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nMessage: ${message}`
    // });

    return NextResponse.json({ message: 'Message sent successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: `Server error ${error}` }, { status: 500 });
  }
}

