import type { SocialPlatform } from "@/lib/api/social-links";

// lucide-react v1 dropped all brand/logo icons, so these platform glyphs are
// small hand-drawn SVGs (fill=currentColor, 24x24 viewBox) instead of a new
// icon-package dependency.
const PATHS: Record<SocialPlatform, React.ReactNode> = {
  INSTAGRAM: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
    </>
  ),
  FACEBOOK: (
    <path d="M13.5 21v-7.5H16l.4-3H13.5V8.5c0-.9.3-1.5 1.5-1.5h1.5V4.3C16.2 4.1 15.2 4 14 4c-2.4 0-4 1.5-4 4.2v2.3H7.5v3H10V21h3.5z" />
  ),
  YOUTUBE: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5z" />
    </>
  ),
  LINKEDIN: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="7.5" cy="8" r="1.4" />
      <path d="M6.3 10.8h2.4V18H6.3z" />
      <path d="M11 10.8h2.3v1c.5-.8 1.3-1.2 2.4-1.2 2 0 2.8 1.3 2.8 3.5V18h-2.4v-3.5c0-1-.4-1.7-1.3-1.7-.9 0-1.5.6-1.5 1.7V18H11z" />
    </>
  ),
  TWITTER: <path d="M4 4l7.5 8.6L4.3 20h1.8l6.3-6.7L17.6 20H20l-7.9-9.1L19.6 4h-1.8l-5.9 6.3L8.4 4H4z" />,
  WHATSAPP: (
    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 2a8 8 0 016.9 12.1l-.3.5.6 2.4-2.4-.6-.5.3A8 8 0 1112 4zm-2.5 4c-.2 0-.4 0-.6.1s-.9.6-.9 1.5.9 1.9 1.1 2c.1.2 1.7 2.7 4.2 3.7 2 .8 2.4.7 2.9.6.4 0 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.5-.3l-1.5-.7c-.2-.1-.4-.1-.6.1l-.6.6c-.2.2-.3.2-.5.1-1-.4-2.1-1.5-2.5-2.2-.1-.2-.1-.3 0-.5l.5-.6c.1-.2.2-.4.1-.6L10 8.5c-.2-.5-.4-.5-.6-.5H9z" />
  ),
  PINTEREST: (
    <path d="M12 2a10 10 0 00-3.6 19.3c0-.8 0-1.8.2-2.6l1.3-5.6s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.7-.3 1.1.5 2 1.6 2 1.9 0 3.2-2.4 3.2-5.3 0-2.2-1.5-3.8-4.2-3.8-3.1 0-5 2.3-5 4.9 0 .9.3 1.5.7 2 .2.2.2.3.1.5l-.2.9c-.1.3-.3.4-.6.2-1.2-.5-1.8-1.9-1.8-3.4 0-2.6 2.2-5.7 6.5-5.7 3.5 0 5.8 2.5 5.8 5.2 0 3.6-2 6.3-5 6.3-1 0-1.9-.5-2.3-1.1l-.6 2.5c-.2 1-.7 2-1.1 2.7A10 10 0 1012 2z" />
  ),
};

export function SocialIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {PATHS[platform]}
    </svg>
  );
}
