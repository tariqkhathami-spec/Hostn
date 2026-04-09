import { useEffect } from 'react';

const BASE_TITLE = 'Hostn';

/**
 * Sets the browser tab title for client-side pages.
 * Usage: usePageTitle('Dashboard') → "Dashboard | Hostn"
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
  }, [title]);
}
