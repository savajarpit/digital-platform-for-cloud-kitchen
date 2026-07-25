export interface ResetPasswordTemplateData {
  resetUrl: string;
}

export function resetPasswordTemplate(data: ResetPasswordTemplateData): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Reset your password',
    html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${data.resetUrl}">${data.resetUrl}</a></p>`,
  };
}
