import { type Href, router } from 'expo-router';

/**
 * Go back one screen, or to `fallback` when there is nothing to go back to.
 * On the web that happens after a page refresh or when a screen was opened from a link;
 * a plain router.back() would then silently do nothing.
 */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
