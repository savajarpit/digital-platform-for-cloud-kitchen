import { getRequestConfig } from "next-intl/server";

// English only for now — every string in the app is already keyed through
// this catalog so adding a locale later is additive, not a rewrite.
const DEFAULT_LOCALE = "en";

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
