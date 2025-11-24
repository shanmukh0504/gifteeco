import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

if (process.env.NODE_ENV === 'production') {
  transporter.verify((error) => {
    if (error) {
      console.error('SMTP configuration error:', error);
    } else {
      console.log('SMTP server is ready to send emails');
    }
  });
}

export async function sendOTPEmail(email: string, otp: string, name?: string) {
  const mailOptions = {
    from: `GifteeCo <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify Your Email - GifteeCo',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #FF9AA2 0%, #FFB3BA 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">GifteeCo</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
            ${name ? `<p>Hi ${name},</p>` : '<p>Hello,</p>'}
            <p>Thank you for signing up with GifteeCo! Please use the following OTP (One-Time Password) to verify your email address:</p>
            <div style="background: #f5f5f5; border: 2px dashed #FF9AA2; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <h1 style="color: #CF6144; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
            <p style="margin-top: 30px;">Best regards,<br>The GifteeCo Team</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Verify Your Email - GifteeCo
      
      ${name ? `Hi ${name},` : 'Hello,'}
      
      Thank you for signing up with GifteeCo! Please use the following OTP to verify your email address:
      
      ${otp}
      
      This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.
      
      Best regards,
      The GifteeCo Team
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string, name?: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"GifteeCo" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your Password - GifteeCo',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #FF9AA2 0%, #FFB3BA 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">GifteeCo</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
            ${name ? `<p>Hi ${name},</p>` : '<p>Hello,</p>'}
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #CF6144; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 12px; word-break: break-all;">${resetUrl}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.</p>
            <p style="margin-top: 30px;">Best regards,<br>The GifteeCo Team</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Reset Your Password - GifteeCo
      
      ${name ? `Hi ${name},` : 'Hello,'}
      
      We received a request to reset your password. Click the link below to reset it:
      
      ${resetUrl}
      
      This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
      
      Best regards,
      The GifteeCo Team
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

