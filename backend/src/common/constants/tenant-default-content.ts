/**
 * Starter copy for a brand-new tenant's home page hero/CTA and Plans page
 * (Why subscribe / FAQ / contact CTA), so a freshly provisioned storefront
 * never looks blank. Every field here is editable/deletable by the tenant
 * afterward from the admin UI — same "real placeholder row, not a hidden
 * fallback" precedent as the placeholder legal pages already seeded in
 * PlatformRepository.createTenantWithOwner. Shared between that repository
 * and the dev bootstrap seed script so the copy only lives in one place.
 */

export function defaultHomePageContent() {
  return {
    heroTagline: 'Fresh & healthy',
    heroSubtitle: 'Fresh, healthy meals delivered to your door.',
    reviewsSectionTitle: 'What our customers say',
    reviewsSectionDescription: "Don't just take our word for it",
    ctaEnabled: true,
    ctaTitle: 'Start eating better today',
    ctaDescription:
      'Get your first delivery free when you subscribe to any plan today. No commitment, cancel anytime.',
    ctaPrimaryLabel: 'Choose Your Plan',
    ctaPrimaryLink: '/plans',
    ctaSecondaryLabel: 'Order a Single Meal',
    ctaSecondaryLink: '/menu',
  };
}

export function defaultSubscriptionSettings() {
  return {
    homepageTitle: 'Meal Plans',
    homepageDescription:
      'Pick a plan that fits your lifestyle — skip, pause, or cancel anytime',
    plansPageTitle: 'Choose Your Plan',
    plansPageSubtitle:
      'Flexible subscription plans that adapt to your routine. Skip, pause, or cancel — no lock-in, ever.',
    whySubscribeEnabled: true,
    faqEnabled: true,
    contactCtaEnabled: true,
    contactCtaTitle: 'Still have questions?',
    contactCtaDescription: 'Our team is happy to help you find the right plan.',
  };
}

export function defaultPlanFeatures() {
  return [
    {
      icon: '💰',
      title: 'Save up to 30%',
      description: 'Subscribe and save compared to ordering individually.',
      sortOrder: 0,
    },
    {
      icon: '🚚',
      title: 'Free priority delivery',
      description: 'Every subscription order gets free, priority delivery.',
      sortOrder: 1,
    },
    {
      icon: '🥗',
      title: 'Weekly menu control',
      description: 'Skip, pause, or customize your meals each week.',
      sortOrder: 2,
    },
  ];
}

export function defaultPlanFaqs() {
  return [
    {
      question: 'Can I skip or pause my subscription?',
      answer:
        'Yes — you can skip any single day or pause for a date range anytime from your account, with no penalty.',
      sortOrder: 0,
    },
    {
      question: 'What if I want to cancel?',
      answer: "You can cancel anytime from your account. There's no lock-in period.",
      sortOrder: 1,
    },
    {
      question: 'How does delivery work?',
      answer:
        'We deliver fresh meals directly to your address during your chosen time window, every day your plan is active.',
      sortOrder: 2,
    },
    {
      question: 'Can I change my delivery address?',
      answer:
        'Yes, you can update your delivery address for any upcoming, not-yet-prepared day from your account.',
      sortOrder: 3,
    },
    {
      question: 'Is there a minimum commitment?',
      answer:
        'No — choose any plan duration that works for you, and cancel or switch whenever you like.',
      sortOrder: 4,
    },
  ];
}
