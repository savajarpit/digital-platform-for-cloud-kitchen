export interface WelcomeTemplateData {
  firstName: string;
}

export function welcomeTemplate(data: WelcomeTemplateData): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Welcome aboard!',
    html: `<p>Hi ${data.firstName},</p><p>Your account has been created successfully.</p>`,
  };
}
