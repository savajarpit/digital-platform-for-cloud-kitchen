export const THEME_STORAGE_KEY = "theme";

/**
 * Runs synchronously in <head>, before first paint, so there is never a
 * flash of the wrong theme. Always resolves to an explicit `dark` or
 * `light` class (never leaves neither) — see globals.css's
 * `:root:not(.light)` media-query guard for why that matters: without an
 * explicit `.light` marker, an OS-dark-mode user who chose light would
 * still get dark colors from the no-JS media-query fallback.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
  } catch (e) {}
})();
`;
