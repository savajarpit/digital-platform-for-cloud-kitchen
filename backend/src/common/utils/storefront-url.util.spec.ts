import { buildStorefrontOrigin } from './storefront-url.util';

describe('buildStorefrontOrigin', () => {
  const config = {
    platformRootDomain: 'okaysync.com',
    frontendUrl: 'http://localhost:3001/',
  };

  it('prefers the custom domain', () => {
    expect(
      buildStorefrontOrigin(
        { slug: 'demo', customDomain: 'order.kitchen.in' },
        config,
      ),
    ).toBe('https://order.kitchen.in');
  });

  it('falls back to the slug subdomain of the platform root domain', () => {
    expect(
      buildStorefrontOrigin({ slug: 'demo', customDomain: null }, config),
    ).toBe('https://demo.okaysync.com');
  });

  it('uses the frontend URL (trailing slash trimmed) when no root domain is set', () => {
    expect(
      buildStorefrontOrigin(
        { slug: 'demo', customDomain: null },
        { frontendUrl: 'http://localhost:3001/' },
      ),
    ).toBe('http://localhost:3001');
  });
});
