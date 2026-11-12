/**
 * Address of the host portal (business.<domain>) for links on the guest site.
 * Hosts sign up and manage listings there; the guest domain has no /host pages.
 */
export function hostPortalUrl(path = '/auth'): string {
  if (typeof window === 'undefined') return `https://business.hostn.co${path}`;
  const { protocol, host } = window.location;
  const bare = host.replace(/^www\./, '').replace(/^(business|admin)\./, '');
  return `${protocol}//business.${bare}${path}`;
}
