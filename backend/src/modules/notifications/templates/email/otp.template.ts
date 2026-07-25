export interface OtpTemplateData {
  name: string;
  otp: string;
}

export function otpEmailTemplate(data: OtpTemplateData): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Your verification code',
    html: `<p>Hi ${data.name},</p><p>Your verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${data.otp}</p><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  };
}
